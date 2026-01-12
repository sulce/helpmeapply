/**
 * Billing Management Page
 * 
 * Displays subscription status, pricing plans, and provides access
 * to Stripe Customer Portal for subscription management.
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Sidebar } from '@/components/ui/Sidebar'
import { 
  CreditCard, 
  Check, 
  X, 
  AlertTriangle,
  Calendar,
  DollarSign,
  ExternalLink,
  Zap,
  Brain,
  BarChart3,
  Infinity,
  Users,
  CheckCircle,
  ArrowLeft
} from 'lucide-react'
import { getPlanFromPriceId, PRICE_ID_TO_PLAN } from '@/lib/entitlements'

interface SubscriptionStatus {
  hasAccess: boolean
  isActive: boolean
  isInGracePeriod: boolean
  subscriptionStatus: string | null
  priceId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
}

interface UsageData {
  currentPlan: string
  planTitle: string
  hasInterviewAddon: boolean
  isTrialActive: boolean
  hasActiveSubscription: boolean
  autoApplications: {
    used: number
    limit: number
    remaining: number
    percentageUsed: number
  }
  mockInterviews: {
    used: number
    limit: number
    remaining: number
    percentageUsed: number
  }
  daysRemainingInPeriod: number
  nextReset: string | null
}

// Plan icons mapping
const PLAN_ICONS: Record<string, React.ComponentType<any>> = {
  free_trial: Users,
  starter: CheckCircle,
  pro: Zap,
  power: BarChart3,
  interview_addon: Brain
}

interface StripePlan {
  id: string
  amount: number
  currency: string
  interval: string | null
  formatted_amount: string
  formatted_interval: string
  product_name: string
  product_description: string
}

export default function BillingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [stripePlans, setStripePlans] = useState<StripePlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session?.user?.id) {
      fetchSubscriptionStatus()
      fetchUsageData()
      fetchStripePlans()
    }
  }, [session, status, router])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/billing/status')
      if (response.ok) {
        const data = await response.json()
        setSubscriptionStatus(data.subscription)
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsageData = async () => {
    try {
      const response = await fetch('/api/plans/usage')
      if (response.ok) {
        const data = await response.json()
        setUsageData(data.usage)
      }
    } catch (error) {
      console.error('Error fetching usage data:', error)
    }
  }

  const fetchStripePlans = async () => {
    try {
      const response = await fetch('/api/stripe/prices')
      if (response.ok) {
        const data = await response.json()
        setStripePlans(data.prices || [])
      }
    } catch (error) {
      console.error('Error fetching Stripe plans:', error)
      // Fall back to empty array if Stripe is not configured
      setStripePlans([])
    }
  }

  const handleSubscribe = async (priceId: string) => {
    setActionLoading(priceId)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.checkoutUrl
      } else {
        const errorData = await response.json()
        console.error('Checkout error response:', errorData)
        throw new Error(errorData.details || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start subscription process'
      alert(`Failed to start subscription process.\n\nError: ${errorMessage}\n\nPlease check the console for more details.`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setActionLoading('portal')
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.portalUrl
      } else {
        throw new Error('Failed to create portal session')
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('Failed to access billing portal. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: SubscriptionStatus) => {
    if (status.isActive) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    }
    if (status.isInGracePeriod) {
      return <Badge className="bg-yellow-100 text-yellow-800">Payment Overdue</Badge>
    }
    if (status.subscriptionStatus === 'canceled') {
      return <Badge className="bg-gray-100 text-gray-800">Canceled</Badge>
    }
    return <Badge variant="outline">No Subscription</Badge>
  }

  const getPlanIcon = (planId: string) => {
    const IconComponent = PLAN_ICONS[planId] || CheckCircle
    return <IconComponent className="h-6 w-6" />
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Get plan details from entitlements for a Stripe price
  const getPlanDetailsFromPrice = (priceId: string) => {
    const planEntitlement = getPlanFromPriceId(priceId)
    if (!planEntitlement) return null

    // Map plan IDs to features
    const planFeatures: Record<string, string[]> = {
      starter: [
        "20 auto applications per month",
        "AI-powered job matching",
        "Resume customization",
        "Cover letter generation",
        "Advanced analytics"
      ],
      pro: [
        "60 auto applications per month", 
        "10 mock interviews per month",
        "AI-powered job matching",
        "Resume customization",
        "Cover letter generation",
        "Priority processing",
        "Advanced analytics"
      ],
      power: [
        "120 auto applications per month",
        "20 mock interviews per month", 
        "AI-powered job matching",
        "Resume customization",
        "Cover letter generation",
        "Priority processing",
        "Advanced optimization",
        "Advanced analytics"
      ],
      interview_addon: [
        "5 additional mock interviews per month",
        "AI-powered interview preparation",
        "Personalized feedback"
      ]
    }

    return {
      ...planEntitlement,
      features: planFeatures[planEntitlement.planId] || [],
      isPopular: planEntitlement.planId === 'pro'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <Sidebar>
      <div className="p-3 lg:p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center mb-4">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              size="sm"
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
            <p className="text-gray-600 mt-2">Manage your subscription and billing information</p>
          </div>

          {/* Current Plan and Usage */}
          {usageData && (
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Current Plan Status */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getPlanIcon(usageData.currentPlan)}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{usageData.planTitle}</h2>
                    <p className="text-sm text-gray-600">
                      {usageData.isTrialActive ? `Trial Active (${usageData.daysRemainingInPeriod} days remaining)` : 'Active Subscription'}
                      {usageData.hasInterviewAddon && ' + Interview Add-On'}
                    </p>
                  </div>
                </div>
                
                {subscriptionStatus?.hasAccess && (
                  <Button
                    onClick={handleManageBilling}
                    isLoading={actionLoading === 'portal'}
                    variant="outline"
                    size="sm"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                )}
              </div>

              {usageData.daysRemainingInPeriod > 0 && (
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Calendar className="h-4 w-4 mr-1" />
                  {usageData.daysRemainingInPeriod} days remaining in current period
                </div>
              )}

              {subscriptionStatus?.isInGracePeriod && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Payment Issue</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your subscription payment failed. Please update your payment method.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Usage Statistics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h3>
              
              {/* Auto Applications Usage */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Auto Applications</span>
                  <span className="text-sm text-gray-600">
                    {usageData.autoApplications.used} / {usageData.autoApplications.limit === Number.POSITIVE_INFINITY ? '∞' : usageData.autoApplications.limit}
                  </span>
                </div>
                {usageData.autoApplications.limit !== Number.POSITIVE_INFINITY && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUsageColor(usageData.autoApplications.percentageUsed)}`}
                      style={{ width: `${Math.min(100, usageData.autoApplications.percentageUsed)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Mock Interviews Usage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Mock Interviews</span>
                  <span className="text-sm text-gray-600">
                    {usageData.mockInterviews.used} / {usageData.mockInterviews.limit === 0 ? 'Not included' : usageData.mockInterviews.limit}
                  </span>
                </div>
                {usageData.mockInterviews.limit > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUsageColor(usageData.mockInterviews.percentageUsed)}`}
                      style={{ width: `${Math.min(100, usageData.mockInterviews.percentageUsed)}%` }}
                    />
                  </div>
                )}
                {usageData.mockInterviews.limit === 0 && (
                  <div className="text-xs text-gray-500">Available with Pro/Power plans or Interview Add-On</div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Pricing Plans */}
        {(!subscriptionStatus?.hasAccess || (usageData && usageData.isTrialActive)) && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
              <p className="text-gray-600">Select the plan that best fits your job search needs</p>
            </div>

            {/* Main Plans from Stripe */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stripePlans
                .filter(stripePrice => {
                  const planDetails = getPlanDetailsFromPrice(stripePrice.id)
                  return planDetails && !planDetails.planId.includes('addon')
                })
                .map((stripePrice) => {
                  const planDetails = getPlanDetailsFromPrice(stripePrice.id)
                  if (!planDetails) return null

                  return (
                    <Card key={stripePrice.id} className={`p-6 relative ${planDetails.isPopular ? 'ring-2 ring-blue-500' : ''}`}>
                      {planDetails.isPopular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-blue-100 text-blue-800 px-3 py-1">Most Popular</Badge>
                        </div>
                      )}
                      
                      <div className="text-center mb-4">
                        <div className="flex justify-center mb-2">
                          {getPlanIcon(planDetails.planId)}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{planDetails.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{planDetails.description}</p>
                        
                        <div className="flex items-baseline justify-center">
                          <span className="text-3xl font-bold text-gray-900">{stripePrice.formatted_amount}</span>
                          <span className="text-gray-600 ml-1">/{stripePrice.formatted_interval}</span>
                        </div>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {planDetails.features.map((feature, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="space-y-2">
                        <Button
                          onClick={() => handleSubscribe(stripePrice.id)}
                          isLoading={actionLoading === stripePrice.id}
                          className="w-full"
                          variant={planDetails.isPopular ? 'default' : 'outline'}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Subscribe {stripePrice.formatted_interval || 'Now'}
                        </Button>
                      </div>
                    </Card>
                  )
                })}
            </div>

            {/* Add-ons from Stripe */}
            {stripePlans.some(price => getPlanDetailsFromPrice(price.id)?.planId.includes('addon')) && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">Add-Ons</h3>
                  <p className="text-gray-600 text-sm">Enhance your plan with additional features</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {stripePlans
                    .filter(stripePrice => {
                      const planDetails = getPlanDetailsFromPrice(stripePrice.id)
                      return planDetails && planDetails.planId.includes('addon')
                    })
                    .map((stripePrice) => {
                      const planDetails = getPlanDetailsFromPrice(stripePrice.id)
                      if (!planDetails) return null

                      return (
                        <Card key={stripePrice.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getPlanIcon(planDetails.planId)}
                              <div>
                                <h4 className="font-semibold text-gray-900">{planDetails.name}</h4>
                                <p className="text-sm text-gray-600">{planDetails.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">{stripePrice.formatted_amount}</div>
                              <div className="text-xs text-gray-500">/{stripePrice.formatted_interval}</div>
                            </div>
                          </div>
                          
                          <ul className="mt-3 space-y-1">
                            {planDetails.features.map((feature, index) => (
                              <li key={index} className="flex items-center text-xs text-gray-600">
                                <Check className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          
                          <Button
                            onClick={() => handleSubscribe(stripePrice.id)}
                            isLoading={actionLoading === stripePrice.id}
                            size="sm"
                            variant="outline"
                            className="w-full mt-3"
                          >
                            Add to Plan
                          </Button>
                        </Card>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Access Status Message */}
        {subscriptionStatus?.hasAccess && usageData && !usageData.isTrialActive && (
          <Card className="p-6 text-center">
            <div className="flex justify-center mb-4">
              {getPlanIcon(usageData.currentPlan)}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">You're all set!</h2>
            <p className="text-gray-600 mb-4">
              You have access to your {usageData.planTitle} features. Use the "Manage Billing" button above to update your subscription.
            </p>
            
            {/* Quick Feature Summary */}
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {usageData.autoApplications.limit === Number.POSITIVE_INFINITY ? '∞' : usageData.autoApplications.limit}
                </div>
                <div className="text-gray-600">Auto Applications/month</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {usageData.mockInterviews.limit || 'Add-on required'}
                </div>
                <div className="text-gray-600">Mock Interviews/month</div>
              </div>
            </div>
          </Card>
        )}
        </div>
      </div>
    </Sidebar>
  )
}