/**
 * Job Handlers for Queue Processing
 * 
 * These handlers are abstracted from queue implementation details
 * They work with any queue backend (Database/Redis/SQS)
 */

import { JobHandler, JobResult, QueueJob } from './interfaces'
import { analyzeJobMatch } from '../openai'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * STAGE 3: Background AI Analysis Handler
 * Processes jobs queued from STAGE 2 job scanning
 */
export const handleAnalyzeJobMatch: JobHandler = async (payload: { jobId: string; userId: string }, job: QueueJob): Promise<JobResult> => {
  try {
    console.log(`🤖 STAGE 3: Processing AI analysis for job ${payload.jobId}`)
    
    // Prevent duplicate processing
    const existingJob = await prisma.job.findUnique({
      where: { id: payload.jobId },
      select: { id: true, isProcessed: true, matchScore: true }
    })

    if (!existingJob) {
      return { success: false, error: 'Job not found', retry: false }
    }

    if (existingJob.isProcessed && existingJob.matchScore !== null) {
      console.log(`Job ${payload.jobId} already processed, skipping`)
      return { success: true }
    }

    // Get job and profile data
    const [jobData, profile] = await Promise.all([
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

    if (!jobData || !profile || !profile.autoApplySettings) {
      return { 
        success: false, 
        error: 'Job or profile not found', 
        retry: false // Don't retry missing data
      }
    }

    // Perform AI analysis with timeout protection
    const analysisPromise = analyzeJobMatch({
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
        title: jobData.title,
        company: jobData.company,
        description: jobData.description || '',
        requirements: [],
        location: jobData.location || '',
        salaryRange: jobData.salaryRange || '',
        employmentType: jobData.employmentType || 'FULL_TIME',
      },
    })

    // 25-second timeout for AI analysis
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('AI analysis timeout')), 25000)
    )

    const matchAnalysis = await Promise.race([analysisPromise, timeoutPromise])

    // Update job with match score atomically
    await prisma.job.update({
      where: { id: jobData.id },
      data: {
        matchScore: matchAnalysis.matchScore,
        isProcessed: true,
        updatedAt: new Date()
      },
    })

    const settings = profile.autoApplySettings
    const meetsAutoApplyThreshold = matchAnalysis.matchScore >= settings.minMatchScore
    const meetsNotifyThreshold = matchAnalysis.matchScore >= settings.notifyMinScore

    console.log(`✅ AI Analysis complete: ${jobData.title} at ${jobData.company}`)
    console.log(`  Match Score: ${Math.round(matchAnalysis.matchScore * 100)}%`)
    console.log(`  Auto-apply threshold (${Math.round(settings.minMatchScore * 100)}%): ${meetsAutoApplyThreshold}`)
    console.log(`  Notification threshold (${Math.round(settings.notifyMinScore * 100)}%): ${meetsNotifyThreshold}`)

    // STAGE 4: Create notifications/auto-apply based on scores
    let actionsPerformed = []
    
    if (meetsNotifyThreshold) {
      if (meetsAutoApplyThreshold && settings.autoApplyEnabled && !settings.requireApproval) {
        // TODO: Queue auto-apply job here
        actionsPerformed.push('auto_apply_queued')
      } else if (settings.notifyOnMatch) {
        // Create notification
        const expiresAt = new Date(Date.now() + (settings.reviewTimeoutHours || 24) * 60 * 60 * 1000)
        
        await prisma.jobNotification.create({
          data: {
            userId: profile.userId,
            jobId: jobData.id,
            matchScore: matchAnalysis.matchScore,
            status: 'PENDING',
            message: `Found a ${Math.round(matchAnalysis.matchScore * 100)}% match: ${jobData.title} at ${jobData.company}`,
            expiresAt,
          },
        })
        actionsPerformed.push('notification_created')
        console.log(`📢 Created notification for ${jobData.title} at ${jobData.company}`)
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('AI job analysis error:', error)
    
    // Determine if we should retry based on error type
    const shouldRetry = !(error instanceof Error && (
      error.message.includes('not found') ||
      error.message.includes('Invalid') ||
      error.message.includes('timeout')
    ))

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in AI analysis',
      retry: shouldRetry,
      retryDelay: shouldRetry ? 5000 : undefined // 5 second delay for retries
    }
  }
}

/**
 * Batch AI Processing Handler (Future Enhancement)
 * Process multiple jobs in a single AI call for efficiency
 * TODO: Implement when AI API supports batch processing
 */
export const handleBatchAnalyzeJobs: JobHandler = async (payload: { jobIds: string[]; userId: string }, job: QueueJob): Promise<JobResult> => {
  // TODO: Implement batch processing when AI API supports it
  // This would be more efficient than individual job processing
  return { success: false, error: 'Batch processing not implemented yet' }
}

/**
 * User-initiated job scan handler
 * STAGE 1: Fast job fetching without AI blocking
 */
export const handleUserJobScan: JobHandler = async (payload: { userId: string }, job: QueueJob): Promise<JobResult> => {
  try {
    console.log(`👤 Processing user job scan for: ${payload.userId}`)
    
    // Import scanner and run Stage 1 (fast, non-AI)
    const { jobScanner } = await import('../jobScanner')
    const results = await jobScanner.scanAndProcessJobs(payload.userId)
    
    console.log(`✅ User job scan completed: ${results.processed} jobs processed`)
    
    return {
      success: true
    }
  } catch (error) {
    console.error('User job scan error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in job scan',
      retry: true
    }
  }
}