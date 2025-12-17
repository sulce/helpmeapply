import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jobApplicationAutomation } from '@/lib/jobApplicationAutomation'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { testJobUrl, platform } = await req.json()

    if (!testJobUrl || !platform) {
      return NextResponse.json(
        { error: 'Missing testJobUrl or platform' },
        { status: 400 }
      )
    }

    console.log('=== TESTING AUTOMATION ===')
    console.log('Test URL:', testJobUrl)
    console.log('Platform:', platform)

    // Test automation with dummy data
    const testResult = await jobApplicationAutomation.applyToJob(
      testJobUrl,
      platform,
      {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '+1-555-0123',
        resumeUrl: 'https://example.com/resume.pdf',
        coverLetter: 'This is a test cover letter for automation testing.',
        linkedinProfile: 'https://linkedin.com/in/testuser'
      }
    )

    return NextResponse.json({
      success: true,
      testResult,
      message: 'Automation test completed'
    })

  } catch (error) {
    console.error('Automation test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      message: 'Automation test failed'
    }, { status: 500 })
  }
}

// Get automation system status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Initialize browser to test if it works
    try {
      await jobApplicationAutomation.initBrowser()
      await jobApplicationAutomation.closeBrowser()
      
      return NextResponse.json({
        success: true,
        data: {
          browserAvailable: true,
          supportedPlatforms: ['indeed', 'greenhouse'],
          testEndpoint: '/api/jobs/test-automation',
          message: 'Automation system is ready for testing',
          automationCoverage: {
            indeed: 'Full automation support',
            greenhouse: 'Full automation support', 
            linkedin: 'Manual redirect (coming soon)',
            workday: 'Manual redirect (planned)',
            other: 'Manual redirect with customized documents'
          }
        }
      })
    } catch (browserError) {
      return NextResponse.json({
        success: false,
        data: {
          browserAvailable: false,
          supportedPlatforms: [],
          error: browserError instanceof Error ? browserError.message : 'Browser init failed'
        }
      })
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check automation status'
    }, { status: 500 })
  }
}