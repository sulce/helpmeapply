import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobScheduler } from '@/lib/jobQueue/scheduler'
import { z } from 'zod'

const cleanupSchema = z.object({
  olderThanDays: z.number().min(1).max(365).optional().default(7),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // For now, allow any authenticated user to trigger cleanup
    // In production, you might want to restrict this to admin users only
    const body = await req.json()
    const { olderThanDays } = cleanupSchema.parse(body)

    const deletedCount = await jobScheduler.cleanupQueue(olderThanDays)

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        olderThanDays,
      },
      message: `Cleaned up ${deletedCount} old job records`
    })

  } catch (error) {
    console.error('Queue cleanup error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to cleanup queue' },
      { status: 500 }
    )
  }
}