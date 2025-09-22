#!/usr/bin/env node

/**
 * Background Job Queue Startup Script
 * 
 * This script initializes and starts the background job processing system.
 * It should be run as a separate process alongside the main Next.js application.
 * 
 * Usage:
 *   npm run job-queue:start
 *   or
 *   npx ts-node src/scripts/start-job-queue.ts
 */

import { jobScheduler } from '../lib/jobQueue/scheduler'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting HelpMeApply Background Job Queue...')
  console.log('Time:', new Date().toISOString())
  
  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // Start the job scheduler
    await jobScheduler.start()
    console.log('✅ Job scheduler started successfully')

    // Log initial queue metrics
    const metrics = await jobScheduler.getQueueMetrics()
    console.log('📊 Initial Queue Metrics:', metrics)

    // Log configured schedules
    const schedules = Object.fromEntries(jobScheduler.getSchedules())
    console.log('📋 Configured Schedules:')
    Object.entries(schedules).forEach(([type, config]) => {
      console.log(`  - ${type}: ${config.enabled ? '✅' : '❌'} ${config.cronExpression}`)
    })

    console.log('\n🎯 Background job queue is now running!')
    console.log('Press Ctrl+C to stop gracefully\n')

  } catch (error) {
    console.error('❌ Failed to start job queue:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
async function shutdown() {
  console.log('\n🛑 Shutting down gracefully...')
  
  try {
    await jobScheduler.stop()
    console.log('✅ Job scheduler stopped')
    
    await prisma.$disconnect()
    console.log('✅ Database disconnected')
    
    console.log('👋 Goodbye!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('SIGQUIT', shutdown)

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  shutdown()
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  shutdown()
})

// Start the application
main().catch(error => {
  console.error('❌ Failed to start:', error)
  process.exit(1)
})