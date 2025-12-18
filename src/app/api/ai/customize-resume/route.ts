import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { resumeCustomizationService, ResumeCustomizationRequest } from '@/lib/resumeCustomizationService'
import { pdfGenerator } from '@/lib/pdfGenerator'
import { z } from 'zod'

const customizeResumeSchema = z.object({
  jobId: z.string().optional(),
  jobDescription: z.object({
    title: z.string().min(1, 'Job title is required'),
    company: z.string().min(1, 'Company is required'),
    description: z.string().min(1, 'Job description is required'),
    requirements: z.array(z.string()).optional().default([]),
    location: z.string().optional(),
    salaryRange: z.string().optional(),
    employmentType: z.string().optional(),
  }),
  saveToDatabase: z.boolean().optional().default(false),
  generatePDF: z.boolean().optional().default(true),
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
    const { jobId, jobDescription, saveToDatabase, generatePDF } = customizeResumeSchema.parse(body)

    // Get user profile with skills and resume
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

    if (!profile.resumeUrl) {
      return NextResponse.json(
        { error: 'No resume found. Please upload your resume first.' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const jobTitlePrefs = profile.jobTitlePrefs ? JSON.parse(profile.jobTitlePrefs) : []

    // Build the customization request
    const customizationRequest: ResumeCustomizationRequest = {
      originalResume: {
        url: profile.resumeUrl,
        filename: 'resume.pdf',
      },
      job: {
        title: jobDescription.title,
        company: jobDescription.company,
        description: jobDescription.description,
        requirements: jobDescription.requirements,
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

    // Customize the resume
    const customizedResume = await resumeCustomizationService.customizeResume(customizationRequest)

    // Generate PDF if requested
    let customizedPdfUrl: string | null = null
    if (generatePDF) {
      try {
        const { sections, metadata } = pdfGenerator.parseCustomizedContent(
          customizedResume.customizedContent,
          profile.fullName
        )

        customizedPdfUrl = await pdfGenerator.generateResumePDF(
          customizedResume.customizedContent,
          {
            jobTitle: jobDescription.title,
            company: jobDescription.company,
            candidateName: profile.fullName,
            sections,
            contactInfo: {
              email: profile.email || undefined,
              phone: profile.mobile || undefined,
              address: profile.preferredLocations ? JSON.parse(profile.preferredLocations)[0] : undefined,
              linkedin: profile.linkedinUrl || undefined,
              website: undefined, // No portfolio field in current schema
            },
            customizationNotes: customizedResume.customizationNotes,
            keywordMatches: customizedResume.keywordMatches,
            suggestedImprovements: customizedResume.suggestedImprovements,
          },
          session.user.id
        )

        console.log('Generated PDF resume:', customizedPdfUrl)
      } catch (error) {
        console.error('PDF generation failed:', error)
        // Continue without PDF - don't fail the entire request
      }
    }

    // Save to database if requested (for applications)
    let savedCustomization = null
    if (saveToDatabase && jobId) {
      // Check if job exists in database
      const job = await prisma.job.findUnique({
        where: { id: jobId }
      })

      if (job) {
        // Create a customized resume record (we'll add this to schema next)
        // For now, we'll store it in the job notifications table as customizedResume
        savedCustomization = {
          jobId,
          customizedContent: customizedResume.customizedContent,
          customizationNotes: customizedResume.customizationNotes,
          keywordMatches: customizedResume.keywordMatches,
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        originalResumeUrl: profile.resumeUrl,
        customizedResume: customizedResume.customizedContent,
        customizedPdfUrl,
        customizationNotes: customizedResume.customizationNotes,
        keywordMatches: customizedResume.keywordMatches,
        suggestedImprovements: customizedResume.suggestedImprovements,
        originalText: customizedResume.originalText,
        extractedSections: customizedResume.extractedSections,
        jobTitle: jobDescription.title,
        company: jobDescription.company,
        savedToDatabase: saveToDatabase && !!savedCustomization,
        pdfGenerated: !!customizedPdfUrl,
      }
    })

  } catch (error) {
    console.error('Resume customization error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to customize resume' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve saved customized resumes
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

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Get job with any associated customized resume data
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check for associated job notifications with customized resumes
    const notification = await prisma.jobNotification.findFirst({
      where: {
        userId: session.user.id,
        jobId: jobId,
        customizedResume: { not: null }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        job,
        customizedResumeUrl: notification?.customizedResume || null,
        hasCustomizedResume: !!notification?.customizedResume,
      }
    })

  } catch (error) {
    console.error('Get customized resume error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve customized resume' },
      { status: 500 }
    )
  }
}