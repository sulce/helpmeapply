/**
 * Billing Status API Endpoint
 * 
 * Returns current subscription status and access information
 * for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserSubscriptionStatus } from '@/lib/billing'

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get subscription status
    const subscriptionStatus = await getUserSubscriptionStatus(session.user.id)

    return NextResponse.json({
      success: true,
      subscription: subscriptionStatus,
    })

  } catch (error) {
    console.error('Billing status error:', error)
    return NextResponse.json(
      { error: 'Failed to get billing status' },
      { status: 500 }
    )
  }
}

// Only GET method allowed
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}