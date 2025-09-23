import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { structuredResumeCustomizer } from '@/lib/structuredResumeCustomizer'
import { z } from 'zod'

const applyJobSchema = z.object({
  jobId: z.string(),
  resumeData: z.object({
    contactInfo: z.object({
      fullName: z.string(),
      email: z.string(),
      phone: z.string(),
      address: z.string(),
      linkedin: z.string().optional(),
      website: z.string().optional()
    }),
    professionalSummary: z.string().optional().default(''),
    experience: z.array(z.any()).default([]),
    education: z.array(z.any()).default([]),
    skills: z.array(z.any()).default([]),
    certifications: z.array(z.string()).default([]),
    projects: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([])
  }),
  coverLetter: z.string().optional(),
  customizeResume: z.boolean().default(true)
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
    const { jobId, resumeData, coverLetter, customizeResume } = applyJobSchema.parse(body)

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

    let finalResumeUrl: string
    let customizationNotes: string[] = []
    let keywordMatches: string[] = []
    let matchScore = 0

    if (customizeResume) {
      // Customize resume for this specific job
      const customizationResult = await structuredResumeCustomizer.customizeResumeForJob(
        resumeData,
        {
          id: job.id,
          title: job.title,
          company: job.company,
          description: job.description || '',
          requirements: []
        },
        session.user.id
      )

      finalResumeUrl = customizationResult.customizedPdfUrl
      customizationNotes = customizationResult.customizationNotes
      keywordMatches = customizationResult.keywordMatches
      matchScore = customizationResult.matchScore
    } else {
      // Use base resume without customization
      const { generateStructuredResumePDF } = await import('@/lib/structuredPdfGenerator')
      finalResumeUrl = await generateStructuredResumePDF(resumeData, session.user.id)
    }

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
        customizedResumeUrl: finalResumeUrl,
        coverLetter: coverLetter || '',
        status: 'APPLIED',
        source: 'manual',
        matchScore: matchScore,
        resumeCustomizationData: customizeResume ? JSON.stringify({
          customizationNotes,
          keywordMatches,
          matchScore,
          customizedAt: new Date().toISOString()
        }) : null
      }
    })

    // Create customized resume record for tracking
    if (customizeResume) {
      await prisma.customizedResume.create({
        data: {
          userId: session.user.id,
          jobId: job.id,
          applicationId: application.id,
          originalResumeUrl: finalResumeUrl, // Required field
          jobTitle: job.title, // Required field
          company: job.company, // Required field
          customizedContent: JSON.stringify(resumeData), // Store the structured data
          customizedResumeUrl: finalResumeUrl,
          customizationData: JSON.stringify({
            customizationNotes,
            keywordMatches,
            matchScore
          }),
          keywordMatches: JSON.stringify(keywordMatches),
          matchScore: matchScore
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        applicationId: application.id,
        resumeUrl: finalResumeUrl,
        matchScore: matchScore,
        customizationNotes: customizationNotes,
        keywordMatches: keywordMatches,
        appliedAt: application.appliedAt,
        message: `Successfully applied to ${job.title} at ${job.company}`
      }
    })

  } catch (error) {
    console.error('Job application error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit job application' },
      { status: 500 }
    )
  }
}

// Get applications with customized resume details
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
    const jobId = searchParams.get('jobId')

    if (jobId) {
      // Get specific application details
      const application = await prisma.application.findFirst({
        where: {
          userId: session.user.id,
          id: jobId
        },
        include: {
          customizedResumes: true
        }
      })

      if (!application) {
        return NextResponse.json(
          { error: 'Application not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: application
      })
    } else {
      // Get all applications for user
      const applications = await prisma.application.findMany({
        where: { userId: session.user.id },
        include: {
          customizedResumes: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { appliedAt: 'desc' }
      })

      return NextResponse.json({
        success: true,
        data: applications
      })
    }

  } catch (error) {
    console.error('Get applications error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve applications' },
      { status: 500 }
    )
  }
}