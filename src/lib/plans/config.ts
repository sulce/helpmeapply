/**
 * Subscription Plan Configuration
 * 
 * Centralized plan definitions with feature limits and pricing.
 * Configurable system to allow future plan changes.
 */

export interface PlanFeatures {
  autoApplicationsPerMonth: number
  mockInterviewsPerMonth: number
  hasInterviewPreparation: boolean
  hasAdvancedAnalytics: boolean
  hasPriorityProcessing: boolean
  hasAdvancedOptimization: boolean
  trialExtensionHours: number
}

export interface PlanConfig {
  id: string
  title: string
  description: string
  price?: string
  interval?: 'month' | 'year' | 'trial'
  stripeIds: {
    monthly?: string
    yearly?: string
  }
  features: string[]
  limits: PlanFeatures
  popular?: boolean
  isAddon?: boolean
}

// Centralized plan configuration - easily adjustable for future changes
export const PRICING_PLANS: Record<string, PlanConfig> = {
  free_trial: {
    id: 'free_trial',
    title: 'Free Trial',
    description: '24-hour free trial to explore core features. Extend by inviting friends.',
    interval: 'trial',
    stripeIds: {}, // No Stripe IDs for trial
    features: [
      'Access core platform features',
      'Extend trial by 24 hours per successful referral',
      'Referred friends get their own 24-hour trial',
      'Payment required after trial ends'
    ],
    limits: {
      autoApplicationsPerMonth: 5, // Limited trial usage
      mockInterviewsPerMonth: 1,
      hasInterviewPreparation: true, // Allow trial of interview features
      hasAdvancedAnalytics: false,
      hasPriorityProcessing: false,
      hasAdvancedOptimization: false,
      trialExtensionHours: 24
    }
  },

  starter: {
    id: 'starter',
    title: 'Starter Plan',
    description: 'Access the full platform after free trial.',
    price: '$39',
    interval: 'month',
    stripeIds: {
      monthly: 'price_1Snuu9Eqjyc8yXsXFLYlCf6L', // Actual Stripe Price ID
      yearly: 'price_starter_yearly' // Add yearly price ID when available
    },
    features: [
      'CV tailoring and cover letter generation',
      'Job matching and application management',
      'Manual Apply and Auto Apply (up to 20 Auto Applications per month)',
      'Manual Apply does not count toward Auto Application allowance',
      'Interview Preparation not included unless added separately'
    ],
    limits: {
      autoApplicationsPerMonth: 20,
      mockInterviewsPerMonth: 0, // Not included
      hasInterviewPreparation: false,
      hasAdvancedAnalytics: true,
      hasPriorityProcessing: false,
      hasAdvancedOptimization: false,
      trialExtensionHours: 0
    }
  },

  pro: {
    id: 'pro',
    title: 'Pro Plan',
    description: 'For active jobseekers seeking deeper support and faster momentum.',
    price: '$79',
    interval: 'month',
    popular: true,
    stripeIds: {
      monthly: 'price_1SnuufEqjyc8yXsXaBMhtdK3', // Actual Stripe Price ID
      yearly: 'price_pro_yearly' // Add yearly price ID when available
    },
    features: [
      'Everything in Starter plan',
      'Up to 60 Auto Applications per month',
      'Interview Preparation included: AI mock interviews, role-specific questions, structured feedback, guidance on improving answers'
    ],
    limits: {
      autoApplicationsPerMonth: 60,
      mockInterviewsPerMonth: 10,
      hasInterviewPreparation: true,
      hasAdvancedAnalytics: true,
      hasPriorityProcessing: true,
      hasAdvancedOptimization: false,
      trialExtensionHours: 0
    }
  },

  power: {
    id: 'power',
    title: 'Power Plan',
    description: 'For intensive or time-sensitive job searches.',
    price: '$149',
    interval: 'month',
    stripeIds: {
      monthly: 'price_1SnuvMEqjyc8yXsXCn4SJrwy', // Actual Stripe Price ID
      yearly: 'price_power_yearly' // Add yearly price ID when available
    },
    features: [
      'Everything in Pro plan',
      'Up to 120 Auto Applications per month (subject to fair use)',
      'Highest priority processing and advanced optimisation features as they become available'
    ],
    limits: {
      autoApplicationsPerMonth: 120,
      mockInterviewsPerMonth: 20,
      hasInterviewPreparation: true,
      hasAdvancedAnalytics: true,
      hasPriorityProcessing: true,
      hasAdvancedOptimization: true,
      trialExtensionHours: 0
    }
  },

  interview_addon: {
    id: 'interview_addon',
    title: 'Interview Preparation Add-On',
    description: 'Add to Starter plan for AI-powered mock interviews.',
    price: '$19',
    interval: 'month',
    isAddon: true,
    stripeIds: {
      monthly: 'price_1SnuvtEqjyc8yXsXrgvM4iqj' // Actual Stripe Price ID
    },
    features: [
      'Up to five AI powered mock interviews per billing period',
      'Unused mock interviews do not roll over'
    ],
    limits: {
      autoApplicationsPerMonth: 0, // Addon doesn't affect auto applications
      mockInterviewsPerMonth: 5,
      hasInterviewPreparation: true,
      hasAdvancedAnalytics: false,
      hasPriorityProcessing: false,
      hasAdvancedOptimization: false,
      trialExtensionHours: 0
    }
  }
}

// Helper functions for plan management
export function getPlanConfig(planId: string): PlanConfig | null {
  return PRICING_PLANS[planId] || null
}

export function getPlanLimits(planId: string, hasAddon = false): PlanFeatures {
  const plan = getPlanConfig(planId)
  if (!plan) {
    // Return minimal limits for unknown plans
    return PRICING_PLANS.free_trial.limits
  }

  let limits = { ...plan.limits }

  // If user has interview addon and base plan doesn't include interviews
  if (hasAddon && !limits.hasInterviewPreparation) {
    const addonLimits = PRICING_PLANS.interview_addon.limits
    limits.mockInterviewsPerMonth = addonLimits.mockInterviewsPerMonth
    limits.hasInterviewPreparation = true
  }

  return limits
}

export function getAllPlans(): PlanConfig[] {
  return Object.values(PRICING_PLANS).filter(plan => !plan.isAddon)
}

export function getAddons(): PlanConfig[] {
  return Object.values(PRICING_PLANS).filter(plan => plan.isAddon)
}

export function canUserAccessFeature(
  userPlan: string,
  hasAddon: boolean,
  feature: keyof PlanFeatures
): boolean {
  const limits = getPlanLimits(userPlan, hasAddon)
  return !!limits[feature]
}

export function getUserQuotaRemaining(
  used: number,
  limit: number
): { remaining: number; percentage: number } {
  const remaining = Math.max(0, limit - used)
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0
  
  return { remaining, percentage }
}