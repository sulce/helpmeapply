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

    console.log('🕐 Checking users for automated job scanning...')
    
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

    for (const profile of usersWithAutoScan) {
      const settings = profile.autoApplySettings!
      const scanFrequencyMs = settings.scanFrequencyHours * 60 * 60 * 1000
      
      // Check if enough time has passed since last scan
      const shouldScan = !settings.updatedAt || 
        (currentTime.getTime() - settings.updatedAt.getTime()) >= scanFrequencyMs

      if (shouldScan) {
        // Queue job scan for this specific user
        await jobQueue.add(JobType.USER_JOB_SCAN, {
          userId: profile.userId,
          profileId: profile.id,
          timestamp: currentTime.toISOString(),
          source: 'auto_scan',
          scanFrequency: settings.scanFrequencyHours
        })

        scansQueued++
        console.log(`✅ Queued job scan for user ${profile.user.email} (every ${settings.scanFrequencyHours}h)`)
      }
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