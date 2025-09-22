import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createJobSearchService } from '@/lib/jobAPIs'
import { z } from 'zod'

const jobDetailsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
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
    const { jobId } = jobDetailsSchema.parse(body)

    // Create job search service with automatic fallback
    const jsearchApiKey = process.env.JSEARCH_API_KEY
    const jobAPI = createJobSearchService(jsearchApiKey)

    // Get job details
    const jobDetails = await jobAPI.getJobDetails(jobId)

    if (!jobDetails) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: jobDetails
    })

  } catch (error) {
    console.error('Job details error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('API error')) {
      return NextResponse.json(
        { error: 'Job details service temporarily unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get job details' },
      { status: 500 }
    )
  }
}