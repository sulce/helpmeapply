import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobScanner } from '@/lib/jobScanner'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await jobScanner.scanAndProcessJobs(session.user.id)
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      applied: result.applied,
      message: `Processed ${result.processed} jobs, applied to ${result.applied} positions`,
    })
  } catch (error) {
    console.error('Error in job scan:', error)
    
    if (error instanceof Error && error.message.includes('already in progress')) {
      return NextResponse.json(
        { error: 'Job scanning is already in progress' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to scan jobs' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = await jobScanner.getJobQueueStatus(session.user.id)
    
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting job queue status:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}