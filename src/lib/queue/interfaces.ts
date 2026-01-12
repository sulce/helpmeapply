/**
 * Queue Abstraction Interface
 * 
 * This abstraction allows clean migration from database-backed queues 
 * to dedicated queue systems (RabbitMQ/Redis/SQS) without refactoring business logic.
 * 
 * TODO: Migrate to Redis/SQS - only change the implementation, not the interface
 */

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING', 
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface QueueJob {
  id: string
  type: string
  payload: any
  userId?: string
  status: JobStatus
  priority: number
  attemptCount: number
  maxAttempts: number
  availableAt: Date
  createdAt: Date
  updatedAt: Date
  errorMessage?: string
  processedAt?: Date
}

export interface EnqueueOptions {
  priority?: number
  delay?: number
  maxAttempts?: number
  userId?: string
  deduplicationKey?: string // Prevent duplicate jobs
}

export interface QueueWorkerOptions {
  concurrency?: number
  pollInterval?: number
  visibilityTimeout?: number
}

/**
 * Main Queue Interface - Business logic should only use this
 * Implementation can be swapped without changing business code
 */
export interface IQueue {
  /**
   * Add job to queue - single interface for all job enqueueing
   * @param type Job type identifier
   * @param payload Job data
   * @param options Queue options (priority, delay, etc.)
   * @returns Promise<string> Job ID
   */
  enqueueJob(type: string, payload: any, options?: EnqueueOptions): Promise<string>
  
  /**
   * Register job handler
   * @param type Job type to handle
   * @param handler Function to process job
   * @param options Worker configuration
   */
  registerHandler(type: string, handler: JobHandler, options?: QueueWorkerOptions): void
  
  /**
   * Start queue worker
   */
  start(): Promise<void>
  
  /**
   * Stop queue worker gracefully
   */
  stop(): Promise<void>
  
  /**
   * Get queue metrics
   */
  getMetrics(): Promise<QueueMetrics>
}

export interface JobHandler {
  (payload: any, job: QueueJob): Promise<JobResult>
}

export interface JobResult {
  success: boolean
  error?: string
  retry?: boolean
  retryDelay?: number
}

export interface QueueMetrics {
  pending: number
  processing: number
  completed: number
  failed: number
  workers: number
}