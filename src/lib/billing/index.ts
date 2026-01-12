/**
 * Billing Module Main Export
 * 
 * Centralized exports for all billing-related functionality.
 * Provides clean API for subscription management throughout the app.
 */

// Core Stripe configuration
export { stripe, webhookSecret, STRIPE_CONFIG } from './stripe'
export type { StripeWebhookEvent, SubscriptionStatus } from './stripe'

// Customer management
export {
  createStripeCustomer,
  ensureStripeCustomer,
  getStripeCustomerWithSubscriptions,
  findUserByStripeCustomerId,
} from './customer'

// Subscription management  
export {
  createCheckoutSession,
  updateUserSubscription,
  hasActiveSubscription,
  getUserSubscriptionStatus,
  createCustomerPortalSession,
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
} from './subscription'

// Access control middleware
export {
  requireActiveSubscription,
  withSubscription,
  checkSubscriptionAccess,
  createSubscriptionGuard,
  SubscriptionError,
  getPageSubscriptionData,
} from './middleware'

// Server-side page guards
export {
  enforceSubscriptionAccess,
  checkSubscriptionAccessForPage,
} from './serverGuard'

// Re-export for convenience
export { prisma } from '@/lib/db'