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

    console.log('📊 Starting daily summary generation...')
    
    // Add daily summary job to queue
    await jobQueue.addJob(JobType.SEND_DAILY_SUMMARY, {
      timestamp: new Date().toISOString(),
      source: 'cron',
      date: new Date().toISOString().split('T')[0]
    })

    console.log('✅ Daily summary queued successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Daily summary initiated',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error in daily summary cron:', error)
    return NextResponse.json({ 
      error: 'Failed to start daily summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}