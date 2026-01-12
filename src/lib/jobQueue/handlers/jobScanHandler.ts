import { JobResult, JobType } from '../types'
import { jobNotificationService } from '../../jobNotificationService'
import { jobScanner } from '../../jobScanner'
import { analyzeJobMatch } from '../../openai'
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
      type: 'user_job_scan',
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
      type: 'scan_record',
      payload: JSON.stringify({
        timestamp: new Date().toISOString(),
      }),
      userId,
      status: 'COMPLETED',
      priority: 0,
      attemptCount: 0,
      maxAttempts: 1,
      processedAt: new Date(),
    },
  })
}

// STAGE 3: Background AI analysis handler for batched processing
export async function handleAnalyzeJobMatch(payload: { jobId: string; userId: string }): Promise<JobResult> {
  const startTime = Date.now()
  
  try {
    console.log(`🤖 STAGE 3: Processing AI analysis for job ${payload.jobId}`)
    
    // Get job and profile data
    const [job, profile] = await Promise.all([
      prisma.job.findUnique({
        where: { id: payload.jobId }
      }),
      prisma.profile.findUnique({
        where: { userId: payload.userId },
        include: {
          autoApplySettings: true,
          skills: true,
        },
      })
    ])

    if (!job || !profile || !profile.autoApplySettings) {
      return {
        success: false,
        error: 'Job or profile not found',
        duration: Date.now() - startTime,
      }
    }

    // Perform AI analysis
    const matchAnalysis = await analyzeJobMatch({
      profile: {
        fullName: profile.fullName,
        jobTitlePrefs: JSON.parse(profile.jobTitlePrefs || '[]'),
        yearsExperience: profile.yearsExperience || 0,
        skills: (profile.skills || []).map(skill => ({
          name: skill.name,
          proficiency: skill.proficiency,
          yearsUsed: skill.yearsUsed || 0
        })),
        preferredLocations: JSON.parse(profile.preferredLocations || '[]'),
        employmentTypes: JSON.parse(profile.employmentTypes || '[]'),
      },
      jobDescription: {
        title: job.title,
        company: job.company,
        description: job.description || '',
        requirements: [],
        location: job.location || '',
        salaryRange: job.salaryRange || '',
        employmentType: job.employmentType || 'FULL_TIME',
      },
    })

    // Update job with match score
    await prisma.job.update({
      where: { id: job.id },
      data: {
        matchScore: matchAnalysis.matchScore,
        isProcessed: true,
      },
    })

    const settings = profile.autoApplySettings
    const meetsAutoApplyThreshold = matchAnalysis.matchScore >= settings.minMatchScore
    const meetsNotifyThreshold = matchAnalysis.matchScore >= settings.notifyMinScore

    console.log(`✅ AI Analysis complete: ${job.title} at ${job.company}`)
    console.log(`  Match Score: ${Math.round(matchAnalysis.matchScore * 100)}%`)
    console.log(`  Auto-apply threshold (${Math.round(settings.minMatchScore * 100)}%): ${meetsAutoApplyThreshold}`)
    console.log(`  Notification threshold (${Math.round(settings.notifyMinScore * 100)}%): ${meetsNotifyThreshold}`)

    // Create notifications/auto-apply based on scores
    let actionsPerformed = []
    
    if (meetsNotifyThreshold) {
      if (meetsAutoApplyThreshold && settings.autoApplyEnabled && !settings.requireApproval) {
        // Auto-apply logic here (STAGE 4)
        actionsPerformed.push('auto_apply_queued')
      } else if (settings.notifyOnMatch) {
        // Create notification
        const notification = await prisma.jobNotification.create({
          data: {
            userId: profile.userId,
            jobId: job.id,
            matchScore: matchAnalysis.matchScore,
            status: 'PENDING',
            message: `Found a ${Math.round(matchAnalysis.matchScore * 100)}% match: ${job.title} at ${job.company}`,
            expiresAt: new Date(Date.now() + (settings.reviewTimeoutHours || 24) * 60 * 60 * 1000),
          },
        })
        actionsPerformed.push('notification_created')
      }
    }

    const duration = Date.now() - startTime
    console.log(`🎯 AI analysis completed in ${duration}ms for job ${payload.jobId}`)

    return {
      success: true,
      data: {
        jobId: payload.jobId,
        matchScore: matchAnalysis.matchScore,
        meetsAutoApplyThreshold,
        meetsNotifyThreshold,
        actionsPerformed,
      },
      duration,
    }
  } catch (error) {
    console.error('AI job analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in AI analysis',
      duration: Date.now() - startTime,
    }
  }
}