# Stripe SaaS Integration Documentation

## Overview

This document outlines the complete Stripe integration for the HelpMeApply SaaS platform. The implementation follows strict requirements for subscription-based access control with webhook-driven updates.

## Architecture Components

### 1. Billing Module (`/src/lib/billing/`)

**Core Files:**
- `stripe.ts` - Stripe client configuration and constants
- `customer.ts` - Customer management functions
- `subscription.ts` - Subscription lifecycle operations
- `middleware.ts` - Access control guards
- `index.ts` - Main module exports

**Key Features:**
- Environment-based configuration (test vs live keys)
- Mandatory webhook signature verification
- Idempotent event processing
- Backend-driven access control

### 2. Database Schema Changes

**Added to User Model:**
```prisma
// Stripe billing fields
stripeCustomerId     String?   @map("stripe_customer_id")
subscriptionStatus   String?   @map("subscription_status") // active, past_due, canceled, etc.
subscriptionId       String?   @map("subscription_id")
priceId              String?   @map("price_id")
currentPeriodEnd     DateTime? @map("current_period_end")
cancelAtPeriodEnd    Boolean   @default(false) @map("cancel_at_period_end")
```

### 3. API Endpoints

**Checkout Creation:** `POST /api/checkout`
- Creates Stripe Checkout sessions
- Redirect-based flow (no custom UI)
- Requires authentication

**Webhook Handler:** `POST /api/webhooks/stripe`
- Signature verification mandatory
- Handles all subscription lifecycle events
- Idempotent processing

**Billing Status:** `GET /api/billing/status`
- Returns current subscription information
- Used by frontend for access checks

**Customer Portal:** `POST /api/billing/portal`
- Creates Stripe Customer Portal sessions
- Allows subscription management

### 4. Access Control Implementation

**Middleware Usage:**
```typescript
import { withSubscription } from '@/lib/billing'

export const POST = withSubscription(async (request, { user, subscription }) => {
  // This handler only runs for users with active subscriptions
  // user and subscription objects are provided
})
```

**Page-Level Access Check:**
```typescript
import { getPageSubscriptionData } from '@/lib/billing'

// In your page component
const subscriptionData = await getPageSubscriptionData(userId)
if (!subscriptionData.hasAccess) {
  // Redirect to billing page or show upgrade prompt
}
```

### 5. Customer Lifecycle

**User Registration:**
- Stripe customer created automatically on signup
- Works for both email/password and OAuth registration
- Non-blocking (registration succeeds even if Stripe fails)

**Subscription Purchase:**
- User redirected to Stripe Checkout
- Success/cancel URLs handle return flow
- Webhook activates subscription

**Access Control:**
- `subscription_status === 'active'` grants access
- Grace period for `past_due` and `unpaid` statuses
- Canceled subscriptions have access until period end

## Environment Variables

**Required Variables:**
```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_..."  # Use sk_live_... for production
STRIPE_WEBHOOK_SECRET="whsec_..." # From webhook endpoint configuration
```

**Setup Steps:**
1. Create Stripe account and get API keys
2. Create products and prices in Stripe Dashboard
3. Update price IDs in `/src/app/billing/page.tsx`
4. Configure webhook endpoint: `/api/webhooks/stripe`
5. Set webhook events: checkout.session.completed, customer.subscription.*

## Webhook Events Handled

**Mandatory Events:**
- `checkout.session.completed` - Initial subscription activation
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Plan changes, status updates
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_failed` - Payment failures (grace period)
- `invoice.payment_succeeded` - Payment restoration

## Access Control Logic

**Active Access:**
- `subscription_status === 'active'`

**Grace Period Access:**
- `past_due` or `unpaid` status with valid current_period_end
- Restricted access but not immediate termination

**Canceled Subscriptions:**
- Access until current_period_end
- Then access revoked

## Frontend Usage

**Billing Page:** `/billing`
- Displays subscription status
- Links to Stripe Customer Portal
- Shows pricing plans for non-subscribers

**Access Checks:**
```typescript
// In components, check subscription status
const { data: subscription } = useSWR('/api/billing/status')
if (!subscription?.hasAccess) {
  // Show upgrade prompt
}
```

## Security Features

**Webhook Verification:**
- Mandatory signature verification
- Prevents webhook spoofing
- Rejects invalid requests

**Backend-Only Access Control:**
- No client-side subscription checks trusted
- All access validation server-side
- Webhooks are source of truth

**Idempotent Processing:**
- Duplicate webhook events ignored
- Prevents data corruption
- Maintains consistency

## Testing

**Test Webhook Events:**
Use Stripe CLI to test webhook processing:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

**Access Control Testing:**
1. Create test user
2. Subscribe using test cards
3. Verify access granted
4. Test webhook events (payment failure, cancellation)
5. Verify access control behavior

## Production Deployment

**Checklist:**
- [ ] Update STRIPE_SECRET_KEY to live key
- [ ] Configure production webhook endpoint
- [ ] Update price IDs to production prices
- [ ] Test webhook delivery in production
- [ ] Monitor subscription metrics

**Important Notes:**
- Webhooks are the single source of truth
- Never trust client-side subscription status
- Always verify subscription server-side
- Handle failed payments gracefully
- Provide clear billing management interface

## Error Handling

**Customer Creation Failures:**
- Registration continues (customer created later)
- Handled by `ensureStripeCustomer` function

**Webhook Failures:**
- Return 500 status for Stripe retry
- Log errors for investigation
- Monitor webhook delivery success

**Access Control Failures:**
- Return 402 Payment Required
- Include upgrade information
- Graceful degradation where possible