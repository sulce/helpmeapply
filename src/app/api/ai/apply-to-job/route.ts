import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { analyzeJobMatch, generateCoverLetter, JobMatchingRequest, CoverLetterRequest } from '@/lib/openai'
import { resumeCustomizationService, ResumeCustomizationRequest } from '@/lib/resumeCustomizationService'
import { z } from 'zod'

const applyToJobSchema = z.object({
  job: z.object({
    title: z.string().min(1, 'Job title is required'),
    company: z.string().min(1, 'Company is required'),
    description: z.string().min(1, 'Job description is required'),
    requirements: z.array(z.string()).optional().default([]),
    location: z.string().optional(),
    salaryRange: z.string().optional(),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'REMOTE']).optional(),
    jobUrl: z.string().url().optional(),
    source: z.string().optional(),
    sourceJobId: z.string().optional(),
  }),
  autoApply: z.boolean().default(false), // If true, auto-apply if match score > threshold
  minMatchScore: z.number().min(0).max(1).default(0.7), // Minimum score to auto-apply
  customizeResume: z.boolean().default(true), // Whether to customize resume for this job
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
    const { job, autoApply, minMatchScore, customizeResume } = applyToJobSchema.parse(body)

    // Get user profile and skills
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: { skills: true },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found. Please complete your profile first.' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const jobTitlePrefs = profile.jobTitlePrefs ? JSON.parse(profile.jobTitlePrefs) : []
    const preferredLocations = profile.preferredLocations ? JSON.parse(profile.preferredLocations) : []
    const employmentTypes = profile.employmentTypes ? JSON.parse(profile.employmentTypes) : []

    // Check if already applied to this job
    const existingApplication = await prisma.application.findFirst({
      where: {
        userId: session.user.id,
        company: job.company,
        jobTitle: job.title,
        ...(job.sourceJobId && { sourceJobId: job.sourceJobId }),
      },
    })

    if (existingApplication) {
      return NextResponse.json(
        { 
          error: 'Already applied to this job',
          existingApplication: {
            id: existingApplication.id,
            appliedAt: existingApplication.appliedAt,
            status: existingApplication.status,
          }
        },
        { status: 409 }
      )
    }

    // Validate environment
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured', details: 'OPENAI_API_KEY environment variable is missing' },
        { status: 500 }
      )
    }

    // Validate profile completeness
    if (!profile.fullName) {
      return NextResponse.json(
        { error: 'Profile incomplete', details: 'Full name is required in profile' },
        { status: 400 }
      )
    }

    if (profile.skills.length === 0) {
      return NextResponse.json(
        { error: 'Profile incomplete', details: 'At least one skill is required in profile' },
        { status: 400 }
      )
    }

    // Build matching request
    const matchingRequest: JobMatchingRequest = {
      profile: {
        fullName: profile.fullName,
        skills: profile.skills.map((skill: any) => ({
          name: skill.name,
          proficiency: skill.proficiency,
          yearsUsed: skill.yearsUsed || undefined,
        })),
        jobTitlePrefs,
        yearsExperience: profile.yearsExperience || undefined,
        preferredLocations,
        employmentTypes,
      },
      jobDescription: {
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        salaryRange: job.salaryRange,
        employmentType: job.employmentType,
      },
    }

    // Analyze job match
    let matchResult
    try {
      console.log('Starting job match analysis...')
      matchResult = await analyzeJobMatch(matchingRequest)
      console.log('Job match analysis completed:', matchResult.matchScore)
    } catch (error) {
      console.error('Job match analysis failed:', error)
      throw new Error(`Failed to analyze job match: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Customize resume if requested and user has a resume
    let customizedResumeData = null
    if (customizeResume && profile.resumeUrl) {
      try {
        const resumeCustomizationRequest: ResumeCustomizationRequest = {
          originalResume: {
            url: profile.resumeUrl,
            filename: 'resume.pdf',
          },
          job: {
            title: job.title,
            company: job.company,
            description: job.description,
            requirements: job.requirements,
          },
          profile: {
            fullName: profile.fullName,
            skills: profile.skills.map((skill: any) => ({
              name: skill.name,
              proficiency: skill.proficiency,
              yearsUsed: skill.yearsUsed || undefined,
            })),
            jobTitlePrefs,
            yearsExperience: profile.yearsExperience || undefined,
          },
        }

        customizedResumeData = await resumeCustomizationService.customizeResume(resumeCustomizationRequest, session.user.id)
      } catch (error) {
        console.error('Resume customization failed:', error)
        // Continue with application even if resume customization fails
      }
    }

    // Generate cover letter
    let coverLetter
    try {
      console.log('Starting cover letter generation...')
      const coverLetterRequest: CoverLetterRequest = {
        profile: {
          fullName: profile.fullName,
          skills: profile.skills.map((skill: any) => ({
            name: skill.name,
            proficiency: skill.proficiency,
            yearsUsed: skill.yearsUsed || undefined,
          })),
          jobTitlePrefs,
          yearsExperience: profile.yearsExperience || undefined,
        },
        job: {
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: job.requirements,
        },
      }

      coverLetter = await generateCoverLetter(coverLetterRequest)
      console.log('Cover letter generated successfully')
    } catch (error) {
      console.error('Cover letter generation failed:', error)
      throw new Error(`Failed to generate cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Decide whether to apply
    const shouldApply = autoApply && matchResult.matchScore >= minMatchScore
    let application = null

    if (shouldApply) {
      // Create application record
      application = await prisma.application.create({
        data: {
          userId: session.user.id,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
          jobUrl: job.jobUrl,
          location: job.location,
          salaryRange: job.salaryRange,
          employmentType: job.employmentType,
          coverLetter,
          customizedResumeUrl: customizedResumeData?.customizedPdfUrl || null,
          resumeCustomizationData: customizedResumeData ? JSON.stringify({
            customizationNotes: customizedResumeData.customizationNotes,
            keywordMatches: customizedResumeData.keywordMatches,
            suggestedImprovements: customizedResumeData.suggestedImprovements,
          }) : null,
          matchScore: matchResult.matchScore,
          source: job.source,
          sourceJobId: job.sourceJobId,
          notes: `AI Applied: ${matchResult.recommendation} (${Math.round(matchResult.matchScore * 100)}% match)`,
          status: 'APPLIED',
        },
      })

      // Create customized resume record if we have customization data
      if (customizedResumeData) {
        await prisma.customizedResume.create({
          data: {
            userId: session.user.id,
            applicationId: application.id,
            originalResumeUrl: profile.resumeUrl!,
            customizedResumeUrl: customizedResumeData.customizedPdfUrl || null,
            customizedContent: customizedResumeData.customizedContent,
            jobTitle: job.title,
            company: job.company,
            customizationData: JSON.stringify({
              customizationNotes: customizedResumeData.customizationNotes,
              suggestedImprovements: customizedResumeData.suggestedImprovements,
            }),
            matchScore: matchResult.matchScore,
            keywordMatches: JSON.stringify(customizedResumeData.keywordMatches),
          },
        })
      }
    }

    return NextResponse.json({
      matchResult,
      coverLetter,
      customizedResume: customizedResumeData ? {
        customizedContent: customizedResumeData.customizedContent,
        customizationNotes: customizedResumeData.customizationNotes,
        keywordMatches: customizedResumeData.keywordMatches,
        suggestedImprovements: customizedResumeData.suggestedImprovements,
      } : null,
      shouldApply,
      applied: !!application,
      application: application ? {
        id: application.id,
        appliedAt: application.appliedAt,
        matchScore: application.matchScore,
        hasCustomizedResume: !!customizedResumeData,
      } : null,
      analysis: {
        passedThreshold: matchResult.matchScore >= minMatchScore,
        threshold: minMatchScore,
        autoApplyEnabled: autoApply,
        resumeCustomized: !!customizedResumeData,
      }
    })

  } catch (error) {
    console.error('AI job application error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    // More specific error handling
    let errorMessage = 'Failed to process job application'
    let errorDetails = null

    if (error instanceof Error) {
      errorMessage = error.message
      
      // Check for specific error types
      if (error.message.includes('OPENAI_API_KEY')) {
        errorDetails = 'OpenAI API key is not configured'
      } else if (error.message.includes('Prisma')) {
        errorDetails = 'Database connection error'
      } else if (error.message.includes('Profile not found')) {
        errorDetails = 'User profile is incomplete'
      } else if (error.message.includes('Failed to analyze job match')) {
        errorDetails = 'OpenAI job matching service is unavailable'
      } else if (error.message.includes('Failed to generate cover letter')) {
        errorDetails = 'OpenAI cover letter service is unavailable'
      } else if (error.message.includes('Failed to customize resume')) {
        errorDetails = 'Resume customization service failed'
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    )
  }
}