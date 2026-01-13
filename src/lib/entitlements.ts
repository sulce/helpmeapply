/**
 * Plan Entitlement System
 * 
 * Maps Stripe price_id to application plans and defines feature limits.
 * This is the source of truth for what users can do based on their subscription.
 */

export interface PlanLimits {
  autoApplicationsPerMonth: number
  mockInterviewsPerMonth: number
  hasAdvancedAnalytics: boolean
  hasPriorityProcessing: boolean
  hasAdvancedOptimization: boolean
}

export interface PlanEntitlement {
  planId: string
  name: string
  description: string
  limits: PlanLimits
}

// Map Stripe Price IDs to plan entitlements
export const PRICE_ID_TO_PLAN: Record<string, PlanEntitlement> = {
  // Free Trial (internal - no Stripe price)
  'free_trial': {
    planId: 'free_trial',
    name: 'Free Trial',
    description: '24-hour free trial to explore core features',
    limits: {
      autoApplicationsPerMonth: 5,
      mockInterviewsPerMonth: 1,
      hasAdvancedAnalytics: false,
      hasPriorityProcessing: false,
      hasAdvancedOptimization: false,
    }
  },

  // Starter Plan
  'price_1Sp1XkAeDCtQUmgWkGqExwkd': {
    planId: 'starter',
    name: 'Starter Plan',
    description: 'Access the full platform after free trial',
    limits: {
      autoApplicationsPerMonth: 20,
      mockInterviewsPerMonth: 0, // Not included in starter
      hasAdvancedAnalytics: true,
      hasPriorityProcessing: false,
      hasAdvancedOptimization: false,
    }
  },

  // Pro Plan  
  'price_1Sp1ZuAeDCtQUmgWhCFwuyBc': {
    planId: 'pro',
    name: 'Pro Plan',
    description: 'For active jobseekers seeking deeper support',
    limits: {
      autoApplicationsPerMonth: 60,
      mockInterviewsPerMonth: 10,
      hasAdvancedAnalytics: true,
      hasPriorityProcessing: true,
      hasAdvancedOptimization: false,
    }
  },

  // Power Plan
  'price_1Sp1bHAeDCtQUmgWcgAPnXYG': {
    planId: 'power',
    name: 'Power Plan',
    description: 'For intensive or time-sensitive job searches',
    limits: {
      autoApplicationsPerMonth: 120,
      mockInterviewsPerMonth: 20,
      hasAdvancedAnalytics: true,
      hasPriorityProcessing: true,
      hasAdvancedOptimization: true,
    }
  },

  // Interview Preparation Add-On
  'price_1Sp1cvAeDCtQUmgWn0DbM8Jy': {
    planId: 'interview_addon',
    name: 'Interview Preparation Add-On',
    description: 'Add to Starter plan for AI-powered mock interviews',
    limits: {
      autoApplicationsPerMonth: 0, // Add-on doesn't affect auto applications
      mockInterviewsPerMonth: 5,
      hasAdvancedAnalytics: false,
      hasPriorityProcessing: false,
      hasAdvancedOptimization: false,
    }
  }
}

/**
 * Get plan entitlement from Stripe price ID
 */
export function getPlanFromPriceId(priceId: string): PlanEntitlement | null {
  return PRICE_ID_TO_PLAN[priceId] || null
}

/**
 * Get plan entitlement from plan ID
 */
export function getPlanById(planId: string): PlanEntitlement | null {
  return Object.values(PRICE_ID_TO_PLAN).find(plan => plan.planId === planId) || null
}

/**
 * Calculate user's effective limits considering add-ons
 */
export function calculateEffectiveLimits(
  basePriceId: string,
  addonPriceIds: string[] = []
): PlanLimits {
  const basePlan = getPlanFromPriceId(basePriceId)
  if (!basePlan) {
    // Default to free trial limits if plan not found
    return PRICE_ID_TO_PLAN['free_trial'].limits
  }

  let effectiveLimits = { ...basePlan.limits }

  // Apply add-ons
  for (const addonPriceId of addonPriceIds) {
    const addon = getPlanFromPriceId(addonPriceId)
    if (addon) {
      // Add-ons increase limits (don't replace them)
      effectiveLimits.mockInterviewsPerMonth += addon.limits.mockInterviewsPerMonth
      effectiveLimits.autoApplicationsPerMonth += addon.limits.autoApplicationsPerMonth

      // Boolean features are OR'd
      effectiveLimits.hasAdvancedAnalytics = effectiveLimits.hasAdvancedAnalytics || addon.limits.hasAdvancedAnalytics
      effectiveLimits.hasPriorityProcessing = effectiveLimits.hasPriorityProcessing || addon.limits.hasPriorityProcessing
      effectiveLimits.hasAdvancedOptimization = effectiveLimits.hasAdvancedOptimization || addon.limits.hasAdvancedOptimization
    }
  }

  return effectiveLimits
}

/**
 * Get all available price IDs
 */
export function getAllPriceIds(): string[] {
  return Object.keys(PRICE_ID_TO_PLAN).filter(id => id !== 'free_trial')
}

/**
 * Check if a price ID is an add-on
 */
export function isAddonPriceId(priceId: string): boolean {
  const plan = getPlanFromPriceId(priceId)
  return plan?.planId.includes('addon') || false
}
