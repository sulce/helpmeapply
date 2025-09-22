import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobScheduler } from '@/lib/jobQueue/scheduler'
import { z } from 'zod'

const scheduleJobSchema = z.object({
  type: z.enum(['user_job_scan', 'process_job_matches', 'generate_cover_letter', 'customize_resume', 'process_application']),
  userId: z.string().optional(),
  jobId: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const metrics = await jobScheduler.getQueueMetrics()
    const schedules = Object.fromEntries(jobScheduler.getSchedules())

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        schedules,
      }
    })

  } catch (error) {
    console.error('Queue status error:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { type, userId, jobId } = scheduleJobSchema.parse(body)

    const targetUserId = userId || session.user.id
    let jobScheduleId: string

    switch (type) {
      case 'user_job_scan':
        jobScheduleId = await jobScheduler.scheduleUserJobScan(targetUserId)
        break
      
      case 'process_job_matches':
        jobScheduleId = await jobScheduler.scheduleJobMatching(targetUserId)
        break
      
      case 'generate_cover_letter':
        if (!jobId) {
          return NextResponse.json(
            { error: 'jobId is required for cover letter generation' },
            { status: 400 }
          )
        }
        jobScheduleId = await jobScheduler.scheduleCoverLetterGeneration(targetUserId, jobId)
        break
      
      case 'customize_resume':
        if (!jobId) {
          return NextResponse.json(
            { error: 'jobId is required for resume customization' },
            { status: 400 }
          )
        }
        jobScheduleId = await jobScheduler.scheduleResumeCustomization(targetUserId, jobId)
        break
      
      case 'process_application':
        if (!jobId) {
          return NextResponse.json(
            { error: 'jobId is required for application processing' },
            { status: 400 }
          )
        }
        jobScheduleId = await jobScheduler.scheduleApplicationProcessing(targetUserId, jobId)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid job type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: jobScheduleId,
        type,
        userId: targetUserId,
      },
      message: `${type} job scheduled successfully`
    })

  } catch (error) {
    console.error('Schedule job error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to schedule job' },
      { status: 500 }
    )
  }
}