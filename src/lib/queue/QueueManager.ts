/**
 * Queue Manager - Main Interface for Business Logic
 * 
 * This provides a clean abstraction that business logic uses.
 * Implementation can be swapped (Database → Redis → SQS) without changing business code.
 * 
 * TODO: Swap DatabaseQueue for RedisQueue/SQSQueue in production
 */

import { queue } from './DatabaseQueue' // TODO: Change this import for migration
import { handleAnalyzeJobMatch, handleUserJobScan } from './handlers'
import { IQueue, EnqueueOptions, QueueMetrics } from './interfaces'

class QueueManager {
  private queue: IQueue = queue // TODO: Inject queue implementation here

  /**
   * Initialize queue with all handlers
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing Queue Manager...')
    
    // Register all job handlers
    this.queue.registerHandler('analyze_job_match', handleAnalyzeJobMatch, {
      concurrency: 5, // Process 5 AI analyses concurrently
      pollInterval: 2000
    })

    this.queue.registerHandler('user_job_scan', handleUserJobScan, {
      concurrency: 2, // Limit concurrent job scans
      pollInterval: 1000
    })

    // TODO: Register other handlers as needed
    
    console.log('✅ Queue handlers registered')
  }

  /**
   * Start queue processing
   */
  async start(): Promise<void> {
    await this.initialize()
    await this.queue.start()
  }

  /**
   * Stop queue processing
   */
  async stop(): Promise<void> {
    await this.queue.stop()
  }

  /**
   * Business Logic Interface: Enqueue AI Analysis
   * Called from job scanning when jobs need AI processing
   */
  async enqueueAIAnalysis(jobId: string, userId: string): Promise<string> {
    return this.queue.enqueueJob('analyze_job_match', { jobId, userId }, {
      priority: 8, // High priority for AI analysis
      maxAttempts: 3,
      userId,
      deduplicationKey: `ai_analysis_${jobId}` // Prevent duplicate AI analysis
    })
  }

  /**
   * Business Logic Interface: Enqueue User Job Scan  
   * Called when user triggers manual scan
   */
  async enqueueUserJobScan(userId: string): Promise<string> {
    return this.queue.enqueueJob('user_job_scan', { userId }, {
      priority: 10, // Highest priority for user-initiated scans
      maxAttempts: 2,
      userId,
      deduplicationKey: `user_scan_${userId}_${Date.now()}` // Allow multiple user scans but prevent rapid duplicates
    })
  }

  /**
   * Business Logic Interface: Enqueue with Delay
   * For scheduled or delayed processing
   */
  async enqueueWithDelay(type: string, payload: any, delayMs: number, options: EnqueueOptions = {}): Promise<string> {
    return this.queue.enqueueJob(type, payload, {
      ...options,
      delay: delayMs
    })
  }

  /**
   * Get queue status and metrics
   */
  async getMetrics(): Promise<QueueMetrics> {
    return this.queue.getMetrics()
  }

  /**
   * Health check for queue system
   */
  async healthCheck(): Promise<{ healthy: boolean; metrics: QueueMetrics }> {
    try {
      const metrics = await this.getMetrics()
      
      // Consider unhealthy if too many failed jobs or processing is stuck
      const healthy = metrics.failed < 100 && metrics.processing < 50
      
      return { healthy, metrics }
    } catch (error) {
      return {
        healthy: false,
        metrics: { pending: 0, processing: 0, completed: 0, failed: 0, workers: 0 }
      }
    }
  }
}

// Export singleton instance
export const queueManager = new QueueManager()

// Export types for business logic
export type { QueueMetrics } from './interfaces'