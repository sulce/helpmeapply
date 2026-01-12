# Subscription-Protected Routes and Pages

## Overview
This document lists all routes and pages that are protected by subscription access control. Users without an active subscription (including expired trials) will be redirected to `/billing?reason=expired`.

## Access Logic
- ✅ **Active Subscription**: Users with `subscriptionStatus: 'active'` have full access
- ✅ **Active Trial**: Users with `subscriptionPlan: 'free_trial'` and `trialEndsAt > now` have full access
- ✅ **Canceled with Grace Period**: Users with `subscriptionStatus: 'canceled'` have access until `currentPeriodEnd`
- ❌ **Expired**: All other states deny access and redirect to billing

## Protected API Routes

All protected routes use the `withSubscription` middleware which:
- Validates subscription status server-side
- Returns 402 status code with subscription error for unauthorized access
- Includes trial validation (`trialEndsAt > now`)

### Job Management
- `POST /api/jobs/scan` - Start automated job scanning
- `GET /api/jobs/scan` - Check job scan queue status
- `POST /api/jobs/customize-resume-preview` - Generate customized resume preview for job

### Applications
- `POST /api/applications` - Create new job application
- `POST /api/applications/manual-update` - Update manual application status

### AI-Powered Features
- `POST /api/generate-cover-letter` - Generate AI cover letter for job

### Profile Management
- `POST /api/profile` - Create or update user profile (saving changes)

### Interview Preparation
- `POST /api/interview/start` - Start mock interview session (already protected with quota check)

### Auto-Apply Features
- `POST /api/jobs/apply-automated` - Submit automated job application (already protected with quota check)

## Protected Pages

All protected pages use server-side layout guards that:
- Check subscription status before rendering
- Redirect to `/billing?reason=expired` if no access
- Enforce on every page load (server-side)

### Core Application Pages
- `/dashboard` - Main dashboard with overview and analytics
- `/jobs` - Job search and browsing
- `/applications` - View and manage job applications
- `/profile` - Edit user profile and preferences
- `/analytics` - View detailed application analytics
- `/resume-builder` - Build and customize resume
- `/interview/[sessionId]` - Mock interview session

## Unprotected Routes

### Public Marketing Pages
- `/` - Homepage
- `/about` - About page
- `/faq` - FAQ page
- `/terms` - Terms & Conditions
- `/privacy` - Privacy Policy
- `/fair-use` - Fair Use Policy
- `/ai-transparency` - AI Use & Transparency Policy

### Authentication Pages
- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/auth/signin` - NextAuth signin page

### Billing & Account Management
- `/billing` - Billing and subscription management (accessible to all authenticated users)

### Read-Only API Routes
- `GET /api/profile` - Read profile data (authentication required but not subscription)
- `GET /api/applications` - Read applications (authentication required but not subscription)
- `POST /api/register` - User registration
- `GET/POST /api/auth/*` - Authentication endpoints

## Implementation Details

### Middleware Implementation
Location: `src/lib/billing/middleware.ts`

```typescript
export const withSubscription = (handler) => {
  return async (request, ...args) => {
    const { user, subscription } = await requireActiveSubscription(request)
    return await handler(request, { user, subscription }, ...args)
  }
}
```

### Server Guard Implementation
Location: `src/lib/billing/serverGuard.ts`

```typescript
export async function enforceSubscriptionAccess() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const subscriptionStatus = await getUserSubscriptionStatus(session.user.id)
  if (!subscriptionStatus.hasAccess) {
    redirect('/billing?reason=expired')
  }

  return { user: session.user, subscription: subscriptionStatus }
}
```

### Trial Validation Logic
Location: `src/lib/billing/subscription.ts`

```typescript
export function hasActiveSubscription(user) {
  const now = new Date()

  // Check for active trial first
  if (user.subscriptionPlan === 'free_trial' && user.trialEndsAt) {
    return now < user.trialEndsAt  // Trial is valid if not expired
  }

  // Then check subscription status...
}
```

## Testing Access Control

### Test Scenarios
1. **Active Trial User**: Should have full access until `trialEndsAt`
2. **Expired Trial User**: Should be redirected to `/billing?reason=expired`
3. **Active Subscriber**: Should have full access
4. **Canceled Subscriber**: Should have access until `currentPeriodEnd`
5. **Expired Subscriber**: Should be redirected to `/billing?reason=expired`

### Manual Testing
```bash
# 1. Register new user (gets 24h trial)
# 2. Access protected pages - should work
# 3. Set trialEndsAt to past date in database
# 4. Try accessing protected pages - should redirect to billing
```

## Security Notes

- ✅ All protection is **server-side** - no client-side trust
- ✅ Subscription status is fetched from **database** on every request
- ✅ Trial expiration is validated using **server time** (not client)
- ✅ Webhooks from Stripe are the **source of truth** for subscription changes
- ✅ All protected routes return **402 Payment Required** status for unauthorized access
- ✅ Page guards use **redirect()** which is server-side and cannot be bypassed

## Maintenance

When adding new features that require subscription:

1. **For API Routes**: Wrap with `withSubscription` middleware
2. **For Pages**: Create `layout.tsx` with `enforceSubscriptionAccess()` call
3. **Update This Document**: Add the new route/page to the lists above

## Error Handling

When subscription check fails:
- API routes return JSON error with `requiresSubscription: true`
- Pages redirect to `/billing?reason=expired`
- Users see clear messaging about subscription requirement
- Trial users see time remaining in their trial
