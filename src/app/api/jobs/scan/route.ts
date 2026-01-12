import { NextRequest, NextResponse } from 'next/server'
import { withSubscription } from '@/lib/billing'
import { queueManager } from '@/lib/queue/QueueManager'

export const POST = withSubscription(async (req: NextRequest, { user }) => {
  try {
    // ChatGPT Specification: enqueueJob() interface - business logic agnostic
    // This uses the abstracted queue interface, can be Database/Redis/SQS
    const jobId = await queueManager.enqueueUserJobScan(user.id)

    // API returns immediately - no blocking on AI or long processing
    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'queued',
        message: 'Job scanning queued for background processing. Jobs will appear as they are found and analyzed.'
      }
    })

  } catch (error) {
    console.error('Job scan error:', error)
    
    if (error instanceof Error && error.message.includes('already in progress')) {
      return NextResponse.json(
        { error: 'Job scanning is already in progress. Please wait.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to start job scan' },
      { status: 500 }
    )
  }
})

export const GET = withSubscription(async (req: NextRequest, { user }) => {
  try {
    // Get queue metrics using abstracted interface
    const metrics = await queueManager.getMetrics()

    return NextResponse.json({
      success: true,
      data: {
        isScanning: metrics.processing > 0,
        pendingJobs: metrics.pending,
        processingJobs: metrics.processing,
        failedJobs: metrics.failed,
        completedJobs: metrics.completed,
        activeWorkers: metrics.workers
      }
    })

  } catch (error) {
    console.error('Job queue status error:', error)
    return NextResponse.json(
      { error: 'Failed to get job queue status' },
      { status: 500 }
    )
  }
})