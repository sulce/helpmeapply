import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/jobQueue/JobQueue'
import { JobType } from '@/lib/jobQueue/types'

export async function GET(request: NextRequest) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧹 Starting cleanup tasks...')
    
    // Add cleanup jobs to queue
    const cleanupJobs = [
      JobType.CLEANUP_EXPIRED_REVIEWS,
      JobType.CLEANUP_EXPIRED_NOTIFICATIONS
    ]

    for (const jobType of cleanupJobs) {
      await jobQueue.addJob(jobType, {
        timestamp: new Date().toISOString(),
        source: 'cron'
      })
    }

    console.log('✅ Cleanup tasks queued successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cleanup tasks initiated',
      jobs: cleanupJobs,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error in cleanup cron:', error)
    return NextResponse.json({ 
      error: 'Failed to start cleanup tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}