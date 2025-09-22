import { PrismaClient } from '@prisma/client'
import { JobData, JobType, JobStatus, JobResult, JobHandler, QueueMetrics } from './types'
import { EventEmitter } from 'events'

const prisma = new PrismaClient()

export class JobQueue extends EventEmitter {
  private handlers: Map<JobType, JobHandler> = new Map()
  private processing: Map<string, Promise<void>> = new Map()
  private isRunning = false
  private pollInterval = 5000 // 5 seconds
  private maxConcurrency = 10
  private currentConcurrency = 0

  constructor() {
    super()
    this.setupErrorHandling()
  }

  private setupErrorHandling() {
    process.on('SIGINT', this.gracefulShutdown.bind(this))
    process.on('SIGTERM', this.gracefulShutdown.bind(this))
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception in job queue:', error)
      this.gracefulShutdown()
    })
  }

  // Register job handlers
  registerHandler(handler: JobHandler) {
    this.handlers.set(handler.type, handler)
    console.log(`Registered handler for job type: ${handler.type}`)
  }

  // Add a job to the queue
  async addJob(
    type: JobType,
    payload: any,
    options: {
      priority?: number
      delay?: number
      scheduledFor?: Date
      maxAttempts?: number
    } = {}
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const scheduledFor = options.scheduledFor || 
      (options.delay ? new Date(Date.now() + options.delay) : new Date())

    const status = scheduledFor > new Date() ? JobStatus.SCHEDULED : JobStatus.PENDING

    await prisma.jobQueue.create({
      data: {
        jobId,
        userId: payload.userId || 'system',
        status,
        priority: options.priority || 1,
        attempts: 0,
        maxAttempts: options.maxAttempts || 3,
        // Store job metadata in the existing fields
        errorMessage: JSON.stringify({
          type,
          payload,
          scheduledFor: scheduledFor.toISOString(),
        }),
        processedAt: status === JobStatus.PENDING ? null : scheduledFor,
      },
    })

    console.log(`Added job ${jobId} of type ${type} with status ${status}`)
    this.emit('jobAdded', { jobId, type, status })
    
    return jobId
  }

  // Start processing jobs
  async start() {
    if (this.isRunning) {
      console.log('Job queue is already running')
      return
    }

    this.isRunning = true
    console.log('Starting job queue processor...')
    
    // Start the main processing loop
    this.processLoop()
    
    // Start scheduled job checker
    this.scheduleLoop()
    
    this.emit('started')
  }

  // Stop processing jobs
  async stop() {
    console.log('Stopping job queue processor...')
    this.isRunning = false
    
    // Wait for current jobs to finish
    await Promise.all(Array.from(this.processing.values()))
    
    this.emit('stopped')
  }

  // Main processing loop
  private async processLoop() {
    while (this.isRunning) {
      try {
        if (this.currentConcurrency < this.maxConcurrency) {
          await this.processNextJob()
        }
        
        // Short delay before next iteration
        await this.sleep(1000)
      } catch (error) {
        console.error('Error in process loop:', error)
        await this.sleep(5000) // Longer delay on error
      }
    }
  }

  // Schedule loop for handling scheduled jobs
  private async scheduleLoop() {
    while (this.isRunning) {
      try {
        await this.activateScheduledJobs()
        await this.sleep(30000) // Check every 30 seconds
      } catch (error) {
        console.error('Error in schedule loop:', error)
      }
    }
  }

  // Activate scheduled jobs that are ready to run
  private async activateScheduledJobs() {
    await prisma.jobQueue.updateMany({
      where: {
        status: 'SCHEDULED',
        processedAt: {
          lte: new Date(),
        },
      },
      data: {
        status: 'PENDING',
        processedAt: null,
      },
    })
  }

  // Process the next available job
  private async processNextJob() {
    const job = await prisma.jobQueue.findFirst({
      where: {
        status: 'PENDING',
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    if (!job) {
      return // No jobs to process
    }

    // Mark job as processing
    await prisma.jobQueue.update({
      where: { id: job.id },
      data: {
        status: 'PROCESSING',
        processedAt: new Date(),
      },
    })

    this.currentConcurrency++
    
    // Process the job asynchronously
    const processingPromise = this.executeJob(job)
    this.processing.set(job.id, processingPromise)
    
    // Clean up when job completes
    processingPromise.finally(() => {
      this.processing.delete(job.id)
      this.currentConcurrency--
    })
  }

  // Execute a specific job
  private async executeJob(job: any) {
    const startTime = Date.now()
    let jobMetadata: any

    try {
      // Parse job metadata from errorMessage field
      jobMetadata = JSON.parse(job.errorMessage || '{}')
      const handler = this.handlers.get(jobMetadata.type)

      if (!handler) {
        throw new Error(`No handler registered for job type: ${jobMetadata.type}`)
      }

      console.log(`Executing job ${job.jobId} of type ${jobMetadata.type}`)
      this.emit('jobStarted', { jobId: job.jobId, type: jobMetadata.type })

      // Execute the job with timeout
      const result = await this.executeWithTimeout(
        handler.handler(jobMetadata.payload),
        handler.timeout || 300000 // 5 minutes default timeout
      )

      if (result.success) {
        // Job completed successfully
        await prisma.jobQueue.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            errorMessage: JSON.stringify({
              ...jobMetadata,
              result: result.data,
              duration: Date.now() - startTime,
            }),
          },
        })

        console.log(`Job ${job.jobId} completed successfully`)
        this.emit('jobCompleted', { jobId: job.jobId, type: jobMetadata.type, result })
      } else {
        throw new Error(result.error || 'Job execution failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Job ${job.jobId} failed:`, errorMessage)

      // Determine if we should retry
      const shouldRetry = job.attempts < job.maxAttempts - 1
      
      if (shouldRetry) {
        // Schedule retry
        const retryDelay = this.calculateRetryDelay(job.attempts)
        const nextRetryAt = new Date(Date.now() + retryDelay)

        await prisma.jobQueue.update({
          where: { id: job.id },
          data: {
            status: 'RETRYING',
            attempts: job.attempts + 1,
            processedAt: nextRetryAt,
            errorMessage: JSON.stringify({
              ...jobMetadata,
              error: errorMessage,
              attempts: job.attempts + 1,
              nextRetryAt: nextRetryAt.toISOString(),
            }),
          },
        })

        console.log(`Job ${job.jobId} scheduled for retry ${job.attempts + 1}/${job.maxAttempts} at ${nextRetryAt}`)
        this.emit('jobRetrying', { jobId: job.jobId, type: jobMetadata?.type, attempt: job.attempts + 1 })
      } else {
        // Job failed permanently
        await prisma.jobQueue.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: JSON.stringify({
              ...jobMetadata,
              error: errorMessage,
              finalFailure: true,
              duration: Date.now() - startTime,
            }),
          },
        })

        console.log(`Job ${job.jobId} failed permanently after ${job.attempts + 1} attempts`)
        this.emit('jobFailed', { jobId: job.jobId, type: jobMetadata?.type, error: errorMessage })
      }
    }
  }

  // Execute with timeout
  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Job execution timed out after ${timeout}ms`))
      }, timeout)

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer))
    })
  }

  // Calculate retry delay using exponential backoff
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 30000 // 30 seconds
    const maxDelay = 300000 // 5 minutes
    const delay = baseDelay * Math.pow(2, attempt)
    return Math.min(delay, maxDelay)
  }

  // Get queue metrics
  async getMetrics(): Promise<QueueMetrics> {
    const counts = await prisma.jobQueue.groupBy({
      by: ['status'],
      _count: true,
    })

    const metrics: QueueMetrics = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      retrying: 0,
      scheduled: 0,
    }

    counts.forEach(({ status, _count }) => {
      switch (status) {
        case 'PENDING':
          metrics.pending = _count
          break
        case 'PROCESSING':
          metrics.processing = _count
          break
        case 'COMPLETED':
          metrics.completed = _count
          break
        case 'FAILED':
          metrics.failed = _count
          break
        case 'RETRYING':
          metrics.retrying = _count
          break
        case 'SCHEDULED':
          metrics.scheduled = _count
          break
      }
    })

    return metrics
  }

  // Clean up old completed jobs
  async cleanup(olderThanDays = 7) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    
    const deleted = await prisma.jobQueue.deleteMany({
      where: {
        status: {
          in: ['COMPLETED', 'FAILED'],
        },
        updatedAt: {
          lt: cutoffDate,
        },
      },
    })

    console.log(`Cleaned up ${deleted.count} old jobs`)
    return deleted.count
  }

  // Utility methods
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async gracefulShutdown() {
    console.log('Graceful shutdown initiated...')
    await this.stop()
    await prisma.$disconnect()
    process.exit(0)
  }
}

// Singleton instance
export const jobQueue = new JobQueue()