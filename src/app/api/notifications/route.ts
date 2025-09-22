import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobNotificationService } from '@/lib/jobNotificationService'
import { z } from 'zod'

const notificationsQuerySchema = z.object({
  limit: z.number().min(1).max(50).optional(),
  offset: z.number().min(0).optional(),
  status: z.enum(['PENDING', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED', 'APPLIED']).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const queryParams = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      status: searchParams.get('status') || undefined,
    }

    const validatedParams = notificationsQuerySchema.parse(queryParams)

    const notifications = await jobNotificationService.getNotifications(
      session.user.id,
      validatedParams.limit,
      validatedParams.offset
    )

    return NextResponse.json({
      success: true,
      data: notifications
    })

  } catch (error) {
    console.error('Notifications fetch error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// Process job matches and create notifications
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const results = await jobNotificationService.processJobMatches(session.user.id)

    return NextResponse.json({
      success: true,
      data: {
        processed: results.processed,
        notified: results.notified,
        autoApplied: results.autoApplied,
        message: `Processed ${results.processed} jobs, created ${results.notified} notifications, auto-applied to ${results.autoApplied} positions`
      }
    })

  } catch (error) {
    console.error('Job matching error:', error)
    return NextResponse.json(
      { error: 'Failed to process job matches' },
      { status: 500 }
    )
  }
}