/**
 * Stripe Subscription Management
 * 
 * Handles subscription lifecycle operations including creation,
 * updates, cancellation, and access control logic.
 */

import { stripe, STRIPE_CONFIG, isStripeConfigured } from './stripe'
import { prisma } from '@/lib/db'
import type { SubscriptionStatus } from './stripe'

/**
 * Creates a Stripe Checkout session for subscription purchase
 * Redirects user to Stripe-hosted checkout page
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
}: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  userId: string
}) {
  try {
    if (!isStripeConfigured || !stripe) {
      throw new Error('Stripe is not configured. Please set up payment processing.')
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      customer: customerId, // Use existing customer - don't create new one
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId, // Store for webhook processing
      },
    })

    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw new Error('Failed to create checkout session')
  }
}

/**
 * Updates user subscription data in our database
 * Called by webhooks to keep local data synchronized
 */
export async function updateUserSubscription({
  userId,
  subscriptionId,
  priceId,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  userId: string
  subscriptionId: string
  priceId: string
  status: SubscriptionStatus
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}) {
  try {
    // Get plan ID from price ID using entitlements
    const { getPlanFromPriceId } = await import('@/lib/entitlements')
    const planEntitlement = getPlanFromPriceId(priceId)
    const subscriptionPlan = planEntitlement?.planId || 'starter'

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionId,
        priceId,
        subscriptionPlan, // Set the plan ID (starter, pro, power, etc.)
        subscriptionStatus: status,
        currentPeriodEnd,
        cancelAtPeriodEnd,
      },
    })
  } catch (error) {
    console.error('Error updating user subscription:', error)
    throw new Error('Failed to update subscription data')
  }
}

/**
 * Checks if user has active subscription access
 * Source of truth for application access control
 * Includes trial access validation
 */
export function hasActiveSubscription(user: {
  subscriptionStatus?: string | null
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd?: boolean | null
  trialEndsAt?: Date | null
  subscriptionPlan?: string | null
}): boolean {
  const now = new Date()

  // Check for active trial first
  if (user.subscriptionPlan === 'free_trial' && user.trialEndsAt) {
    return now < user.trialEndsAt
  }

  // LEGACY USERS: If no subscription plan set, assume they should have access (grandfathered)
  // This handles users created before subscription system was implemented
  if (!user.subscriptionPlan && !user.subscriptionStatus) {
    return true // Grant access to legacy users
  }

  // No subscription data means no access (unless trial above or legacy user)
  if (!user.subscriptionStatus) {
    return false
  }

  // Active status grants immediate access
  if (STRIPE_CONFIG.activeStatuses.includes(user.subscriptionStatus as any)) {
    return true
  }

  // Canceled subscriptions have access until period end
  if (user.subscriptionStatus === 'canceled' && user.currentPeriodEnd) {
    return now < user.currentPeriodEnd
  }

  // Grace period for failed payments (restricted access, not immediate termination)
  if (STRIPE_CONFIG.gracePeriodStatuses.includes(user.subscriptionStatus as any)) {
    return user.currentPeriodEnd ? now < user.currentPeriodEnd : false
  }

  // All other statuses deny access
  return false
}

/**
 * Gets user subscription status with access information
 * Used by access control middleware and billing UI
 */
export async function getUserSubscriptionStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      subscriptionId: true,
      priceId: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripeCustomerId: true,
      subscriptionPlan: true,
      trialEndsAt: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const now = new Date()
  const isTrialActive = user.subscriptionPlan === 'free_trial' && user.trialEndsAt ? now < user.trialEndsAt : false

  return {
    ...user,
    hasAccess: hasActiveSubscription(user),
    isActive: user.subscriptionStatus === 'active' || isTrialActive,
    isInGracePeriod: STRIPE_CONFIG.gracePeriodStatuses.includes(user.subscriptionStatus as any),
    isTrialActive,
  }
}

/**
 * Creates customer portal session for subscription management
 * Allows users to update payment methods, view invoices, etc.
 */
export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  try {
    if (!isStripeConfigured || !stripe) {
      throw new Error('Stripe is not configured. Please set up payment processing.')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    throw new Error('Failed to create billing portal session')
  }
}

/**
 * Cancels subscription at period end
 * Provides graceful downgrade experience
 */
export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string) {
  try {
    if (!isStripeConfigured || !stripe) {
      throw new Error('Stripe is not configured. Please set up payment processing.')
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    return subscription
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw new Error('Failed to cancel subscription')
  }
}

/**
 * Reactivates a canceled subscription (if still in current period)
 */
export async function reactivateSubscription(subscriptionId: string) {
  try {
    if (!isStripeConfigured || !stripe) {
      throw new Error('Stripe is not configured. Please set up payment processing.')
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    return subscription
  } catch (error) {
    console.error('Error reactivating subscription:', error)
    throw new Error('Failed to reactivate subscription')
  }
}