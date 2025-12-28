import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createJobSearchService, JobSearchParams } from '@/lib/jobAPIs'
import { resolveJobPreferences } from '@/lib/preferenceResolver'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Resolve job preferences based on user's preference source
    const preferences = await resolveJobPreferences(session.user.id)
    
    console.log(`🚀 [VALIDATION] Auto job search triggered for user ${session.user.id}:`)
    console.log(`  ✅ Final Query: "${preferences.query}"`)
    console.log(`  📍 Location: "${preferences.location || 'Any'}"`)
    console.log(`  💼 Employment Types: [${preferences.employmentTypes.join(', ')}]`)
    console.log(`  📊 Preference Source: ${preferences.source}`)
    console.log(`  🔄 Search came from: ${preferences.source === 'RESUME' ? 'Resume extraction' : 'User-defined preferences'}`)

    // Create job search service with automatic fallback
    const jsearchApiKey = process.env.JSEARCH_API_KEY
    const jobAPI = createJobSearchService(jsearchApiKey)

    // Search for jobs using resolved preferences
    const jobSearchParams: JobSearchParams = {
      query: preferences.query,
      location: preferences.location,
      datePosted: 'week', // Recent jobs for auto-search
      employmentTypes: preferences.employmentTypes,
      page: 1,
      numPages: 1,
    }

    const results = await jobAPI.searchJobs(jobSearchParams)

    return NextResponse.json({
      success: true,
      data: {
        jobs: results.jobs,
        totalResults: results.totalResults,
        preferences: {
          query: preferences.query,
          source: preferences.source
        }
      }
    })

  } catch (error) {
    console.error('Auto job search error:', error)
    
    if (error instanceof Error && error.message.includes('User profile not found')) {
      return NextResponse.json(
        { error: 'Profile not found. Please complete your profile first.' },
        { status: 404 }
      )
    }

    if (error instanceof Error && error.message.includes('API error')) {
      return NextResponse.json(
        { error: 'Job search service temporarily unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search jobs automatically' },
      { status: 500 }
    )
  }
}