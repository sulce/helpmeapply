import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// GET - Retrieve user's customized resumes
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
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Get customized resumes with applications
    const customizedResumes = await prisma.customizedResume.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        application: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder as 'asc' | 'desc',
      },
      skip: offset,
      take: limit,
    })

    // Transform data for frontend
    const transformedResumes = customizedResumes.map(resume => {
      const customizationData = resume.customizationData ? JSON.parse(resume.customizationData) : {}
      const keywordMatches = resume.keywordMatches ? JSON.parse(resume.keywordMatches) : []

      return {
        id: resume.id,
        jobTitle: resume.jobTitle,
        company: resume.company,
        customizedContent: resume.customizedContent,
        customizationNotes: customizationData.customizationNotes || [],
        suggestedImprovements: customizationData.suggestedImprovements || [],
        keywordMatches,
        matchScore: resume.matchScore,
        originalResumeUrl: resume.originalResumeUrl,
        customizedResumeUrl: resume.customizedResumeUrl,
        createdAt: resume.createdAt.toISOString(),
        updatedAt: resume.updatedAt.toISOString(),
        applicationId: resume.applicationId,
        application: resume.application,
      }
    })

    // Get total count for pagination
    const totalCount = await prisma.customizedResume.count({
      where: {
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      resumes: transformedResumes,
      total: totalCount,
      hasMore: offset + limit < totalCount,
    })

  } catch (error) {
    console.error('Get customized resumes error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve customized resumes' },
      { status: 500 }
    )
  }
}

// POST - Create a new customized resume (without job application)
const createCustomizedResumeSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  jobDescription: z.string().min(1, 'Job description is required'),
  requirements: z.array(z.string()).optional().default([]),
  location: z.string().optional(),
  salaryRange: z.string().optional(),
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
    const { jobTitle, company, jobDescription, requirements, location, salaryRange } = createCustomizedResumeSchema.parse(body)

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

    // Use the existing resume customization API
    const customizeResponse = await fetch(`${req.url.replace('/resume/customized', '/ai/customize-resume')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        jobDescription: {
          title: jobTitle,
          company,
          description: jobDescription,
          requirements,
          location,
          salaryRange,
        },
        saveToDatabase: false, // We'll save it manually below
      }),
    })

    if (!customizeResponse.ok) {
      throw new Error('Failed to customize resume')
    }

    const customizeData = await customizeResponse.json()

    // Save to database
    const customizedResume = await prisma.customizedResume.create({
      data: {
        userId: session.user.id,
        originalResumeUrl: profile.resumeUrl,
        customizedContent: customizeData.data.customizedResume,
        jobTitle,
        company,
        customizationData: JSON.stringify({
          customizationNotes: customizeData.data.customizationNotes,
          suggestedImprovements: customizeData.data.suggestedImprovements,
        }),
        keywordMatches: JSON.stringify(customizeData.data.keywordMatches),
        matchScore: null, // No match score without full job analysis
      },
    })

    return NextResponse.json({
      success: true,
      resume: {
        id: customizedResume.id,
        jobTitle: customizedResume.jobTitle,
        company: customizedResume.company,
        customizedContent: customizedResume.customizedContent,
        customizationNotes: customizeData.data.customizationNotes,
        suggestedImprovements: customizeData.data.suggestedImprovements,
        keywordMatches: customizeData.data.keywordMatches,
        originalResumeUrl: customizedResume.originalResumeUrl,
        createdAt: customizedResume.createdAt.toISOString(),
      }
    })

  } catch (error) {
    console.error('Create customized resume error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create customized resume' },
      { status: 500 }
    )
  }
}