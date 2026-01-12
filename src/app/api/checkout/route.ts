/**
 * Stripe Checkout Session Creation Endpoint
 * 
 * Creates Stripe Checkout sessions for subscription purchases.
 * Backend-driven, redirect-based checkout implementation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCheckoutSession, ensureStripeCustomer } from '@/lib/billing'
import { z } from 'zod'

// Request validation schema
const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
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
    const validation = checkoutSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { priceId, successUrl, cancelUrl } = validation.data
    const userId = session.user.id

    console.log('[Checkout] Creating checkout for user:', userId)
    console.log('[Checkout] Price ID:', priceId)

    // Ensure user has Stripe customer
    const customerId = await ensureStripeCustomer(
      userId,
      session.user.email!,
      session.user.name || undefined
    )

    console.log('[Checkout] Customer ID:', customerId)

    if (!customerId) {
      throw new Error('Failed to create or retrieve Stripe customer ID')
    }

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      userId,
    })

    console.log('[Checkout] Session created:', checkoutSession.id)

    // Return checkout URL for redirect
    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    })

  } catch (error) {
    console.error('Checkout creation error:', error)

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session'

    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: errorMessage
      },
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