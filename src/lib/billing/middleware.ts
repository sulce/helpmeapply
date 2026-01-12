/**
 * Subscription Access Guard Middleware
 * 
 * Provides server-side access control based on subscription status.
 * No client-side trust - all checks are backend-driven.
 * Webhooks are the source of truth for subscription status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserSubscriptionStatus } from './subscription'

/**
 * Middleware to check if user has active subscription
 * Returns user data if access is granted, throws error if not
 */
export async function requireActiveSubscription(request: NextRequest) {
  // First check authentication
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new SubscriptionError('Authentication required', 401)
  }

  // Get subscription status from database (source of truth)
  const subscriptionStatus = await getUserSubscriptionStatus(session.user.id)
  
  if (!subscriptionStatus.hasAccess) {
    // Determine specific error type
    if (!subscriptionStatus.subscriptionStatus) {
      throw new SubscriptionError('No active subscription found', 402, 'NO_SUBSCRIPTION')
    }
    
    if (subscriptionStatus.isInGracePeriod) {
      throw new SubscriptionError('Subscription payment overdue', 402, 'PAYMENT_OVERDUE')
    }
    
    throw new SubscriptionError('Subscription required for access', 402, 'SUBSCRIPTION_REQUIRED')
  }

  return {
    user: session.user,
    subscription: subscriptionStatus
  }
}

/**
 * API route wrapper for subscription-protected endpoints
 */
export function withSubscription<T extends any[]>(
  handler: (request: NextRequest, context: { user: any; subscription: any }, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const { user, subscription } = await requireActiveSubscription(request)
      return await handler(request, { user, subscription }, ...args)
    } catch (error) {
      if (error instanceof SubscriptionError) {
        return NextResponse.json(
          { 
            error: error.message,
            code: error.code,
            requiresSubscription: true 
          },
          { status: error.status }
        )
      }
      
      console.error('Subscription check error:', error)
      return NextResponse.json(
        { error: 'Access verification failed' },
        { status: 500 }
      )
    }
  }
}

/**
 * Page-level subscription guard for React components
 * Use in pages that require active subscription
 */
export async function checkSubscriptionAccess(userId: string) {
  try {
    const subscriptionStatus = await getUserSubscriptionStatus(userId)
    
    return {
      hasAccess: subscriptionStatus.hasAccess,
      status: subscriptionStatus.subscriptionStatus,
      isActive: subscriptionStatus.isActive,
      isInGracePeriod: subscriptionStatus.isInGracePeriod,
      currentPeriodEnd: subscriptionStatus.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptionStatus.cancelAtPeriodEnd,
    }
  } catch (error) {
    console.error('Error checking subscription access:', error)
    return {
      hasAccess: false,
      status: null,
      isActive: false,
      isInGracePeriod: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }
  }
}

/**
 * Client component helper (to be implemented in a .tsx file)
 * This is a placeholder - actual React component should be in a separate .tsx file
 */
export function createSubscriptionGuard() {
  // This function would return React components when properly implemented
  // For now, just return a config object
  return {
    config: {
      requiresSubscription: true,
      redirectUrl: '/billing'
    }
  }
}

/**
 * Custom error class for subscription-related errors
 */
export class SubscriptionError extends Error {
  constructor(
    message: string,
    public status: number = 402,
    public code: string = 'SUBSCRIPTION_REQUIRED'
  ) {
    super(message)
    this.name = 'SubscriptionError'
  }
}

/**
 * Utility function to get user subscription for pages
 */
export async function getPageSubscriptionData(userId: string) {
  try {
    const data = await checkSubscriptionAccess(userId)
    return data
  } catch (error) {
    console.error('Error getting page subscription data:', error)
    return null
  }
}