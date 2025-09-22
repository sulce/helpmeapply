import { JobResult, JobType } from '../types'
import { jobNotificationService } from '../../jobNotificationService'
import { jobScanner } from '../../jobScanner'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function handleUserJobScan(payload: { userId: string }): Promise<JobResult> {
  const startTime = Date.now()
  
  try {
    console.log(`Processing user job scan for user: ${payload.userId}`)
    
    // Run job scanning for the specific user
    const results = await jobScanner.scanAndProcessJobs(payload.userId)
    
    const duration = Date.now() - startTime
    console.log(`User job scan completed in ${duration}ms: ${results.processed} processed, ${results.applied} applied`)
    
    return {
      success: true,
      data: {
        processed: results.processed,
        applied: results.applied,
        userId: payload.userId,
      },
      duration,
    }
  } catch (error) {
    console.error('User job scan error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in user job scan',
      duration: Date.now() - startTime,
    }
  }
}

export async function handleAutomatedJobScan(): Promise<JobResult> {
  const startTime = Date.now()
  
  try {
    console.log('Processing automated job scan for all active users')
    
    // Get all users with auto-apply settings enabled
    const activeUsers = await prisma.profile.findMany({
      where: {
        autoApplySettings: {
          autoScanEnabled: true,
          isEnabled: true,
        },
      },
      include: {
        user: true,
        autoApplySettings: true,
      },
    })

    console.log(`Found ${activeUsers.length} active users for automated scanning`)
    
    let totalProcessed = 0
    let totalApplied = 0
    let userResults: any[] = []

    // Process each user sequentially to avoid overwhelming the system
    for (const profile of activeUsers) {
      try {
        // Check if user hasn't been scanned recently
        const lastScan = await getLastScanTime(profile.userId)
        const scanFrequencyMs = (profile.autoApplySettings?.scanFrequencyHours || 4) * 60 * 60 * 1000
        
        if (lastScan && Date.now() - lastScan.getTime() < scanFrequencyMs) {
          console.log(`Skipping user ${profile.userId} - scanned recently`)
          continue
        }

        const results = await jobScanner.scanAndProcessJobs(profile.userId)
        
        totalProcessed += results.processed
        totalApplied += results.applied
        
        userResults.push({
          userId: profile.userId,
          email: profile.user.email,
          processed: results.processed,
          applied: results.applied,
        })

        // Update last scan time
        await updateLastScanTime(profile.userId)
        
        // Small delay between users to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (userError) {
        console.error(`Error scanning jobs for user ${profile.userId}:`, userError)
        userResults.push({
          userId: profile.userId,
          error: userError instanceof Error ? userError.message : 'Unknown error',
        })
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`Automated job scan completed in ${duration}ms: ${totalProcessed} total processed, ${totalApplied} total applied`)
    
    return {
      success: true,
      data: {
        totalProcessed,
        totalApplied,
        usersScanned: activeUsers.length,
        userResults,
      },
      duration,
    }
  } catch (error) {
    console.error('Automated job scan error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in automated job scan',
      duration: Date.now() - startTime,
    }
  }
}

export async function handleProcessJobMatches(payload: { userId: string }): Promise<JobResult> {
  const startTime = Date.now()
  
  try {
    console.log(`Processing job matches for user: ${payload.userId}`)
    
    // Process job matches and create notifications
    const results = await jobNotificationService.processJobMatches(payload.userId)
    
    const duration = Date.now() - startTime
    console.log(`Job match processing completed in ${duration}ms: ${results.processed} processed, ${results.notified} notified, ${results.autoApplied} auto-applied`)
    
    return {
      success: true,
      data: {
        processed: results.processed,
        notified: results.notified,
        autoApplied: results.autoApplied,
        userId: payload.userId,
      },
      duration,
    }
  } catch (error) {
    console.error('Process job matches error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in processing job matches',
      duration: Date.now() - startTime,
    }
  }
}

// Helper functions
async function getLastScanTime(userId: string): Promise<Date | null> {
  const lastJob = await prisma.jobQueue.findFirst({
    where: {
      userId,
      status: 'COMPLETED',
      errorMessage: {
        contains: 'user_job_scan',
      },
    },
    orderBy: {
      processedAt: 'desc',
    },
  })

  return lastJob?.processedAt || null
}

async function updateLastScanTime(userId: string): Promise<void> {
  // Create a record of the scan completion
  await prisma.jobQueue.create({
    data: {
      jobId: `scan_record_${Date.now()}`,
      userId,
      status: 'COMPLETED',
      priority: 0,
      attempts: 0,
      maxAttempts: 1,
      errorMessage: JSON.stringify({
        type: 'scan_record',
        timestamp: new Date().toISOString(),
      }),
      processedAt: new Date(),
    },
  })
}