/**
 * Database-Backed Queue Implementation (TEMPORARY)
 * 
 * TODO: Replace with Redis/SQS implementation in production
 * This implementation uses database with row-level locking for queue operations
 * Migration to dedicated queue should only require changing this file
 */

import { PrismaClient } from '@prisma/client'
import { IQueue, QueueJob, JobHandler, JobResult, EnqueueOptions, QueueWorkerOptions, JobStatus, QueueMetrics } from './interfaces'
import { EventEmitter } from 'events'

const prisma = new PrismaClient()

export class DatabaseQueue extends EventEmitter implements IQueue {
  private handlers = new Map<string, { handler: JobHandler, options: QueueWorkerOptions }>()
  private isRunning = false
  private pollingInterval?: NodeJS.Timeout
  private activeTasks = new Set<Promise<void>>()
  private maxConcurrency = 10
  private pollIntervalMs = 2000

  constructor() {
    super()
    this.setupGracefulShutdown()
  }

  /**
   * Main abstraction: enqueue job without knowing implementation details
   * Business logic calls this - can be swapped for Redis/SQS later
   */
  async enqueueJob(type: string, payload: any, options: EnqueueOptions = {}): Promise<string> {
    const {
      priority = 1,
      delay = 0,
      maxAttempts = 3,
      userId,
      deduplicationKey
    } = options

    // TODO: When migrating to Redis/SQS, replace this database logic
    // with queue.publish() or equivalent
    
    // Prevent duplicate jobs if deduplicationKey provided
    if (deduplicationKey) {
      const existing = await prisma.jobQueue.findFirst({
        where: {
          deduplicationKey,
          status: { in: ['PENDING', 'PROCESSING'] }
        }
      })
      
      if (existing) {
        console.log(`Duplicate job prevented: ${deduplicationKey}`)
        return existing.id
      }
    }

    const availableAt = new Date(Date.now() + delay)
    
    const job = await prisma.jobQueue.create({
      data: {
        type,
        payload: JSON.stringify(payload),
        userId,
        priority,
        maxAttempts,
        availableAt,
        deduplicationKey,
        status: 'PENDING'
      }
    })

    console.log(`📥 Enqueued job: ${type} (ID: ${job.id})`)
    return job.id
  }

  /**
   * Register job handler - abstracted interface
   */
  registerHandler(type: string, handler: JobHandler, options: QueueWorkerOptions = {}): void {
    this.handlers.set(type, { handler, options })
    console.log(`✅ Registered handler for job type: ${type}`)
  }

  /**
   * Start queue worker with row-level locking
   */
  async start(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    console.log('🚀 Starting database queue worker...')
    
    // TODO: When migrating to Redis/SQS, replace with queue.subscribe()
    this.pollingInterval = setInterval(() => {
      this.processJobs().catch(error => {
        console.error('Queue processing error:', error)
      })
    }, this.pollIntervalMs)

    console.log(`✅ Database queue worker started (polling every ${this.pollIntervalMs}ms)`)
  }

