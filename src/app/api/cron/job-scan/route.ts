import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/jobQueue/JobQueue'
import { JobType } from '@/lib/jobQueue/types'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Daily job scan check - Running for all users with auto-scan enabled...')
    
    // Get all users with auto-scan enabled  
    const usersWithAutoScan = await prisma.profile.findMany({
      where: {
        autoApplySettings: {
          isEnabled: true,
          autoScanEnabled: true
        }
      },
      include: {
        autoApplySettings: true,
        user: true
      }
    })

    console.log(`Found ${usersWithAutoScan.length} users with auto-scan enabled`)

    let scansQueued = 0
    const currentTime = new Date()

    // Since we run daily, scan all users with auto-scan enabled
    // Users control frequency via their settings
    for (const profile of usersWithAutoScan) {
      const settings = profile.autoApplySettings!
      
      // Queue job scan for this user (let the job handler check frequency)
      await jobQueue.addJob(JobType.USER_JOB_SCAN, {
        userId: profile.userId,
        profileId: profile.id,
        timestamp: currentTime.toISOString(),
        source: 'daily_auto_scan',
        userScanFrequency: settings.scanFrequencyHours,
        runDailyCheck: true
      })

      scansQueued++
      console.log(`✅ Queued daily scan check for user ${profile.user.email} (user frequency: ${settings.scanFrequencyHours}h)`)
    }

    console.log(`✅ ${scansQueued} job scans queued successfully`)
    
    return NextResponse.json({ 
      success: true, 
      message: `${scansQueued} user job scans initiated`,
      usersChecked: usersWithAutoScan.length,
      scansQueued,
      timestamp: currentTime.toISOString()
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