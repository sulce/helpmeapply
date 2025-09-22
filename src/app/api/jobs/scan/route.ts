import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobScanner } from '@/lib/jobScanner'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Start job scanning process
    const results = await jobScanner.scanAndProcessJobs(session.user.id)

    return NextResponse.json({
      success: true,
      data: {
        processed: results.processed,
        applied: results.applied,
        message: `Processed ${results.processed} jobs, applied to ${results.applied} positions`
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
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get job queue status
    const queueStatus = await jobScanner.getJobQueueStatus(session.user.id)

    return NextResponse.json({
      success: true,
      data: queueStatus
    })

  } catch (error) {
    console.error('Job queue status error:', error)
    return NextResponse.json(
      { error: 'Failed to get job queue status' },
      { status: 500 }
    )
  }
}