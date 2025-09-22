import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobNotificationService } from '@/lib/jobNotificationService'
import { z } from 'zod'

const rejectSchema = z.object({
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
    const { userNotes } = rejectSchema.parse(body)
    const { id } = await params

    const review = await jobNotificationService.rejectApplication(
      id,
      session.user.id,
      userNotes
    )

    return NextResponse.json({
      success: true,
      data: review,
      message: 'Application rejected'
    })

  } catch (error) {
    console.error('Application rejection error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to reject application' },
      { status: 500 }
    )
  }
}