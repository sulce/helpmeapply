import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface StartInterviewRequest {
  applicationId: string
  totalQuestions?: number
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: StartInterviewRequest = await req.json()
    const { applicationId, totalQuestions = 5 } = body

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    // Verify the application belongs to the user
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId: session.user.id
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Get user's profile for resume URL
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id }
    })

    if (!profile?.resumeUrl) {
      return NextResponse.json(
        { error: 'Resume not found. Please upload a resume first.' },
        { status: 400 }
      )
    }

    // Check if there's already an active interview session for this application
    const existingSession = await prisma.interviewSession.findFirst({
      where: {
        applicationId: applicationId,
        userId: session.user.id,
        status: 'IN_PROGRESS'
      }
    })

    if (existingSession) {
      return NextResponse.json({
        success: true,
        data: {
          sessionId: existingSession.id,
          currentQuestion: existingSession.currentQuestion,
          totalQuestions: existingSession.totalQuestions,
          existing: true
        }
      })
    }

    // Create new interview session
    const interviewSession = await prisma.interviewSession.create({
      data: {
        userId: session.user.id,
        applicationId: applicationId,
        jobTitle: application.jobTitle,
        company: application.company,
        jobDescription: application.jobDescription || '',
        resumeUrl: profile.resumeUrl,
        totalQuestions: totalQuestions,
        currentQuestion: 0,
        status: 'IN_PROGRESS'
      }
    })

    console.log(`Created new interview session ${interviewSession.id} for application ${applicationId}`)

    return NextResponse.json({
      success: true,
      data: {
        sessionId: interviewSession.id,
        currentQuestion: 0,
        totalQuestions: totalQuestions,
        jobTitle: application.jobTitle,
        company: application.company,
        existing: false
      }
    })

  } catch (error) {
    console.error('Start interview API error:', error)
    return NextResponse.json(
      { error: 'Failed to start interview session' },
      { status: 500 }
    )
  }
}