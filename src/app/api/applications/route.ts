import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { withSubscription } from '@/lib/billing'
import { checkUsageLimit, incrementUsage } from '@/lib/billing/usageTracking'
import { z } from 'zod'

const createApplicationSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  jobDescription: z.string().optional(),
  jobUrl: z.string().url().optional(),
  location: z.string().optional(),
  salaryRange: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'REMOTE']).optional(),
  coverLetter: z.string().optional(),
  matchScore: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
  sourceJobId: z.string().optional(),
  notes: z.string().optional(),
})

const updateApplicationSchema = z.object({
  status: z.enum(['APPLIED', 'REVIEWING', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN']).optional(),
  responseAt: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export const POST = withSubscription(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json()
    const data = createApplicationSchema.parse(body)

    // Check if this is an auto application (has source specified)
    const isAutoApplication = data.source && data.source !== 'manual'

    // For auto applications, check usage limit
    if (isAutoApplication) {
      const canApply = await checkUsageLimit(user.id, 'auto_application')
      if (!canApply) {
        return NextResponse.json(
          { 
            error: 'Auto application limit reached for current billing period',
            quotaExceeded: true,
            upgradeRequired: true
          },
          { status: 402 }
        )
      }
    }

    // Create the application
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobTitle: data.jobTitle,
        company: data.company,
        jobDescription: data.jobDescription,
        jobUrl: data.jobUrl,
        location: data.location,
        salaryRange: data.salaryRange,
        employmentType: data.employmentType,
        coverLetter: data.coverLetter,
        matchScore: data.matchScore,
        source: data.source,
        sourceJobId: data.sourceJobId,
        notes: data.notes,
      },
    })

    // If this was an auto application, increment the usage counter
    if (isAutoApplication) {
      try {
        await incrementUsage(user.id, 'auto_application')
        console.log(`Auto application usage incremented for user ${user.id}`)
      } catch (usageError) {
        console.error('Failed to increment usage:', usageError)
        // Even if usage increment fails, we keep the application since it was already created
      }
    }

    return NextResponse.json({ application }, { status: 201 })
  } catch (error) {
    console.error('Application creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
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
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = {
      userId: session.user.id,
      ...(status && { status: status as any }),
    }

    console.log('Applications API - Fetching applications for user:', session.user.id)
    
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { appliedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          jobTitle: true,
          company: true,
          jobDescription: true,
          jobUrl: true,
          location: true,
          salaryRange: true,
          employmentType: true,
          status: true,
          appliedAt: true,
          responseAt: true,
          notes: true,
          coverLetter: true,
          customizedResumeUrl: true,
          resumeCustomizationData: true,
          matchScore: true,
          source: true,
          sourceJobId: true,
          createdAt: true,
          updatedAt: true,
          customizedResumes: {
            select: {
              id: true,
              customizedResumeUrl: true,
              matchScore: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.application.count({ where }),
    ])

    console.log('Applications API - Found applications:', applications.length)
    
    // Debug: Log first application's data structure
    if (applications.length > 0) {
      const firstApp = applications[0]
      console.log('Applications API - First application data:', {
        id: firstApp.id,
        jobTitle: firstApp.jobTitle,
        company: firstApp.company,
        hasCoverLetter: !!firstApp.coverLetter,
        hasCustomizedResumeUrl: !!firstApp.customizedResumeUrl,
        hasResumeCustomizationData: !!firstApp.resumeCustomizationData,
        customizedResumesCount: firstApp.customizedResumes?.length || 0
      })
    }

    // Calculate some stats
    const stats = await prisma.application.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: { status: true },
    })

    const statusCounts = stats.reduce((acc: any, stat: any) => {
      acc[stat.status] = stat._count.status
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({ 
      applications, 
      total,
      stats: statusCounts,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Applications fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}