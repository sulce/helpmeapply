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
    // Jobs are global, so no authentication required for viewing

    const { searchParams } = new URL(req.url)
    const queryParams = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      source: searchParams.get('source') || undefined,
      appliedTo: searchParams.get('appliedTo') ? searchParams.get('appliedTo') === 'true' : undefined,
      minMatchScore: searchParams.get('minMatchScore') ? parseFloat(searchParams.get('minMatchScore')!) : undefined,
    }

    const validatedParams = jobsQuerySchema.parse(queryParams)

    // Build where clause
    const where: any = {}
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
      }),
      prisma.job.count({ where })
    ])

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