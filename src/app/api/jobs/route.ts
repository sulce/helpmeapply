import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const jobsQuerySchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(50).optional(),
  source: z.string().optional(),
  appliedTo: z.boolean().optional(),
  minMatchScore: z.number().min(0).max(1).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const queryParams = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      source: searchParams.get('source') || undefined,
      appliedTo: searchParams.get('appliedTo') ? searchParams.get('appliedTo') === 'true' : undefined,
      minMatchScore: searchParams.get('minMatchScore') ? parseFloat(searchParams.get('minMatchScore')!) : undefined,
    }

    const validatedParams = jobsQuerySchema.parse(queryParams)

    // Build where clause - show jobs relevant to current user
    console.log('Jobs API - User ID from session:', session.user.id)
    
    // Get job IDs from user's notifications and application reviews
    const [userNotifications, userApplicationReviews] = await Promise.all([
      prisma.jobNotification.findMany({
        where: { userId: session.user.id },
        select: { jobId: true }
      }),
      prisma.applicationReview.findMany({
        where: { userId: session.user.id },
        select: { jobId: true }
      })
    ])
    
    const jobIds = [
      ...userNotifications.map(n => n.jobId),
      ...userApplicationReviews.map(r => r.jobId)
    ]
    
    // Remove duplicates
    const uniqueJobIds = [...new Set(jobIds)]
    
    console.log('Jobs API - Job IDs from notifications:', userNotifications.length)
    console.log('Jobs API - Job IDs from reviews:', userApplicationReviews.length)
    console.log('Jobs API - Unique job IDs:', uniqueJobIds.length)
    
    // If no jobs found for user, return empty results
    if (uniqueJobIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          jobs: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: validatedParams.limit || 20,
            hasMore: false,
          }
        }
      })
    }
    
    const where: any = {
      id: { in: uniqueJobIds }
    }
    
    console.log('Jobs API - Query where clause:', JSON.stringify(where, null, 2))
    if (validatedParams.source) {
      where.source = validatedParams.source
    }
    if (validatedParams.appliedTo !== undefined) {
      where.appliedTo = validatedParams.appliedTo
    }
    if (validatedParams.minMatchScore !== undefined) {
      where.matchScore = { gte: validatedParams.minMatchScore }
    }

    // Get jobs with pagination
    const page = validatedParams.page || 1
    const limit = validatedParams.limit || 20
    const skip = (page - 1) * limit
    
    const [jobs, totalCount] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          jobNotifications: {
            where: { userId: session.user.id },
            select: { 
              id: true, 
              userId: true, 
              status: true, 
              customizedResume: true,
              coverLetter: true,
              matchScore: true 
            }
          }
        }
      }),
      prisma.job.count({ where })
    ])

    console.log('Jobs API - Found jobs:', jobs.length)
    console.log('Jobs API - Total count:', totalCount)
    
    // Debug: Check what notifications exist for this user
    const allNotifications = await prisma.jobNotification.findMany({
      where: { userId: session.user.id },
      include: { job: { select: { id: true, title: true, company: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    console.log('Jobs API - User notifications count:', allNotifications.length)
    console.log('Jobs API - Recent notifications:', allNotifications.map(n => ({
      id: n.id,
      jobId: n.jobId,
      userId: n.userId,
      jobTitle: n.job?.title,
      company: n.job?.company
    })))
    
    // Debug: Check if the jobs referenced in notifications actually exist
    const notificationJobIds = allNotifications.map(n => n.jobId)
    const existingJobs = await prisma.job.findMany({
      where: { id: { in: notificationJobIds } },
      select: { id: true, title: true, company: true }
    })
    console.log('Jobs API - Jobs referenced in notifications:', notificationJobIds.length)
    console.log('Jobs API - Jobs that actually exist:', existingJobs.length)
    console.log('Jobs API - Existing jobs:', existingJobs)
    
    console.log('Jobs API - Sample jobs with notifications:', jobs.slice(0, 2).map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      createdAt: job.createdAt,
      notifications: job.jobNotifications
    })))
    
    // Debug: Log the full notification data
    if (jobs.length > 0 && jobs[0].jobNotifications?.length > 0) {
      console.log('Jobs API - Full notification data for first job:', JSON.stringify(jobs[0].jobNotifications[0], null, 2))
    }

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasMore: page < totalPages,
        }
      }
    })

  } catch (error) {
    console.error('Jobs fetch error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}