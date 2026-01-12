/**
 * Plan Enforcement and Quota Management
 * 
 * Server-side enforcement of plan limits and usage tracking.
 * Ensures users cannot exceed their subscription quotas.
 */

import { prisma } from '@/lib/db'
import { getPlanLimits, getUserQuotaRemaining } from './config'

export interface UserPlanStatus {
  subscriptionPlan: string
  hasInterviewAddon: boolean
  autoApplicationsUsed: number
  autoApplicationsLimit: number
  mockInterviewsUsed: number
  mockInterviewsLimit: number
  subscriptionPeriodStart: Date | null
  subscriptionPeriodEnd: Date | null
  trialEndsAt: Date | null
  isTrialActive: boolean
  hasActiveSubscription: boolean
}

export interface QuotaCheck {
  allowed: boolean
  remaining: number
  limit: number
  reason?: string
}

/**
 * Get complete user plan status and quotas
 */
export async function getUserPlanStatus(userId: string): Promise<UserPlanStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      hasInterviewAddon: true,
      autoApplicationsUsed: true,
      autoApplicationsLimit: true,
      mockInterviewsUsed: true,
      mockInterviewsLimit: true,
      subscriptionPeriodStart: true,
      subscriptionPeriodEnd: true,
      trialEndsAt: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
    },
  })

  if (!user) return null

  const now = new Date()
  const isTrialActive = user.trialEndsAt ? now < user.trialEndsAt : false
  const hasActiveSubscription = user.subscriptionStatus === 'active' || isTrialActive

  return {
    subscriptionPlan: user.subscriptionPlan || 'free_trial',
    hasInterviewAddon: user.hasInterviewAddon || false,
    autoApplicationsUsed: user.autoApplicationsUsed || 0,
    autoApplicationsLimit: user.autoApplicationsLimit || 0,
    mockInterviewsUsed: user.mockInterviewsUsed || 0,
    mockInterviewsLimit: user.mockInterviewsLimit || 0,
    subscriptionPeriodStart: user.subscriptionPeriodStart,
    subscriptionPeriodEnd: user.subscriptionPeriodEnd,
    trialEndsAt: user.trialEndsAt,
    isTrialActive,
    hasActiveSubscription,
  }
}

/**
 * Check if user can perform an auto application
 */
export async function checkAutoApplicationQuota(userId: string): Promise<QuotaCheck> {
  const status = await getUserPlanStatus(userId)
  if (!status) {
    return { allowed: false, remaining: 0, limit: 0, reason: 'User not found' }
  }

  if (!status.hasActiveSubscription) {
    return { allowed: false, remaining: 0, limit: 0, reason: 'No active subscription' }
  }

  const remaining = Math.max(0, status.autoApplicationsLimit - status.autoApplicationsUsed)
  
  return {
    allowed: remaining > 0,
    remaining,
    limit: status.autoApplicationsLimit,
    reason: remaining === 0 ? 'Monthly auto application limit exceeded' : undefined
  }
}

/**
 * Check if user can start a mock interview
 */
export async function checkMockInterviewQuota(userId: string): Promise<QuotaCheck> {
  const status = await getUserPlanStatus(userId)
  if (!status) {
    return { allowed: false, remaining: 0, limit: 0, reason: 'User not found' }
  }

  if (!status.hasActiveSubscription) {
    return { allowed: false, remaining: 0, limit: 0, reason: 'No active subscription' }
  }

  // Check if plan includes interview preparation
  const limits = getPlanLimits(status.subscriptionPlan, status.hasInterviewAddon)
  if (!limits.hasInterviewPreparation) {
    return { 
      allowed: false, 
      remaining: 0, 
      limit: 0, 
      reason: 'Interview preparation not included in your plan' 
    }
  }

  const remaining = Math.max(0, status.mockInterviewsLimit - status.mockInterviewsUsed)
  
  return {
    allowed: remaining > 0,
    remaining,
    limit: status.mockInterviewsLimit,
    reason: remaining === 0 ? 'Monthly mock interview limit exceeded' : undefined
  }
}

/**
 * Consume an auto application quota (increment usage)
 */
export async function consumeAutoApplication(userId: string): Promise<boolean> {
  const quota = await checkAutoApplicationQuota(userId)
  if (!quota.allowed) {
    return false
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      autoApplicationsUsed: {
        increment: 1
      }
    }
  })

  return true
}

/**
 * Consume a mock interview quota (increment usage)
 */
export async function consumeMockInterview(userId: string): Promise<boolean> {
  const quota = await checkMockInterviewQuota(userId)
  if (!quota.allowed) {
    return false
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      mockInterviewsUsed: {
        increment: 1
      }
    }
  })

  return true
}

/**
 * Update user plan and reset quotas
 */
export async function updateUserPlan(
  userId: string,
  planId: string,
  hasAddon = false,
  periodStart?: Date,
  periodEnd?: Date
): Promise<void> {
  const limits = getPlanLimits(planId, hasAddon)
  const now = new Date()

  // Calculate trial end time for new trial users
  let trialEndsAt: Date | null = null
  if (planId === 'free_trial') {
    trialEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: planId,
      hasInterviewAddon: hasAddon,
      autoApplicationsLimit: limits.autoApplicationsPerMonth,
      mockInterviewsLimit: limits.mockInterviewsPerMonth,
      autoApplicationsUsed: 0, // Reset usage counters
      mockInterviewsUsed: 0,
      subscriptionPeriodStart: periodStart || now,
      subscriptionPeriodEnd: periodEnd,
      trialEndsAt,
    }
  })
}

/**
 * Reset monthly usage counters (called at billing period start)
 */
export async function resetUsageCounters(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      autoApplicationsUsed: 0,
      mockInterviewsUsed: 0,
    }
  })
}

/**
 * Extend trial period (for referrals)
 */
export async function extendTrial(userId: string, hoursToAdd = 24): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trialEndsAt: true, subscriptionPlan: true }
  })

  if (!user || user.subscriptionPlan !== 'free_trial') {
    return false
  }

  const currentTrialEnd = user.trialEndsAt || new Date()
  const newTrialEnd = new Date(currentTrialEnd.getTime() + hoursToAdd * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: userId },
    data: {
      trialEndsAt: newTrialEnd,
      trialExtensions: {
        increment: 1
      }
    }
  })

  return true
}

/**
 * Check if user has access to specific feature
 */
export async function checkFeatureAccess(
  userId: string, 
  feature: 'auto_apply' | 'mock_interviews' | 'advanced_analytics' | 'priority_processing'
): Promise<boolean> {
  const status = await getUserPlanStatus(userId)
  if (!status || !status.hasActiveSubscription) {
    return false
  }

  const limits = getPlanLimits(status.subscriptionPlan, status.hasInterviewAddon)

  switch (feature) {
    case 'auto_apply':
      return limits.autoApplicationsPerMonth > 0
    case 'mock_interviews':
      return limits.hasInterviewPreparation
    case 'advanced_analytics':
      return limits.hasAdvancedAnalytics
    case 'priority_processing':
      return limits.hasPriorityProcessing
    default:
      return false
  }
}