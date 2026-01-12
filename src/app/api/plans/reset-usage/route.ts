/**
 * Usage Reset API (Cron Job Endpoint)
 * 
 * Resets monthly usage counters for all users at billing period boundaries.
 * Should be called by a cron job at the start of each billing period.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Verify this is being called by an authorized source (e.g., Vercel cron)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    
    // Find users whose billing period has ended and needs reset
    const usersToReset = await prisma.user.findMany({
      where: {
        OR: [
          // Subscription period ended
          {
            subscriptionPeriodEnd: {
              lte: now
            },
            subscriptionStatus: 'active'
          },
          // Trial ended and moved to paid plan
          {
            trialEndsAt: {
              lte: now
            },
            subscriptionPlan: {
              not: 'free_trial'
            }
          }
        ]
      },
      select: {
        id: true,
        subscriptionPlan: true,
        subscriptionPeriodEnd: true,
        trialEndsAt: true,
        autoApplicationsUsed: true,
        mockInterviewsUsed: true
      }
    })

    if (usersToReset.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users require usage reset',
        resetCount: 0
      })
    }

    // Reset usage counters for all eligible users
    const resetResult = await prisma.user.updateMany({
      where: {
        id: {
          in: usersToReset.map(user => user.id)
        }
      },
      data: {
        autoApplicationsUsed: 0,
        mockInterviewsUsed: 0,
        // Update period start for next billing cycle
        subscriptionPeriodStart: now
      }
    })

    // Log the reset for audit purposes
    console.log(`Usage counters reset for ${resetResult.count} users at ${now.toISOString()}`)

    return NextResponse.json({
      success: true,
      message: `Successfully reset usage counters for ${resetResult.count} users`,
      resetCount: resetResult.count,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Usage reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset usage counters' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}