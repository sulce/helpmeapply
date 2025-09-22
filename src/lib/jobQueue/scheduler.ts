import { jobQueue } from './JobQueue'
import { JobType } from './types'
import { handleUserJobScan, handleAutomatedJobScan, handleProcessJobMatches } from './handlers/jobScanHandler'
import { handleCleanupExpiredReviews, handleCleanupExpiredNotifications, handleCleanupOldJobs, handleDailyMaintenanceCleanup } from './handlers/cleanupHandler'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ScheduleConfig {
  type: JobType
  cronExpression: string
  enabled: boolean
  payload?: any
  maxAttempts?: number
  timeout?: number
}

export class JobScheduler {
  private static instance: JobScheduler
  private schedules: Map<JobType, ScheduleConfig> = new Map()
  private intervals: Map<JobType, NodeJS.Timeout> = new Map()
  private isRunning = false

  static getInstance(): JobScheduler {
    if (!JobScheduler.instance) {
      JobScheduler.instance = new JobScheduler()
    }
    return JobScheduler.instance
  }

  private constructor() {
    this.setupDefaultSchedules()
    this.registerHandlers()
  }

  private setupDefaultSchedules() {
    // Default job schedules
    const defaultSchedules: ScheduleConfig[] = [
      {
        type: JobType.AUTOMATED_JOB_SCAN,
        cronExpression: '0 */4 * * *', // Every 4 hours
        enabled: true,
        maxAttempts: 2,
        timeout: 600000, // 10 minutes
      },
      {
        type: JobType.CLEANUP_EXPIRED_REVIEWS,
        cronExpression: '0 */6 * * *', // Every 6 hours
        enabled: true,
        maxAttempts: 3,
        timeout: 120000, // 2 minutes
      },
      {
        type: JobType.CLEANUP_EXPIRED_NOTIFICATIONS,
        cronExpression: '0 2 * * *', // Daily at 2 AM
        enabled: true,
        maxAttempts: 3,
        timeout: 300000, // 5 minutes
      },
      {
        type: JobType.SEND_DAILY_SUMMARY,
        cronExpression: '0 9 * * *', // Daily at 9 AM
        enabled: false, // Disabled by default
        maxAttempts: 2,
        timeout: 120000, // 2 minutes
      },
    ]

    defaultSchedules.forEach(schedule => {
      this.schedules.set(schedule.type, schedule)
    })
  }

  private registerHandlers() {
    // Register all job handlers
    jobQueue.registerHandler({
      type: JobType.USER_JOB_SCAN,
      handler: handleUserJobScan,
      timeout: 300000, // 5 minutes
    })

    jobQueue.registerHandler({
      type: JobType.AUTOMATED_JOB_SCAN,
      handler: handleAutomatedJobScan,
      timeout: 600000, // 10 minutes
    })

    jobQueue.registerHandler({
      type: JobType.PROCESS_JOB_MATCHES,
      handler: handleProcessJobMatches,
      timeout: 180000, // 3 minutes
    })

    jobQueue.registerHandler({
      type: JobType.CLEANUP_EXPIRED_REVIEWS,
      handler: handleCleanupExpiredReviews,
      timeout: 120000, // 2 minutes
    })

    jobQueue.registerHandler({
      type: JobType.CLEANUP_EXPIRED_NOTIFICATIONS,
      handler: handleCleanupExpiredNotifications,
      timeout: 300000, // 5 minutes
    })

    jobQueue.registerHandler({
      type: JobType.SEND_DAILY_SUMMARY,
      handler: async () => {
        // Placeholder for daily summary handler
        return {
          success: true,
          data: { type: 'daily_summary', message: 'Daily summary sent' },
        }
      },
      timeout: 120000, // 2 minutes
    })

    // Additional cleanup handlers
    jobQueue.registerHandler({
      type: JobType.GENERATE_COVER_LETTER,
      handler: async (payload: { userId: string; jobId: string }) => {
        // Placeholder for cover letter generation
        return {
          success: true,
          data: { type: 'cover_letter', userId: payload.userId, jobId: payload.jobId },
        }
      },
      timeout: 60000, // 1 minute
    })

    jobQueue.registerHandler({
      type: JobType.CUSTOMIZE_RESUME,
      handler: async (payload: { userId: string; jobId: string }) => {
        // Placeholder for resume customization
        return {
          success: true,
          data: { type: 'resume_customization', userId: payload.userId, jobId: payload.jobId },
        }
      },
      timeout: 120000, // 2 minutes
    })

    jobQueue.registerHandler({
      type: JobType.PROCESS_APPLICATION,
      handler: async (payload: { userId: string; jobId: string }) => {
        // Placeholder for application processing
        return {
          success: true,
          data: { type: 'process_application', userId: payload.userId, jobId: payload.jobId },
        }
      },
      timeout: 180000, // 3 minutes
    })
  }

  async start() {
    if (this.isRunning) {
      console.log('Job scheduler is already running')
      return
    }

    console.log('Starting job scheduler...')
    this.isRunning = true

    // Start the job queue
    await jobQueue.start()

    // Schedule all enabled jobs
    for (const [jobType, config] of this.schedules.entries()) {
      if (config.enabled) {
        this.scheduleJob(jobType, config)
      }
    }

    console.log('Job scheduler started successfully')
  }

  async stop() {
    console.log('Stopping job scheduler...')
    this.isRunning = false

    // Clear all intervals
    for (const [jobType, interval] of this.intervals.entries()) {
      clearInterval(interval)
      console.log(`Cleared schedule for ${jobType}`)
    }
    this.intervals.clear()

    // Stop the job queue
    await jobQueue.stop()

    console.log('Job scheduler stopped')
  }

