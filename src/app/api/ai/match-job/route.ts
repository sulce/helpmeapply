import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { analyzeJobMatch, JobMatchingRequest } from '@/lib/openai'
import { z } from 'zod'

const matchJobSchema = z.object({
  jobDescription: z.object({
    title: z.string().min(1, 'Job title is required'),
    company: z.string().min(1, 'Company is required'),
    description: z.string().min(1, 'Job description is required'),
    requirements: z.array(z.string()).optional().default([]),
    location: z.string().optional(),
    salaryRange: z.string().optional(),
    employmentType: z.string().optional(),
  })
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
    const { jobDescription } = matchJobSchema.parse(body)

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

    // Build the matching request
    const matchingRequest: JobMatchingRequest = {
      profile: {
        fullName: profile.fullName,
        skills: profile.skills.map(skill => ({
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
        title: jobDescription.title,
        company: jobDescription.company,
        description: jobDescription.description,
        requirements: jobDescription.requirements,
        location: jobDescription.location,
        salaryRange: jobDescription.salaryRange,
        employmentType: jobDescription.employmentType,
      },
    }

    // Analyze the match using OpenAI
    const matchResult = await analyzeJobMatch(matchingRequest)

    return NextResponse.json({
      matchResult,
      profileSummary: {
        name: profile.fullName,
        skillsCount: profile.skills.length,
        experience: profile.yearsExperience,
        preferredRoles: jobTitlePrefs.slice(0, 3), // First 3 for brevity
      }
    })

  } catch (error) {
    console.error('Job matching error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to analyze job match' },
      { status: 500 }
    )
  }
}