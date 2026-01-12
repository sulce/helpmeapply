/**
 * Customer Portal API Endpoint
 * 
 * Creates Stripe Customer Portal sessions for subscription management.
 * Allows users to update payment methods, view invoices, and cancel subscriptions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCustomerPortalSession, ensureStripeCustomer } from '@/lib/billing'
import { z } from 'zod'

// Request validation schema
const portalSchema = z.object({
  returnUrl: z.string().url('Invalid return URL'),
})

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = portalSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { returnUrl } = validation.data
    const userId = session.user.id

    // Ensure user has Stripe customer
    const customerId = await ensureStripeCustomer(
      userId,
      session.user.email!,
      session.user.name || undefined
    )

    if (!customerId) {
      return NextResponse.json(
        { error: 'Stripe is not configured or customer creation failed' },
        { status: 500 }
      )
    }

    // Create customer portal session
    const portalSession = await createCustomerPortalSession(customerId, returnUrl)

    // Return portal URL for redirect
    return NextResponse.json({
      success: true,
      portalUrl: portalSession.url,
    })

  } catch (error) {
    console.error('Customer portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    )
  }
}

// Only POST method allowed
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}