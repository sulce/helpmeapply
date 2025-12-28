import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { sessionId } = await params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Get interview session with questions
    const interviewSession = await prisma.interviewSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      include: {
        questions: {
          orderBy: {
            questionIndex: 'asc'
          }
        },
        application: {
          select: {
            jobTitle: true,
            company: true,
            jobDescription: true
          }
        }
      }
    })

    if (!interviewSession) {
      return NextResponse.json(
        { error: 'Interview session not found' },
        { status: 404 }
      )
    }

    // Calculate progress
    const answeredQuestions = interviewSession.questions.filter(q => q.answeredAt)
    const progress = {
      current: interviewSession.currentQuestion,
      total: interviewSession.totalQuestions,
      answered: answeredQuestions.length,
      completion: Math.round((answeredQuestions.length / interviewSession.totalQuestions) * 100)
    }

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: interviewSession.id,
          status: interviewSession.status,
          jobTitle: interviewSession.jobTitle,
          company: interviewSession.company,
          jobDescription: interviewSession.jobDescription,
          currentQuestion: interviewSession.currentQuestion,
          totalQuestions: interviewSession.totalQuestions,
          overallScore: interviewSession.overallScore,
          feedback: interviewSession.feedback,
          createdAt: interviewSession.createdAt,
          completedAt: interviewSession.completedAt
        },
        questions: interviewSession.questions.map(q => ({
          id: q.id,
          questionIndex: q.questionIndex,
          questionText: q.questionText,
          questionAudioUrl: q.questionAudioUrl,
          userAnswerText: q.userAnswerText,
          userAnswerAudioUrl: q.userAnswerAudioUrl,
          feedback: q.feedback,
          score: q.score,
          answeredAt: q.answeredAt
        })),
        progress,
        application: interviewSession.application
      }
    })

  } catch (error) {
    console.error('Get interview session API error:', error)
    return NextResponse.json(
      { error: 'Failed to get interview session' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { sessionId } = await params

    // Verify the session belongs to the user
    const interviewSession = await prisma.interviewSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!interviewSession) {
      return NextResponse.json(
        { error: 'Interview session not found' },
        { status: 404 }
      )
    }

    // Delete the session (questions will be deleted due to cascade)
    await prisma.interviewSession.delete({
      where: { id: sessionId }
    })

    console.log(`Deleted interview session ${sessionId}`)

    return NextResponse.json({
      success: true,
      message: 'Interview session deleted'
    })

  } catch (error) {
    console.error('Delete interview session API error:', error)
    return NextResponse.json(
      { error: 'Failed to delete interview session' },
      { status: 500 }
    )
  }
}