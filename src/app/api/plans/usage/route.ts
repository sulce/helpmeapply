/**
 * Usage Tracking API
 * 
 * Provides usage statistics and quota information for the current user
 * based on billing period usage tracking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCurrentUsage } from '@/lib/billing/usageTracking'
import { getPlanFromPriceId } from '@/lib/entitlements'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current usage from billing period-based tracking
    const usage = await getCurrentUsage(session.user.id)
    
    // Get user details for additional context
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionPlan: true,
        priceId: true,
        subscriptionId: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        hasInterviewAddon: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get plan details from entitlement system
    const planEntitlement = user.priceId ? getPlanFromPriceId(user.priceId) : null
    const planTitle = planEntitlement?.name || (usage.planType === 'free_trial' ? 'Free Trial' : 'Unknown Plan')

    // Only show as trial if the usage period planType is free_trial
    // Don't check trialEndsAt for paid subscribers to avoid confusion
    const isTrialActive = usage.planType === 'free_trial'
    const hasActiveSubscription = user.subscriptionStatus === 'active'

    // Calculate percentage usage
    const autoApplicationsPercentage = usage.autoApplicationsLimit > 0 
      ? Math.round((usage.autoApplicationsUsed / usage.autoApplicationsLimit) * 100)
      : 0
    
    const mockInterviewsPercentage = usage.mockInterviewsLimit > 0
      ? Math.round((usage.mockInterviewsUsed / usage.mockInterviewsLimit) * 100)
      : 0

    return NextResponse.json({
      success: true,
      usage: {
        // Plan information
        currentPlan: usage.planType,
        planTitle,
        hasInterviewAddon: user.hasInterviewAddon || false,
        isTrialActive,
        hasActiveSubscription,
        
        // Usage statistics - based on billing period
        autoApplications: {
          used: usage.autoApplicationsUsed,
          limit: usage.autoApplicationsLimit,
          remaining: usage.autoApplicationsRemaining,
          percentageUsed: autoApplicationsPercentage
        },
        
        mockInterviews: {
          used: usage.mockInterviewsUsed,
          limit: usage.mockInterviewsLimit,
          remaining: usage.mockInterviewsRemaining,
          percentageUsed: mockInterviewsPercentage
        },
        
        // Period information - billing period based
        periodStart: usage.periodStart,
        periodEnd: usage.periodEnd,
        trialEndsAt: user.trialEndsAt,
        daysRemainingInPeriod: usage.daysRemainingInPeriod,
        
        // Reset information
        nextReset: usage.periodEnd,
      }
    })

  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to get usage information' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}