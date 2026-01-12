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
