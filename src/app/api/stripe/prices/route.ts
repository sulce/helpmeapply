/**
 * Stripe Prices API
 * 
 * Fetches active Stripe prices server-side and exposes human-readable pricing data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe, isStripeConfigured } from '@/lib/billing/stripe'

export async function GET(request: NextRequest) {
  try {
    if (!isStripeConfigured || !stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    // Fetch all active prices with their products
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product']
    })

    const formattedPrices = prices.data.map(price => {
      const product = price.product as any // Stripe product object
      
      return {
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval || null,
        interval_count: price.recurring?.interval_count || null,
        product_name: product.name,
        product_description: product.description,
        metadata: price.metadata,
        product_metadata: product.metadata,
        // Human-readable amount
        formatted_amount: price.unit_amount 
          ? `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`
          : 'Free',
        // Human-readable interval
        formatted_interval: price.recurring 
          ? `${price.recurring.interval_count > 1 ? price.recurring.interval_count + ' ' : ''}${price.recurring.interval}${price.recurring.interval_count > 1 ? 's' : ''}`
          : 'one-time'
      }
    })

    return NextResponse.json({
      success: true,
      prices: formattedPrices
    })

  } catch (error) {
    console.error('Error fetching Stripe prices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing data' },
      { status: 500 }
    )
  }
}