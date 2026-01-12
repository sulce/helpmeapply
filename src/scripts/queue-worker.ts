#!/usr/bin/env ts-node

/**
 * Queue Worker Script - ChatGPT Specification Implementation
 * 
 * Starts the abstracted queue worker that processes background jobs.
 * Can be easily swapped to use Redis/SQS by changing QueueManager implementation.
 * 
 * TODO: In production, replace DatabaseQueue with Redis/SQS queue
 */

import { queueManager } from '../lib/queue/QueueManager'

async function startWorker() {
  try {
    console.log('🚀 Starting Queue Worker...')
    console.log('📋 ChatGPT Specification Implementation:')
    console.log('   - Queue abstraction with enqueueJob() interface')
    console.log('   - Database-backed queue (temporary)')
    console.log('   - Row-level locking simulation')  
    console.log('   - Concurrency controls')
    console.log('   - Migration-ready architecture')
    console.log('   - No AI in request lifecycle')
    console.log('')
    
    // Initialize and start queue processing
    await queueManager.start()
    
    console.log('✅ Queue Worker is running!')
    console.log('🔄 Processing jobs in background...')
    console.log('📊 Monitor metrics at: GET /api/queue/process')
    console.log('')
    console.log('🛠️  TODO: Migrate to Redis/SQS for production scale')
    console.log('    - Change queue import in QueueManager.ts')
    console.log('    - Business logic remains unchanged')
    
    // Keep process alive
    process.on('SIGINT', async () => {
      console.log('')
      console.log('📥 Received SIGINT, shutting down gracefully...')
      await queueManager.stop()
      console.log('✅ Queue Worker stopped')
      process.exit(0)
    })

    // Health check every minute
    setInterval(async () => {
      try {
        const health = await queueManager.healthCheck()
        if (!health.healthy) {
          console.warn('⚠️  Queue health check failed:', health.metrics)
        } else {
          console.log(`💚 Queue healthy - P:${health.metrics.pending} R:${health.metrics.processing} C:${health.metrics.completed} F:${health.metrics.failed}`)
        }
      } catch (error) {
        console.error('❌ Health check error:', error)
      }
    }, 60000) // Every minute

  } catch (error) {
    console.error('❌ Failed to start queue worker:', error)
    process.exit(1)
  }
}

// Start the worker
startWorker().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})