/**
 * Billing Period-Based Usage Tracking
 * 
 * Handles usage tracking per billing period with proper limit enforcement
 * and automatic period management based on Stripe subscription cycles.
 */

import { prisma } from '@/lib/db'
import { getPlanFromPriceId, calculateEffectiveLimits, type PlanLimits } from '@/lib/entitlements'

export interface CurrentUsage {
  autoApplicationsUsed: number
  autoApplicationsLimit: number
  autoApplicationsRemaining: number
  mockInterviewsUsed: number
  mockInterviewsLimit: number
  mockInterviewsRemaining: number
  planType: string
  periodStart: Date
  periodEnd: Date
  daysRemainingInPeriod: number
}

/**
 * Get or create current active usage period for user
 */
export async function getCurrentUsagePeriod(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      priceId: true,
      subscriptionId: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
      hasInterviewAddon: true
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const now = new Date()

  // Check for active usage periods (defensive: should only be one)
  const activePeriods = await prisma.usagePeriod.findMany({
    where: {
      userId,
      isActive: true,
      periodStart: { lte: now },
      periodEnd: { gt: now }
    },
    orderBy: { periodStart: 'desc' }
  })

  // Defensive safeguard: If multiple active periods exist, deactivate all but the most recent
  if (activePeriods.length > 1) {
    console.warn(`User ${userId} has ${activePeriods.length} active periods! Cleaning up...`)
    const [mostRecent, ...extras] = activePeriods

    // Deactivate all extras
    await prisma.usagePeriod.updateMany({
      where: {
        id: { in: extras.map(p => p.id) }
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })
    console.log(`Deactivated ${extras.length} duplicate active periods for user ${userId}`)

    return mostRecent
  }

  let activePeriod = activePeriods[0]

  // If no active period, create one
  if (!activePeriod) {
    activePeriod = await createNewUsagePeriod(userId, user)
  }

  return activePeriod
}

/**
 * Create a new usage period for user based on their current subscription
 */
async function createNewUsagePeriod(userId: string, user: any) {
  const now = new Date()
  let periodStart = now
  let periodEnd: Date
  let isTrial = false
  
  // Determine period end based on subscription type
  if (user.subscriptionPlan === 'free_trial') {
    isTrial = true
    periodEnd = user.trialEndsAt || new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
  } else if (user.currentPeriodEnd) {
    // Use Stripe subscription period
    periodEnd = user.currentPeriodEnd
  } else {
    // Default to monthly period if no Stripe data
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  }

  // Calculate limits based on plan entitlements
  let limits: PlanLimits
  if (user.priceId) {
    // Get limits from price ID entitlements
    const addonPriceIds = user.hasInterviewAddon ? ['price_1SnuvtEqjyc8yXsXrgvM4iqj'] : []
    limits = calculateEffectiveLimits(user.priceId, addonPriceIds)
  } else {
    // Fall back to free trial limits
    limits = {
      autoApplicationsPerMonth: 5,
      mockInterviewsPerMonth: 1,
      hasAdvancedAnalytics: false,
      hasPriorityProcessing: false,
      hasAdvancedOptimization: false
    }
  }

  // Create new usage period
  const newPeriod = await prisma.usagePeriod.create({
    data: {
      userId,
      periodStart,
      periodEnd,
      subscriptionId: user.subscriptionId,
      priceId: user.priceId,
      planType: user.subscriptionPlan || 'free_trial',
      autoApplicationsUsed: 0,
      mockInterviewsUsed: 0,
      autoApplicationsLimit: limits.autoApplicationsPerMonth,
      mockInterviewsLimit: limits.mockInterviewsPerMonth,
      hasInterviewAddon: user.hasInterviewAddon || false,
      addonPriceIds: user.hasInterviewAddon ? JSON.stringify(['price_1SnuvtEqjyc8yXsXrgvM4iqj']) : null,
      isActive: true,
      isTrial
    }
  })

  console.log(`Created new usage period for user ${userId}: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
  return newPeriod
}

/**
 * Get current usage stats for user
 */
export async function getCurrentUsage(userId: string): Promise<CurrentUsage> {
  const period = await getCurrentUsagePeriod(userId)
  const now = new Date()
  
  const daysRemainingInPeriod = Math.max(0, Math.ceil((period.periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  
  return {
    autoApplicationsUsed: period.autoApplicationsUsed,
    autoApplicationsLimit: period.autoApplicationsLimit,
    autoApplicationsRemaining: Math.max(0, period.autoApplicationsLimit - period.autoApplicationsUsed),
    mockInterviewsUsed: period.mockInterviewsUsed,
    mockInterviewsLimit: period.mockInterviewsLimit,
    mockInterviewsRemaining: Math.max(0, period.mockInterviewsLimit - period.mockInterviewsUsed),
    planType: period.planType,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    daysRemainingInPeriod
  }
}

/**
 * Check if user can perform action (returns true if allowed)
 */
export async function checkUsageLimit(userId: string, actionType: 'auto_application' | 'mock_interview'): Promise<boolean> {
  const usage = await getCurrentUsage(userId)
  
  switch (actionType) {
    case 'auto_application':
      return usage.autoApplicationsRemaining > 0
    case 'mock_interview':
      return usage.mockInterviewsRemaining > 0
    default:
      return false
  }
}

/**
 * Increment usage counter for action type
 */
export async function incrementUsage(userId: string, actionType: 'auto_application' | 'mock_interview'): Promise<void> {
  const period = await getCurrentUsagePeriod(userId)
  
  const updateData: any = { updatedAt: new Date() }
  
  switch (actionType) {
    case 'auto_application':
      if (period.autoApplicationsUsed >= period.autoApplicationsLimit) {
        throw new Error('Auto application limit reached for current billing period')
      }
      updateData.autoApplicationsUsed = { increment: 1 }
      break
    case 'mock_interview':
      if (period.mockInterviewsUsed >= period.mockInterviewsLimit) {
        throw new Error('Mock interview limit reached for current billing period')
      }
      updateData.mockInterviewsUsed = { increment: 1 }
      break
    default:
      throw new Error(`Unknown action type: ${actionType}`)
  }
  
  await prisma.usagePeriod.update({
    where: { id: period.id },
    data: updateData
  })
  
  console.log(`Incremented ${actionType} usage for user ${userId}`)
}

/**
 * Reset usage for new billing period (called by Stripe webhooks)
 */
export async function startNewBillingPeriod(
  userId: string, 
  subscriptionId: string,
  priceId: string,
  periodStart: Date,
  periodEnd: Date,
  addonPriceIds: string[] = []
): Promise<void> {
  // Mark current period as inactive
  await prisma.usagePeriod.updateMany({
    where: {
      userId,
      isActive: true
    },
    data: {
      isActive: false,
      updatedAt: new Date()
    }
  })

  // Calculate new limits
  const limits = calculateEffectiveLimits(priceId, addonPriceIds)
  
  // Create new period
  await prisma.usagePeriod.create({
    data: {
      userId,
      periodStart,
      periodEnd,
      subscriptionId,
      priceId,
      planType: getPlanFromPriceId(priceId)?.planId || 'starter',
      autoApplicationsUsed: 0,
      mockInterviewsUsed: 0,
      autoApplicationsLimit: limits.autoApplicationsPerMonth,
      mockInterviewsLimit: limits.mockInterviewsPerMonth,
      hasInterviewAddon: addonPriceIds.length > 0,
      addonPriceIds: addonPriceIds.length > 0 ? JSON.stringify(addonPriceIds) : null,
      isActive: true,
      isTrial: false
    }
  })
  
  console.log(`Started new billing period for user ${userId}: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
}

/**
 * Update usage limits when subscription changes mid-period
 */
export async function updateCurrentPeriodLimits(
  userId: string,
  newPriceId: string,
  addonPriceIds: string[] = []
): Promise<void> {
  const period = await getCurrentUsagePeriod(userId)
  const newLimits = calculateEffectiveLimits(newPriceId, addonPriceIds)
  
  await prisma.usagePeriod.update({
    where: { id: period.id },
    data: {
      priceId: newPriceId,
      planType: getPlanFromPriceId(newPriceId)?.planId || period.planType,
      autoApplicationsLimit: newLimits.autoApplicationsPerMonth,
      mockInterviewsLimit: newLimits.mockInterviewsPerMonth,
      hasInterviewAddon: addonPriceIds.length > 0,
      addonPriceIds: addonPriceIds.length > 0 ? JSON.stringify(addonPriceIds) : null,
      isTrial: false, // Always false for paid subscriptions
      updatedAt: new Date()
    }
  })
  
  console.log(`Updated usage limits for user ${userId} with new price ${newPriceId}`)
}