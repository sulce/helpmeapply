import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createJobSearchService, JobSearchParams } from '@/lib/jobAPIs'
import { z } from 'zod'

const jobSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  location: z.string().optional(),
  datePosted: z.enum(['all', 'today', '3days', 'week', 'month']).optional(),
  employmentTypes: z.array(z.string()).optional(),
  jobRequirements: z.array(z.string()).optional(),
  page: z.number().min(1).optional(),
  numPages: z.number().min(1).max(3).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const searchParams = jobSearchSchema.parse(body)

    // Create job search service with automatic fallback
    const jsearchApiKey = process.env.JSEARCH_API_KEY
    const jobAPI = createJobSearchService(jsearchApiKey)

    // Search for jobs
    const jobSearchParams: JobSearchParams = {
      query: searchParams.query,
      location: searchParams.location,
      datePosted: searchParams.datePosted || 'all',
      employmentTypes: searchParams.employmentTypes,
      jobRequirements: searchParams.jobRequirements,
      page: searchParams.page || 1,
      numPages: searchParams.numPages || 1,
    }

    const results = await jobAPI.searchJobs(jobSearchParams)

    return NextResponse.json({
      success: true,
      data: {
        jobs: results.jobs,
        totalResults: results.totalResults,
        currentPage: results.currentPage,
        hasMore: results.hasMore,
      }
    })

  } catch (error) {
    console.error('Job search error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('API error')) {
      return NextResponse.json(
        { error: 'Job search service temporarily unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search jobs' },
      { status: 500 }
    )
  }
}