  /**
   * Process jobs with concurrency control and row-level locking
   */
  private async processJobs(): Promise<void> {
    if (this.activeTasks.size >= this.maxConcurrency) {
      return // At max concurrency
    }

    try {
      // ChatGPT requirement: Use row-level locking (SELECT ... FOR UPDATE SKIP LOCKED)
      // Note: MongoDB doesn't support this, so we'll simulate with atomic updates
      const jobs = await this.getAvailableJobs(this.maxConcurrency - this.activeTasks.size)
      
      for (const job of jobs) {
        if (this.activeTasks.size >= this.maxConcurrency) break
        
        const task = this.processJob(job)
        this.activeTasks.add(task)
        
        // Clean up completed tasks
        task.finally(() => {
          this.activeTasks.delete(task)
        })
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  /**
   * Get available jobs with atomic locking simulation
   * TODO: Replace with proper Redis/SQS job fetching
   */
  private async getAvailableJobs(limit: number): Promise<QueueJob[]> {
    const now = new Date()
    
    // Find available jobs
    const availableJobs = await prisma.jobQueue.findMany({
      where: {
        status: 'PENDING',
        availableAt: { lte: now }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: limit
    })

    // Atomically claim jobs (simulating row-level locking)
    const claimedJobs: QueueJob[] = []
    
    for (const job of availableJobs) {
      try {
        const updated = await prisma.jobQueue.updateMany({
          where: {
            id: job.id,
            status: 'PENDING' // Only update if still pending
          },
          data: {
            status: 'PROCESSING',
            updatedAt: new Date()
          }
        })
        
        if (updated.count > 0) {
          claimedJobs.push({
            id: job.id,
            type: job.type,
            payload: JSON.parse(job.payload),
            userId: job.userId || undefined,
            status: JobStatus.PROCESSING,
            priority: job.priority,
            attemptCount: job.attemptCount,
            maxAttempts: job.maxAttempts,
            availableAt: job.availableAt,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            errorMessage: job.errorMessage || undefined,
            processedAt: job.processedAt || undefined
          })
        }
      } catch (error) {
        // Race condition - another worker claimed this job
        console.log(`Job ${job.id} claimed by another worker`)
      }
    }

    return claimedJobs
  }

  /**
   * Process individual job with error handling and retries
   */
  private async processJob(job: QueueJob): Promise<void> {
    const startTime = Date.now()
    console.log(`🔄 Processing job: ${job.type} (${job.id})`)

    const handlerInfo = this.handlers.get(job.type)
    if (!handlerInfo) {
      await this.failJob(job.id, `No handler registered for job type: ${job.type}`)
      return
    }

    try {
      const result = await handlerInfo.handler(job.payload, job)
      
      if (result.success) {
        await this.completeJob(job.id, Date.now() - startTime)
        console.log(`✅ Job completed: ${job.type} (${job.id}) in ${Date.now() - startTime}ms`)
      } else {
        await this.handleJobFailure(job, result.error || 'Job handler returned failure', result.retry, result.retryDelay)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.handleJobFailure(job, errorMessage, true)
      console.error(`❌ Job failed: ${job.type} (${job.id}):`, error)
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(job: QueueJob, errorMessage: string, shouldRetry = true, retryDelay = 0): Promise<void> {
    const newAttemptCount = job.attemptCount + 1
    
    if (shouldRetry && newAttemptCount < job.maxAttempts) {
      // Retry with exponential backoff
      const backoffDelay = retryDelay || Math.min(1000 * Math.pow(2, newAttemptCount), 30000)
      const availableAt = new Date(Date.now() + backoffDelay)
      
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          attemptCount: newAttemptCount,
          availableAt,
          errorMessage,
          updatedAt: new Date()
        }
      })
      
      console.log(`🔁 Retrying job ${job.id} in ${backoffDelay}ms (attempt ${newAttemptCount}/${job.maxAttempts})`)
    } else {
      await this.failJob(job.id, errorMessage)
    }
  }

  /**
   * Mark job as completed
   */
  private async completeJob(jobId: string, duration: number): Promise<void> {
    await prisma.jobQueue.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  /**
   * Mark job as permanently failed
   */
  private async failJob(jobId: string, errorMessage: string): Promise<void> {
    await prisma.jobQueue.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage,
        processedAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  /**
   * Stop queue worker gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    console.log('🛑 Stopping database queue worker...')
    this.isRunning = false

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }

    // Wait for active tasks to complete
    if (this.activeTasks.size > 0) {
      console.log(`⏳ Waiting for ${this.activeTasks.size} active jobs to complete...`)
      await Promise.all(Array.from(this.activeTasks))
    }

    console.log('✅ Database queue worker stopped')
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<QueueMetrics> {
    const [pending, processing, completed, failed] = await Promise.all([
      prisma.jobQueue.count({ where: { status: 'PENDING' } }),
      prisma.jobQueue.count({ where: { status: 'PROCESSING' } }),
      prisma.jobQueue.count({ where: { status: 'COMPLETED' } }),
      prisma.jobQueue.count({ where: { status: 'FAILED' } })
    ])

    return {
      pending,
      processing,
      completed,
      failed,
      workers: this.activeTasks.size
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = () => {
      console.log('📥 Received shutdown signal')
      this.stop().then(() => {
        process.exit(0)
      })
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }
}

// Export singleton instance
export const queue = new DatabaseQueue()