  private scheduleJob(jobType: JobType, config: ScheduleConfig) {
    const intervalMs = this.cronToInterval(config.cronExpression)
    
    if (intervalMs <= 0) {
      console.warn(`Invalid cron expression for ${jobType}: ${config.cronExpression}`)
      return
    }

    console.log(`Scheduling ${jobType} to run every ${intervalMs}ms`)

    // Schedule immediate execution for some jobs
    if (jobType === JobType.CLEANUP_EXPIRED_REVIEWS) {
      this.addJobToQueue(jobType, config)
    }

    const interval = setInterval(async () => {
      if (this.isRunning) {
        await this.addJobToQueue(jobType, config)
      }
    }, intervalMs)

    this.intervals.set(jobType, interval)
  }

  private async addJobToQueue(jobType: JobType, config: ScheduleConfig) {
    try {
      const jobId = await jobQueue.addJob(
        jobType,
        config.payload || {},
        {
          priority: this.getJobPriority(jobType),
          maxAttempts: config.maxAttempts || 3,
        }
      )
      
      console.log(`Scheduled job ${jobId} of type ${jobType}`)
    } catch (error) {
      console.error(`Failed to schedule job ${jobType}:`, error)
    }
  }

  private getJobPriority(jobType: JobType): number {
    const priorities: Record<JobType, number> = {
      [JobType.USER_JOB_SCAN]: 10, // Highest priority - user-initiated
      [JobType.PROCESS_JOB_MATCHES]: 9,
      [JobType.AUTOMATED_JOB_SCAN]: 7,
      [JobType.GENERATE_COVER_LETTER]: 6,
      [JobType.CUSTOMIZE_RESUME]: 6,
      [JobType.PROCESS_APPLICATION]: 8,
      [JobType.CLEANUP_EXPIRED_REVIEWS]: 4,
      [JobType.CLEANUP_EXPIRED_NOTIFICATIONS]: 3,
      [JobType.SEND_DAILY_SUMMARY]: 2,
    }

    return priorities[jobType] || 5
  }

  // Simple cron to interval converter (basic implementation)
  private cronToInterval(cronExpression: string): number {
    const parts = cronExpression.split(' ')
    
    if (parts.length !== 5) {
      return 0 // Invalid cron expression
    }

    const [minute, hour, dayMonth, month, dayWeek] = parts

    // Handle simple patterns
    if (minute.startsWith('*/')) {
      const minutes = parseInt(minute.substring(2))
      if (!isNaN(minutes)) {
        return minutes * 60 * 1000 // Convert to milliseconds
      }
    }

    if (hour.startsWith('*/')) {
      const hours = parseInt(hour.substring(2))
      if (!isNaN(hours)) {
        return hours * 60 * 60 * 1000 // Convert to milliseconds
      }
    }

    // Handle daily jobs (e.g., "0 2 * * *")
    if (minute !== '*' && hour !== '*' && dayMonth === '*' && month === '*' && dayWeek === '*') {
      return 24 * 60 * 60 * 1000 // Daily
    }

    // Default to hourly for unrecognized patterns
    return 60 * 60 * 1000
  }

  // Public API methods
  async scheduleUserJobScan(userId: string): Promise<string> {
    return await jobQueue.addJob(
      JobType.USER_JOB_SCAN,
      { userId },
      { priority: 10, maxAttempts: 2 }
    )
  }

  async scheduleJobMatching(userId: string): Promise<string> {
    return await jobQueue.addJob(
      JobType.PROCESS_JOB_MATCHES,
      { userId },
      { priority: 9, maxAttempts: 2 }
    )
  }

  async scheduleCoverLetterGeneration(userId: string, jobId: string): Promise<string> {
    return await jobQueue.addJob(
      JobType.GENERATE_COVER_LETTER,
      { userId, jobId },
      { priority: 6, maxAttempts: 2 }
    )
  }

  async scheduleResumeCustomization(userId: string, jobId: string): Promise<string> {
    return await jobQueue.addJob(
      JobType.CUSTOMIZE_RESUME,
      { userId, jobId },
      { priority: 6, maxAttempts: 2 }
    )
  }

  async scheduleApplicationProcessing(userId: string, jobId: string): Promise<string> {
    return await jobQueue.addJob(
      JobType.PROCESS_APPLICATION,
      { userId, jobId },
      { priority: 8, maxAttempts: 3 }
    )
  }

  // Configuration management
  updateSchedule(jobType: JobType, config: Partial<ScheduleConfig>) {
    const existingConfig = this.schedules.get(jobType)
    if (existingConfig) {
      const newConfig = { ...existingConfig, ...config }
      this.schedules.set(jobType, newConfig)

      // Restart the schedule if it's currently running
      if (this.intervals.has(jobType)) {
        clearInterval(this.intervals.get(jobType)!)
        this.intervals.delete(jobType)
        
        if (newConfig.enabled) {
          this.scheduleJob(jobType, newConfig)
        }
      }
    }
  }

  getSchedules(): Map<JobType, ScheduleConfig> {
    return new Map(this.schedules)
  }

  async getQueueMetrics() {
    return await jobQueue.getMetrics()
  }

  async cleanupQueue(olderThanDays = 7) {
    return await jobQueue.cleanup(olderThanDays)
  }
}

export const jobScheduler = JobScheduler.getInstance()