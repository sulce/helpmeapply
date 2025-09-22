import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobNotificationService } from '@/lib/jobNotificationService'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const pendingReviews = await jobNotificationService.getPendingReviews(session.user.id)

    return NextResponse.json({
      success: true,
      data: pendingReviews
    })

  } catch (error) {
    console.error('Reviews fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending reviews' },
      { status: 500 }
    )
  }
}