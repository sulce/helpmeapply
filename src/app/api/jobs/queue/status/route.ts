import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobScheduler } from '@/lib/jobQueue/scheduler'
import { prisma } from '@/lib/db'

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
        id: true,
        type: true,
        status: true,
        priority: true,
        attemptCount: true,
        maxAttempts: true,
        createdAt: true,
        processedAt: true,
        errorMessage: true,
      },
    })

    // Use type field directly from new schema
    const parsedRecentJobs = recentJobs.map((job: any) => ({
      ...job,
      errorMessage: undefined, // Don't expose internal error messages
    }))

    // Get user's job scanning stats with optimized parallel queries
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [applicationsToday, totalApplications, pendingNotifications, pendingReviews] = await Promise.all([
      prisma.application.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: today },
        },
      }),
      prisma.application.count({
        where: {
          userId: session.user.id,
        },
      }),
      prisma.jobNotification.count({
        where: {
          userId: session.user.id,
          status: 'PENDING',
        },
      }),
      prisma.applicationReview.count({
        where: {
          userId: session.user.id,
          status: 'PENDING',
        },
      })
    ])

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