import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const automatedApplySchema = z.object({
  jobId: z.string(),
  resumeData: z.object({
    contactInfo: z.object({
      fullName: z.string(),
      email: z.string(),
      phone: z.string(),
      linkedin: z.string().optional(),
      website: z.string().optional()
    }),
    summary: z.string().optional()
  }),
  customizedResumeUrl: z.string().optional(),
  coverLetter: z.string().optional(),
  useAutomation: z.boolean().default(true)
})

export async function POST(req: NextRequest) {
  console.log('=== AUTOMATED JOB APPLICATION API ===')
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { jobId, resumeData, customizedResumeUrl, coverLetter, useAutomation } = automatedApplySchema.parse(body)
    
    console.log('Automated application request:', {
      jobId,
      user: session.user.id,
      hasResumeUrl: !!customizedResumeUrl,
      hasCoverLetter: !!coverLetter,
      useAutomation
    })

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    console.log('Job details:', {
      title: job.title,
      company: job.company,
      publisher: job.source, // This should be job_publisher from JSearch
      applyUrl: job.url // This should be job_apply_link from JSearch
    })

    let applicationResult
    
    // Automation temporarily disabled for production stability
    console.log('Using redirect method for job application')
    
    applicationResult = {
      success: false,
      platform: job.source || 'unknown',
      method: 'redirect' as const,
      redirectUrl: job.url,
      error: 'Automation feature temporarily disabled - using manual application'
    }

    // Create response based on automation result
    if (applicationResult.success && applicationResult.method === 'automated') {
      // Successful automation - mark as applied immediately
      console.log('Automation successful, creating application record...')
      
      // Update job status
      await prisma.job.update({
        where: { id: job.id },
        data: { appliedTo: true }
      })

      // Create application record
      const application = await prisma.application.create({
        data: {
          userId: session.user.id,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
          jobUrl: job.url,
          location: job.location,
          salaryRange: job.salaryRange,
          employmentType: job.employmentType,
          customizedResumeUrl: customizedResumeUrl || '',
          coverLetter: coverLetter || '',
          status: 'APPLIED',
          source: 'automated',
          matchScore: 0.8, // Default for automated applications
          resumeCustomizationData: JSON.stringify({
            automationResult: applicationResult,
            appliedAt: new Date().toISOString()
          })
        }
      })

      return NextResponse.json({
        success: true,
        method: 'automated',
        platform: applicationResult.platform,
        data: {
          applicationId: application.id,
          confirmationId: applicationResult.confirmationId,
          message: `Successfully applied to ${job.title} at ${job.company} via automation`,
          appliedAt: application.appliedAt
        }
      })
      
    } else {
      // Automation failed or not attempted - return redirect info
      console.log('Automation failed or not attempted, returning redirect information')
      
      return NextResponse.json({
        success: false,
        method: applicationResult.method,
        platform: applicationResult.platform,
        redirectUrl: applicationResult.redirectUrl,
        error: applicationResult.error,
        data: {
          jobTitle: job.title,
          company: job.company,
          resumeUrl: customizedResumeUrl,
          coverLetter: coverLetter,
          message: 'Automation not available - please apply manually via the provided link'
        }
      })
    }

  } catch (error) {
    console.error('Automated application API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process automated application' },
      { status: 500 }
    )
  }
}

// Health check endpoint for the automation system
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if automation system can be loaded
    let automationAvailable = false
    let supportedPlatforms: string[] = []
    
    // Automation temporarily disabled for production stability
    automationAvailable = false
    supportedPlatforms = []

    return NextResponse.json({
      success: true,
      data: {
        automationAvailable,
        supportedPlatforms,
        browserReady: automationAvailable,
        message: automationAvailable ? 'Automation system is ready' : 'Automation system not available - will use redirects'
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check automation system status',
      data: {
        automationAvailable: false,
        supportedPlatforms: [],
        browserReady: false
      }
    })
  }
}