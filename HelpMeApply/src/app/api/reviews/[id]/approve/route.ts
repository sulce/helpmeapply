import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobNotificationService } from '@/lib/jobNotificationService'
import { z } from 'zod'

const approveSchema = z.object({
  userNotes: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { userNotes } = approveSchema.parse(body)
    const { id } = await params

    const review = await jobNotificationService.approveApplication(
      id,
      session.user.id,
      userNotes
    )

    return NextResponse.json({
      success: true,
      data: review,
      message: `Application approved for ${review.job.title} at ${review.job.company}`
    })

  } catch (error) {
    console.error('Application approval error:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Review not found or already processed' },
        { status: 404 }
      )
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to approve application' },
      { status: 500 }
    )
  }
}