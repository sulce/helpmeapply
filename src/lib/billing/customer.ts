/**
 * Stripe Customer Management
 * 
 * Handles customer lifecycle operations including creation,
 * retrieval, and synchronization with our user database.
 */

import { stripe, isStripeConfigured } from './stripe'
import { prisma } from '@/lib/db'

/**
 * Creates a Stripe customer and stores the ID in our database
 * Called on user signup to establish billing relationship
 */
export async function createStripeCustomer(userId: string, email: string, name?: string) {
  try {
    if (!isStripeConfigured || !stripe) {
      console.warn('Stripe not configured, skipping customer creation')
      return null
    }

    // Check if customer already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true }
    })

    if (existingUser?.stripeCustomerId) {
      return existingUser.stripeCustomerId
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        userId, // Store our internal user ID for webhook processing
      },
    })

    // Store customer ID in our database
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    })

    return customer.id
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw new Error('Failed to create billing customer')
  }
}

/**
 * Gets or creates a Stripe customer ID for a user
 * Ensures every user has a corresponding Stripe customer
 */
export async function ensureStripeCustomer(userId: string, email: string, name?: string) {
  console.log('[Customer] Ensuring customer for user:', userId, email)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true }
  })

  if (user?.stripeCustomerId) {
    console.log('[Customer] Existing customer found:', user.stripeCustomerId)
    return user.stripeCustomerId
  }

  console.log('[Customer] No existing customer, creating new one')
  const customerId = await createStripeCustomer(userId, email, name)
  console.log('[Customer] New customer created:', customerId)

  return customerId
}

/**
 * Retrieves customer from Stripe with subscription details
 * Used for billing management and subscription status checks
 */
export async function getStripeCustomerWithSubscriptions(customerId: string) {
  try {
    if (!isStripeConfigured || !stripe) {
      console.warn('Stripe not configured, cannot retrieve customer')
      return null
    }

    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['subscriptions'],
    })

    return customer
  } catch (error) {
    console.error('Error retrieving Stripe customer:', error)
    throw new Error('Failed to retrieve customer details')
  }
}

/**
 * Finds user by Stripe customer ID (used in webhook processing)
 * Returns user with current subscription status
 */
export async function findUserByStripeCustomerId(stripeCustomerId: string) {
  return prisma.user.findFirst({
    where: { stripeCustomerId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true,
      subscriptionStatus: true,
      subscriptionId: true,
      priceId: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  })
}