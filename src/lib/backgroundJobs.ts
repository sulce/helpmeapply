import { jobScanner } from './jobScanner'
import { prisma } from './db'

interface ScheduledJob {
  id: string
  userId: string
  type: 'JOB_SCAN' | 'APPLICATION_REMINDER' | 'DAILY_SUMMARY'
  nextRun: Date
  intervalHours: number
  isActive: boolean
}

class BackgroundJobManager {
  private static instance: BackgroundJobManager
  private runningJobs = new Map<string, NodeJS.Timeout>()
  private isInitialized = false

  static getInstance(): BackgroundJobManager {
    if (!BackgroundJobManager.instance) {
      BackgroundJobManager.instance = new BackgroundJobManager()
    }
    return BackgroundJobManager.instance
  }

  async initialize() {
    if (this.isInitialized) return

    await this.scheduleActiveJobs()
    this.isInitialized = true
    console.log('Background job manager initialized')
  }

  private async scheduleActiveJobs() {
    try {
      const activeSettings = await prisma.autoApplySettings.findMany({
        where: {
          isEnabled: true,
          autoScanEnabled: true,
        },
        include: { profile: true },
      })

      for (const settings of activeSettings) {
        await this.scheduleJobScan(
          settings.profile.userId,
          settings.scanFrequencyHours
        )
      }
    } catch (error) {
      console.error('Error scheduling active jobs:', error)
    }
  }

  async scheduleJobScan(userId: string, intervalHours: number = 4) {
    const jobId = `job_scan_${userId}`
    
    if (this.runningJobs.has(jobId)) {
      clearInterval(this.runningJobs.get(jobId)!)
    }

    const intervalMs = intervalHours * 60 * 60 * 1000

    const timeout = setInterval(async () => {
      try {
        console.log(`Running scheduled job scan for user ${userId}`)
        const result = await jobScanner.scanAndProcessJobs(userId)
        console.log(`Job scan completed: ${result.processed} processed, ${result.applied} applied`)
        
        if (result.applied > 0) {
          await this.sendApplicationSummary(userId, result)
        }
      } catch (error) {
        console.error(`Error in scheduled job scan for user ${userId}:`, error)
      }
    }, intervalMs)

    this.runningJobs.set(jobId, timeout)
    console.log(`Scheduled job scan for user ${userId} every ${intervalHours} hours`)
  }

  async unscheduleJobScan(userId: string) {
    const jobId = `job_scan_${userId}`
    
    if (this.runningJobs.has(jobId)) {
      clearInterval(this.runningJobs.get(jobId)!)
      this.runningJobs.delete(jobId)
      console.log(`Unscheduled job scan for user ${userId}`)
    }
  }

  async updateJobScanSchedule(userId: string, intervalHours: number, isEnabled: boolean) {
    if (!isEnabled) {
      await this.unscheduleJobScan(userId)
      return
    }

    await this.scheduleJobScan(userId, intervalHours)
  }

  private async sendApplicationSummary(userId: string, result: { processed: number; applied: number }) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      })

      if (!user?.email) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todaysApplications = await prisma.application.findMany({
        where: {
          userId,
          appliedAt: { gte: today },
        },
        orderBy: { appliedAt: 'desc' },
      })

      console.log(`Should send email to ${user.email} about ${result.applied} new applications`)
      
    } catch (error) {
      console.error('Error sending application summary:', error)
    }
  }

  async processJobQueue() {
    try {
      const pendingJobs = await prisma.jobQueue.findMany({
        where: {
          status: 'PENDING',
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        take: 10,
      })

      for (const job of pendingJobs) {
        await this.processQueuedJob(job)
      }
    } catch (error) {
      console.error('Error processing job queue:', error)
    }
  }

  private async processQueuedJob(job: any) {
    try {
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: { 
          status: 'PROCESSING',
          attempts: job.attempts + 1,
        },
      })

      if (job.jobId.startsWith('scan_')) {
        const result = await jobScanner.scanAndProcessJobs(job.userId)
        
        await prisma.jobQueue.update({
          where: { id: job.id },
          data: { 
            status: 'COMPLETED',
            processedAt: new Date(),
          },
        })

        console.log(`Processed queued job scan: ${result.processed} processed, ${result.applied} applied`)
      }
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error)
      
      const shouldRetry = job.attempts < job.maxAttempts
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: { 
          status: shouldRetry ? 'RETRYING' : 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }

  async startQueueProcessor() {
    setInterval(async () => {
      await this.processJobQueue()
    }, 30000) // Process queue every 30 seconds

    console.log('Job queue processor started')
  }

  async getJobStats() {
    const stats = await prisma.jobQueue.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    const result: Record<string, number> = {}
    for (const stat of stats) {
      result[stat.status] = stat._count.status
    }

    return result
  }

  async clearOldJobs(olderThanDays: number = 7) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const deleted = await prisma.jobQueue.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['COMPLETED', 'FAILED'] },
      },
    })

    console.log(`Cleared ${deleted.count} old jobs`)
    return deleted.count
  }

  shutdown() {
    for (const [jobId, timeout] of this.runningJobs) {
      clearInterval(timeout)
      console.log(`Stopped job: ${jobId}`)
    }
    this.runningJobs.clear()
    this.isInitialized = false
    console.log('Background job manager shutdown')
  }
}

export const backgroundJobManager = BackgroundJobManager.getInstance()

process.on('SIGTERM', () => {
  backgroundJobManager.shutdown()
})

process.on('SIGINT', () => {
  backgroundJobManager.shutdown()
})