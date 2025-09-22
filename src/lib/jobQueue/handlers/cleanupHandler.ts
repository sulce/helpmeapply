import { JobResult } from '../types'
import { jobNotificationService } from '../../jobNotificationService'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function handleCleanupExpiredReviews(): Promise<JobResult> {
  const startTime = Date.now()
  
  try {
    console.log('Processing cleanup of expired application reviews')
    
    // Process expired reviews using the notification service
    const processed = await jobNotificationService.processExpiredReviews()
    
    const duration = Date.now() - startTime
    console.log(`Expired review cleanup completed in ${duration}ms: ${processed} reviews processed`)
    
    return {
      success: true,
      data: {
        processed,
        type: 'expired_reviews',
      },
      duration,
    }
  } catch (error) {
    console.error('Expired review cleanup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in expired review cleanup',
      duration: Date.now() - startTime,
    }
  }
}

export async function handleCleanupExpiredNotifications(): Promise<JobResult> {
  const startTime = Date.now()
  
  try {
    console.log('Processing cleanup of expired job notifications')
    
    // Find notifications that have been expired for more than 7 days
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const expiredNotifications = await prisma.jobNotification.findMany({
      where: {
        OR: [
          {
            status: 'EXPIRED',
            updatedAt: { lt: cutoffDate },
          },
          {
            expiresAt: {
              not: null,
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expire after 30 days
            },
            status: {
              in: ['PENDING', 'VIEWED'],
            },
          },
        ],
      },
    })

    let processed = 0
    for (const notification of expiredNotifications) {
      // Update notification to expired status
      await prisma.jobNotification.update({
        where: { id: notification.id },
        data: {
          status: 'EXPIRED',
          updatedAt: new Date(),
        },
      })
      processed++
    }

    // Clean up old expired notifications (older than 90 days)
    const veryOldCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const deleted = await prisma.jobNotification.deleteMany({
      where: {
        status: 'EXPIRED',
        updatedAt: { lt: veryOldCutoff },
      },
    })

    const duration = Date.now() - startTime
    console.log(`Expired notification cleanup completed in ${duration}ms: ${processed} expired, ${deleted.count} deleted`)
    
    return {
      success: true,
      data: {
        expired: processed,
        deleted: deleted.count,
        type: 'expired_notifications',
      },
      duration,
    }
  } catch (error) {
    console.error('Expired notification cleanup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in expired notification cleanup',
      duration: Date.now() - startTime,
    }
  }
}

export async function handleCleanupOldJobs(): Promise<JobResult> {
  const startTime = Date.now()
  
  try {
    console.log('Processing cleanup of old job records')
    
    // Clean up jobs that haven't been processed and are older than 30 days
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const deletedUnprocessed = await prisma.job.deleteMany({
      where: {
        isProcessed: false,
        appliedTo: false,
        createdAt: { lt: cutoffDate },
      },
    })

    // Clean up very old processed jobs (older than 180 days)
    const veryOldCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    const deletedOld = await prisma.job.deleteMany({
      where: {
        isProcessed: true,
        appliedTo: false, // Keep jobs we applied to for record keeping
        createdAt: { lt: veryOldCutoff },
      },
    })

    const totalDeleted = deletedUnprocessed.count + deletedOld.count
    const duration = Date.now() - startTime
    console.log(`Old job cleanup completed in ${duration}ms: ${totalDeleted} jobs deleted (${deletedUnprocessed.count} unprocessed, ${deletedOld.count} old processed)`)
    
    return {
      success: true,
      data: {
        deletedUnprocessed: deletedUnprocessed.count,
        deletedOld: deletedOld.count,
        totalDeleted,
        type: 'old_jobs',
      },
      duration,
    }
  } catch (error) {
    console.error('Old job cleanup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in old job cleanup',
      duration: Date.now() - startTime,
    }
  }
}

export async function handleDailyMaintenanceCleanup(): Promise<JobResult> {
  const startTime = Date.now()
  
  try {
    console.log('Processing daily maintenance cleanup')
    
    // Run all cleanup tasks in sequence
    const reviewsResult = await handleCleanupExpiredReviews()
    const notificationsResult = await handleCleanupExpiredNotifications()
    const jobsResult = await handleCleanupOldJobs()

    const duration = Date.now() - startTime
    const success = reviewsResult.success && notificationsResult.success && jobsResult.success
    
    console.log(`Daily maintenance cleanup completed in ${duration}ms`)
    
    return {
      success,
      data: {
        reviews: reviewsResult.data,
        notifications: notificationsResult.data,
        jobs: jobsResult.data,
        type: 'daily_maintenance',
      },
      duration,
    }
  } catch (error) {
    console.error('Daily maintenance cleanup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in daily maintenance cleanup',
      duration: Date.now() - startTime,
    }
  }
}