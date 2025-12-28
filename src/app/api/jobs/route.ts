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
  filter: z.enum(['all', 'new', 'available', 'applied']).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log('Jobs API - Session:', session?.user?.id ? `Authenticated (${session.user.id})` : 'No session')
    
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
      filter: searchParams.get('filter') as 'all' | 'new' | 'available' | 'applied' || 'all',
    }

    const validatedParams = jobsQuerySchema.parse(queryParams)

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
    if (validatedParams.source) {
      where.source = validatedParams.source
    }
    if (validatedParams.appliedTo !== undefined) {
      where.appliedTo = validatedParams.appliedTo
    }
    if (validatedParams.minMatchScore !== undefined) {
      where.matchScore = { gte: validatedParams.minMatchScore }
    }

    // Apply frontend filter logic at database level
    if (validatedParams.filter === 'new') {
      // Show jobs from the last 24 hours that haven't been applied to
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      where.createdAt = { gte: yesterday }
      where.appliedTo = false
    } else if (validatedParams.filter === 'available') {
      where.appliedTo = false
    } else if (validatedParams.filter === 'applied') {
      where.appliedTo = true
    }
    // 'all' filter doesn't add any conditions

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
              status: true, 
              customizedResume: true,
              matchScore: true 
            }
          }
        }
      }),
      prisma.job.count({ where })
    ])

    // Log basic performance info only
    console.log(`Jobs API - Fetched ${jobs.length}/${totalCount} jobs for user ${session.user.id}`)

    const totalPages = Math.ceil(totalCount / limit)

    // Add canAutoApply flag and sourceInfo based on actual job URL
    const { normalizeJobWithSource } = await import('@/lib/jobSourceDetector')
    
    const jobsWithAutoApply = jobs.map(job => {
      const normalizedJob = normalizeJobWithSource(job)
      return {
        ...job,
        canAutoApply: normalizedJob.canAutoApply,
        sourceInfo: normalizedJob.sourceInfo,
        automationType: normalizedJob.automationType
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobsWithAutoApply,
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