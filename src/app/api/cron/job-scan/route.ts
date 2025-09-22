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

    console.log('🕐 Starting automated job scan...')
    
    // Add automated job scan to queue
    await jobQueue.add(JobType.AUTOMATED_JOB_SCAN, {
      timestamp: new Date().toISOString(),
      source: 'cron'
    })

    console.log('✅ Automated job scan queued successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Automated job scan initiated',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error in automated job scan cron:', error)
    return NextResponse.json({ 
      error: 'Failed to start job scan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}