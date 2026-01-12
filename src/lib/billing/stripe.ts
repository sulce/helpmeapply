/**
 * Stripe Client Configuration
 * 
 * Dedicated billing module for Stripe payment processing.
 * Handles environment separation and client initialization.
 */

import Stripe from 'stripe'

// Environment validation
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// For development, allow missing Stripe keys with warnings
if (!stripeSecretKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY environment variable is not set - Stripe functionality will be disabled')
}

if (!stripeWebhookSecret) {
  console.warn('⚠️  STRIPE_WEBHOOK_SECRET environment variable is not set - Stripe webhooks will be disabled')
}

// Initialize Stripe client with proper configuration (only if keys are available)
export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover', // Use latest stable API version
  typescript: true,
  telemetry: false, // Disable telemetry for better performance
}) : null

// Export webhook secret for signature verification
export const webhookSecret = stripeWebhookSecret || null

// Helper to check if Stripe is configured
export const isStripeConfigured = !!(stripeSecretKey && stripeWebhookSecret)

// Stripe configuration constants
export const STRIPE_CONFIG = {
  // Currency (ensure this matches your Stripe dashboard)
  currency: 'usd',
  
  // Checkout session configuration
  checkout: {
    mode: 'subscription' as const,
    payment_method_types: ['card'],
    billing_address_collection: 'auto' as const,
    customer_creation: 'always' as const,
  },
  
  // Webhook events we handle (mandatory events from requirements)
  webhookEvents: [
    'checkout.session.completed',
    'customer.subscription.created', 
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
    'invoice.payment_succeeded',
  ] as const,
  
  // Subscription statuses that grant access
  activeStatuses: ['active'] as const,
  
  // Grace period statuses (restricted but not immediate deletion)
  gracePeriodStatuses: ['past_due', 'unpaid'] as const,
} as const

// Type exports for TypeScript safety
export type StripeWebhookEvent = (typeof STRIPE_CONFIG.webhookEvents)[number]
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing'