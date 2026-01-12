/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe webhook events with mandatory signature verification.
 * Handles all subscription lifecycle events and maintains data synchronization.
 * Implements idempotent processing to prevent duplicate operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe, webhookSecret, findUserByStripeCustomerId, updateUserSubscription, prisma } from '@/lib/billing'
import type { SubscriptionStatus } from '@/lib/billing'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Check if Stripe is configured
    if (!stripe || !webhookSecret) {
      console.error('Stripe is not properly configured')
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    // Verify webhook signature (mandatory security requirement)
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Database-backed idempotent processing - prevent duplicate event handling
    // This is the EXACT place where duplicate prevention occurs
    const result = await processWebhookEvent(event)
    
    if (result.alreadyProcessed) {
      console.log(`Event ${event.id} already processed, skipping`)
      return NextResponse.json({ received: true })
    }

    console.log(`Successfully processed new webhook event: ${event.type} (${event.id})`)

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Process webhook event with database-backed idempotency
 * Prevents duplicate processing in serverless/multi-instance deployments
 */
async function processWebhookEvent(event: Stripe.Event): Promise<{ alreadyProcessed: boolean }> {
  return await prisma.$transaction(async (tx) => {
    try {
      // Attempt to create event record - this will fail if event already exists
      await tx.stripeEvent.create({
        data: {
          eventId: event.id,
          type: event.type,
          payload: JSON.stringify(event.data.object), // Store for debugging
        },
      })

      // If we reach here, event is new - process it
      await processEventByType(event)
      
      return { alreadyProcessed: false }
      
    } catch (error: any) {
      // Check if error is due to unique constraint violation (duplicate event)
      if (error.code === 'P2002' || error.message?.includes('unique constraint')) {
        console.log(`Event ${event.id} already exists in database, skipping processing`)
        return { alreadyProcessed: true }
      }
      
      // Re-throw any other error
      throw error
    }
  })
}

/**
 * Process event based on type - extracted from main handler for transaction safety
 */
async function processEventByType(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
      break

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice)
      break

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
      break

    case 'invoice.created':
    case 'invoice.finalized':
    case 'invoice.paid':
      // These events are informational and don't require action
      console.log(`Acknowledged webhook event: ${event.type}`)
      break

    default:
      console.log(`Unhandled webhook event type: ${event.type}`)
  }
}

/**
 * Handles successful checkout completion
 * Initial subscription activation after payment
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    if (session.mode !== 'subscription' || !session.customer || !session.subscription) {
      console.log('Skipping non-subscription checkout session')
      return
    }

    if (!stripe) {
      throw new Error('Stripe is not configured')
    }

    // Get user from customer ID
    const user = await findUserByStripeCustomerId(session.customer as string)
    if (!user) {
      console.error('User not found for customer:', session.customer)
      return
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    
    await updateSubscriptionFromStripe(user.id, subscription)
    
    console.log(`Checkout completed for user ${user.id}, subscription ${subscription.id}`)
    
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
    throw error
  }
}

/**
 * Handles new subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const user = await findUserByStripeCustomerId(subscription.customer as string)
    if (!user) {
      console.error('User not found for customer:', subscription.customer)
      return
    }

    await updateSubscriptionFromStripe(user.id, subscription)
    
    console.log(`Subscription created for user ${user.id}: ${subscription.id}`)
    
  } catch (error) {
    console.error('Error handling subscription created:', error)
    throw error
  }
}

/**
 * Handles subscription updates (plan changes, status changes, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const user = await findUserByStripeCustomerId(subscription.customer as string)
    if (!user) {
      console.error('User not found for customer:', subscription.customer)
      return
    }

    await updateSubscriptionFromStripe(user.id, subscription)
    
    console.log(`Subscription updated for user ${user.id}: ${subscription.id} (${subscription.status})`)
    
  } catch (error) {
    console.error('Error handling subscription updated:', error)
    throw error
  }
}

/**
 * Handles subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const user = await findUserByStripeCustomerId(subscription.customer as string)
    if (!user) {
      console.error('User not found for customer:', subscription.customer)
      return
    }

    await updateSubscriptionFromStripe(user.id, subscription)
    
    console.log(`Subscription deleted for user ${user.id}: ${subscription.id}`)
    
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
    throw error
  }
}

/**
 * Handles payment failures
 * Implements graceful downgrade (restricted access, not immediate deletion)
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    // Invoice.subscription can be a string ID or expanded Subscription object
    // TypeScript types don't expose this property, so we need to cast
    const invoiceData = invoice as any
    const subscriptionId = typeof invoiceData.subscription === 'string'
      ? invoiceData.subscription
      : invoiceData.subscription?.id

    if (!subscriptionId) {
      console.log('No subscription ID found in invoice')
      return
    }

    if (!stripe) {
      throw new Error('Stripe is not configured')
    }

    // Get updated subscription with current status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    const user = await findUserByStripeCustomerId(subscription.customer as string)
    if (!user) {
      console.error('User not found for customer:', subscription.customer)
      return
    }

    await updateSubscriptionFromStripe(user.id, subscription)
    
    console.log(`Payment failed for user ${user.id}, subscription ${subscription.id}`)
    
  } catch (error) {
    console.error('Error handling payment failed:', error)
    throw error
  }
}

/**
 * Handles successful payments
 * Restores access after payment issues are resolved and starts new billing periods
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    // Invoice.subscription can be a string ID or expanded Subscription object
    // TypeScript types don't expose this property, so we need to cast
    const invoiceData = invoice as any
    const subscriptionId = typeof invoiceData.subscription === 'string'
      ? invoiceData.subscription
      : invoiceData.subscription?.id

    if (!subscriptionId) {
      console.log('No subscription ID found in invoice')
      return
    }

    if (!stripe) {
      throw new Error('Stripe is not configured')
    }

    // Get updated subscription with current status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    const user = await findUserByStripeCustomerId(subscription.customer as string)
    if (!user) {
      console.error('User not found for customer:', subscription.customer)
      return
    }

    await updateSubscriptionFromStripe(user.id, subscription)
    
    // For recurring invoices (not the first invoice), start a new billing period
    if (invoice.billing_reason === 'subscription_cycle') {
      const { startNewBillingPeriod } = await import('@/lib/billing/usageTracking')

      const priceId = subscription.items.data[0]?.price?.id
      const addonPriceIds = subscription.items.data.slice(1).map(item => item.price.id)

      if (priceId) {
        try {
          const subData = subscription as any
          const periodStart = new Date(subData.current_period_start * 1000)
          const periodEnd = new Date(subData.current_period_end * 1000)
          
          await startNewBillingPeriod(
            user.id,
            subscription.id,
            priceId,
            periodStart,
            periodEnd,
            addonPriceIds
          )
          
          console.log(`Started new billing period for user ${user.id}: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
        } catch (error) {
          console.error(`Failed to start new billing period for user ${user.id}:`, error)
          // Don't fail the webhook for this error
        }
      }
    }
    
    console.log(`Payment succeeded for user ${user.id}, subscription ${subscription.id}`)
    
  } catch (error) {
    console.error('Error handling payment succeeded:', error)
    throw error
  }
}

/**
 * Updates local subscription data from Stripe subscription object
 * Central function for maintaining data synchronization
 */
