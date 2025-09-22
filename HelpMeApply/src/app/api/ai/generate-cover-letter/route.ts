import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { generateCoverLetter, CoverLetterRequest } from '@/lib/openai'
import { z } from 'zod'

const generateCoverLetterSchema = z.object({
  job: z.object({
    title: z.string().min(1, 'Job title is required'),
    company: z.string().min(1, 'Company is required'),
    description: z.string().min(1, 'Job description is required'),
    requirements: z.array(z.string()).optional().default([]),
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
    const { job } = generateCoverLetterSchema.parse(body)

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

    // Build the cover letter request
    const coverLetterRequest: CoverLetterRequest = {
      profile: {
        fullName: profile.fullName,
        skills: profile.skills.map(skill => ({
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

    // Generate cover letter using OpenAI
    const coverLetter = await generateCoverLetter(coverLetterRequest)

    return NextResponse.json({
      coverLetter,
      metadata: {
        generatedFor: `${job.title} at ${job.company}`,
        candidateName: profile.fullName,
        generatedAt: new Date().toISOString(),
      }
    })

  } catch (error) {
    console.error('Cover letter generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate cover letter' },
      { status: 500 }
    )
  }
}