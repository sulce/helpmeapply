import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobScheduler } from '@/lib/jobQueue/scheduler'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get queue metrics
    const metrics = await jobScheduler.getQueueMetrics()
    
    // Get schedule configuration
    const schedules = Object.fromEntries(jobScheduler.getSchedules())

    // Get recent jobs for the current user
    const recentJobs = await prisma.jobQueue.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      select: {
        jobId: true,
        status: true,
        priority: true,
        attempts: true,
        maxAttempts: true,
        createdAt: true,
        processedAt: true,
        errorMessage: true,
      },
    })

    // Parse job types from errorMessage for recent jobs
    const parsedRecentJobs = recentJobs.map(job => {
      let jobType = 'unknown'
      try {
        const metadata = JSON.parse(job.errorMessage || '{}')
        jobType = metadata.type || 'unknown'
      } catch {
        // Ignore parsing errors
      }

      return {
        ...job,
        type: jobType,
        errorMessage: undefined, // Don't expose internal error messages
      }
    })

    // Get user's job scanning stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const applicationsToday = await prisma.application.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: today },
      },
    })

    const totalApplications = await prisma.application.count({
      where: {
        userId: session.user.id,
      },
    })

    const pendingNotifications = await prisma.jobNotification.count({
      where: {
        userId: session.user.id,
        status: 'PENDING',
      },
    })

    const pendingReviews = await prisma.applicationReview.count({
      where: {
        userId: session.user.id,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        queueMetrics: metrics,
        schedules,
        recentJobs: parsedRecentJobs,
        userStats: {
          applicationsToday,
          totalApplications,
          pendingNotifications,
          pendingReviews,
        },
      }
    })

  } catch (error) {
    console.error('Queue status error:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}