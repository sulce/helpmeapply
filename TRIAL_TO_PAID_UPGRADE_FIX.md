# Trial to Paid Upgrade Fix

## Problem Summary

Users who upgraded from free trial to paid subscription were incorrectly shown as still being on trial, despite having active paid subscriptions.

---

## Root Causes

### Bug #1: Multiple Active Usage Periods
**Issue:** When users upgraded from trial to paid, the webhook was calling `updateCurrentPeriodLimits()` which only updated ONE existing period's limits. It did NOT:
- Deactivate the old trial period
- Create a new clean paid subscription period
- Set `isTrial: false`

**Result:** Users ended up with 2+ active periods, and the most recent one often still had `planType: 'free_trial'` or `isTrial: true`.

### Bug #2: Subscription Plan Not Updated
**Issue:** The `updateUserSubscription()` function in webhooks wasn't updating the `subscriptionPlan` field in the User table.

**Result:** User records stayed as `subscriptionPlan: 'free_trial'` even after subscribing.

### Bug #3: Trial Detection Logic
**Issue:** The usage API was checking `trialEndsAt` date even for paid subscribers:
```typescript
const isTrialActive = usage.planType === 'free_trial' || (user.trialEndsAt && new Date() < user.trialEndsAt)
```

**Result:** Even after fixing the usage period, paid subscribers with a future `trialEndsAt` date showed as "on trial".

---

## Enterprise-Grade Fixes Applied

### Fix #1: Webhook Now Properly Handles Trial Upgrades
**File:** `/src/app/api/webhooks/stripe/route.ts`

**What Changed:**
- Detects when user is upgrading from trial (`subscriptionPlan === 'free_trial'`)
- **Deactivates ALL existing active periods** (prevents duplicates)
- **Creates clean new billing period** using `startNewBillingPeriod()`
- For existing paid users (plan changes), still uses `updateCurrentPeriodLimits()`

**Code:**
```typescript
const isUpgradingFromTrial = user?.subscriptionPlan === 'free_trial'

if (isUpgradingFromTrial) {
  // Deactivate ALL existing trial periods
  await prisma.usagePeriod.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false, updatedAt: new Date() }
  })

  // Start fresh billing period for paid subscription
  await startNewBillingPeriod(userId, subscription.id, priceId, periodStart, periodEnd, addonPriceIds)
}
```

### Fix #2: Update Subscription Now Sets Plan ID
**File:** `/src/lib/billing/subscription.ts`

**What Changed:**
```typescript
const planEntitlement = getPlanFromPriceId(priceId)
const subscriptionPlan = planEntitlement?.planId || 'starter'

await prisma.user.update({
  where: { id: userId },
  data: {
    subscriptionPlan, // NEW: Set correct plan (starter, pro, power)
    subscriptionStatus: status,
    // ... other fields
  }
})
```

### Fix #3: Trial Detection Only Checks Plan Type
**File:** `/src/app/api/plans/usage/route.ts`

**What Changed:**
```typescript
// OLD: const isTrialActive = usage.planType === 'free_trial' || (user.trialEndsAt && new Date() < user.trialEndsAt)

// NEW: Only check plan type, ignore trialEndsAt for paid users
const isTrialActive = usage.planType === 'free_trial'
```

### Fix #4: Defensive Safeguard Against Multiple Active Periods
**File:** `/src/lib/billing/usageTracking.ts`

**What Changed:**
`getCurrentUsagePeriod()` now detects and auto-fixes multiple active periods:

```typescript
if (activePeriods.length > 1) {
  console.warn(`User has ${activePeriods.length} active periods! Cleaning up...`)
  const [mostRecent, ...extras] = activePeriods

  // Deactivate all extras
  await prisma.usagePeriod.updateMany({
    where: { id: { in: extras.map(p => p.id) } },
    data: { isActive: false }
  })

  return mostRecent
}
```

This provides **automatic self-healing** if the bug ever occurs again.

### Fix #5: Update Limits Now Sets isTrial False
**File:** `/src/lib/billing/usageTracking.ts`

**What Changed:**
```typescript
await prisma.usagePeriod.update({
  where: { id: period.id },
  data: {
    // ... other fields
    isTrial: false, // NEW: Always false for paid subscriptions
  }
})
```

---

## How It Works Now

### New User Registration
1. User signs up → `subscriptionPlan: 'free_trial'`, `trialEndsAt: +24 hours`
2. UsagePeriod created with `planType: 'free_trial'`, `isTrial: true`
3. Dashboard shows: **"Trial - 1 days remaining"**

### User Upgrades to Paid
1. User completes Stripe checkout
2. Webhook detects `subscriptionPlan === 'free_trial'` → **upgrade detected**
3. Webhook:
   - Updates User: `subscriptionPlan: 'starter'`, `subscriptionStatus: 'active'`
   - **Deactivates ALL active periods**
   - **Creates NEW period**: `planType: 'starter'`, `isTrial: false`
4. Dashboard shows: **"Starter Plan - Active Subscription"**

### Existing Paid User Changes Plan
1. User changes from Starter to Pro in billing portal
2. Webhook detects `subscriptionPlan !== 'free_trial'` → **plan change**
3. Webhook:
   - Updates User: `subscriptionPlan: 'pro'`
   - Updates CURRENT period limits: `planType: 'pro'`, new limits
4. Dashboard shows: **"Pro Plan - Active Subscription"**

---

## Data Migration Applied

For existing users affected by this bug, a one-time data fix was applied:

1. Updated User table: `subscriptionPlan: 'free_trial'` → `'starter'`
2. Deactivated all duplicate active periods
3. Created clean new usage period with correct plan data

---

## Testing Checklist

- [x] New user registration creates trial properly
- [x] Trial user upgrading to paid shows "Active Subscription"
- [x] No duplicate active periods after upgrade
- [x] Paid user changing plans updates correctly
- [x] Defensive safeguard catches any future duplicates
- [x] Trial display only shows for `planType: 'free_trial'`

---

## Impact

**Before:**
- ❌ Users with paid subscriptions showed as "on trial"
- ❌ Multiple active usage periods in database
- ❌ Incorrect usage limits displayed
- ❌ Confusing user experience

**After:**
- ✅ Paid users show correct "Active Subscription" status
- ✅ Only one active period per user
- ✅ Correct usage limits based on plan
- ✅ Clear separation between trial and paid states
- ✅ Self-healing if duplicates detected

---

## Files Modified

1. `/src/app/api/webhooks/stripe/route.ts` - Webhook upgrade logic
2. `/src/lib/billing/subscription.ts` - Set subscriptionPlan field
3. `/src/app/api/plans/usage/route.ts` - Fix trial detection
4. `/src/lib/billing/usageTracking.ts` - Defensive safeguard + isTrial flag

---

## Future Considerations

1. Consider setting `trialEndsAt: null` when user subscribes (cleanup)
2. Add database constraint to prevent multiple active periods per user
3. Add monitoring/alerts for duplicate active periods
4. Consider adding migration to clean up historical duplicate periods
