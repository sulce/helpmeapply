/**
 * Server-side subscription guard for pages
 * Use this in server components to enforce subscription access
 */

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserSubscriptionStatus } from './subscription'

export async function enforceSubscriptionAccess() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  try {
    const subscriptionStatus = await getUserSubscriptionStatus(session.user.id)

    // Auto-migrate legacy users to 7-day trial
    if (!subscriptionStatus.subscriptionPlan && !subscriptionStatus.subscriptionStatus) {
      console.log(`Auto-migrating legacy user ${session.user.id} to 7-day free trial`)
      const { initializeUserTrial } = await import('@/lib/billing/usageTracking')
      await initializeUserTrial(session.user.id, 7) // 7 days for legacy users
      // Re-fetch subscription status after migration
      const updatedStatus = await getUserSubscriptionStatus(session.user.id)
      return {
        user: session.user,
        subscription: updatedStatus
      }
    }

    if (!subscriptionStatus.hasAccess) {
      redirect('/billing?reason=expired')
    }

    return {
      user: session.user,
      subscription: subscriptionStatus
    }
  } catch (error) {
    console.error('Subscription check error:', error)
    redirect('/billing?reason=error')
  }
}

export async function checkSubscriptionAccessForPage(userId: string) {
  try {
    const subscriptionStatus = await getUserSubscriptionStatus(userId)
    return subscriptionStatus.hasAccess
  } catch (error) {
    console.error('Subscription check error:', error)
    return false
  }
}
