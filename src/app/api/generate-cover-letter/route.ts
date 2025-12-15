import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateCoverLetter } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { job, resumeData } = await req.json()

    if (!job || !resumeData) {
      return NextResponse.json(
        { error: 'Missing job or resume data' },
        { status: 400 }
      )
    }

    const coverLetter = await generateCoverLetter({
      profile: {
        fullName: resumeData.contactInfo?.fullName || 'User',
        skills: resumeData.skills?.map((skill: any) => ({
          name: skill.name,
          proficiency: skill.proficiency || 'Intermediate'
        })) || [],
        jobTitlePrefs: resumeData.experience?.map((exp: any) => exp.jobTitle) || ['Software Developer'],
        yearsExperience: resumeData.experience?.length || 0
      },
      job: {
        title: job.title,
        company: job.company,
        description: job.description || '',
        requirements: []
      }
    })

    return NextResponse.json({
      success: true,
      coverLetter
    })

  } catch (error) {
    console.error('Cover letter generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate cover letter' },
      { status: 500 }
    )
  }
}