async function updateSubscriptionFromStripe(userId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) {
    throw new Error('No price found in subscription')
  }

  // Access subscription properties through type assertion since Stripe types don't expose all fields
  const subData = subscription as any

  // Validate current_period_end exists and is valid
  if (!subData.current_period_end || typeof subData.current_period_end !== 'number') {
    throw new Error(`Invalid current_period_end for subscription ${subscription.id}: ${subData.current_period_end}`)
  }

  // Extract add-on price IDs
  const addonPriceIds = subscription.items.data.slice(1).map(item => item.price.id)

  await updateUserSubscription({
    userId,
    subscriptionId: subscription.id,
    priceId,
    status: subscription.status as SubscriptionStatus,
    currentPeriodEnd: new Date(subData.current_period_end * 1000),
    cancelAtPeriodEnd: subData.cancel_at_period_end || false,
  })

  // Import the usage tracking functions
  const { startNewBillingPeriod, updateCurrentPeriodLimits } = await import('@/lib/billing/usageTracking')

  // Handle billing period management based on subscription status
  if (subscription.status === 'active') {
    try {
      // Check if user is upgrading from trial to paid
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionPlan: true }
      })

      const isUpgradingFromTrial = user?.subscriptionPlan === 'free_trial'

      if (isUpgradingFromTrial) {
        // User is upgrading from trial - create clean new billing period
        console.log(`User ${userId} upgrading from trial to paid subscription`)

        // Deactivate ALL existing trial periods
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

        // Start fresh billing period for paid subscription
        await startNewBillingPeriod(
          userId,
          subscription.id,
          priceId,
          new Date(subData.current_period_start * 1000),
          new Date(subData.current_period_end * 1000),
          addonPriceIds
        )
        console.log(`Created new billing period for user ${userId} (upgraded from trial)`)
      } else {
        // Existing paid user - just update limits (plan change, addon added, etc.)
        await updateCurrentPeriodLimits(userId, priceId, addonPriceIds)
        console.log(`Updated usage limits for user ${userId} with price ${priceId}`)
      }
    } catch (error) {
      console.error(`Failed to update usage limits for user ${userId}:`, error)
      // Don't fail the webhook for this error
    }
  } else if (subscription.status === 'canceled') {
    try {
      // Mark current usage periods as inactive for canceled subscriptions
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
      console.log(`Deactivated usage periods for canceled subscription user ${userId}`)
    } catch (error) {
      console.error(`Failed to deactivate usage periods for user ${userId}:`, error)
      // Don't fail the webhook for this error
    }
  }
}

// Only POST method allowed for webhooks
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}