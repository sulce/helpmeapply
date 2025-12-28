import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadAudioFile, generateAudioFileName } from '@/lib/audioStorage'

interface SubmitAnswerRequest {
  questionId: string
  userAnswerAudio?: File
  userAnswerText?: string
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

    const formData = await req.formData()
    const questionId = formData.get('questionId') as string
    const userAnswerText = formData.get('userAnswerText') as string
    const userAnswerAudio = formData.get('userAnswerAudio') as File

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      )
    }

    // Verify the question belongs to the user's session
    const question = await prisma.interviewQuestion.findFirst({
      where: {
        id: questionId,
        session: {
          userId: session.user.id
        }
      },
      include: {
        session: true
      }
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    let userAnswerAudioUrl: string | undefined

    // Handle audio file upload if provided
    if (userAnswerAudio && userAnswerAudio.size > 0) {
      try {
        const fileName = generateAudioFileName(
          question.sessionId, 
          question.questionIndex, 
          'answer'
        )
        
        const uploadResult = await uploadAudioFile(userAnswerAudio, fileName)
        userAnswerAudioUrl = uploadResult.url
        
        console.log(`Audio answer uploaded for question ${questionId}: ${userAnswerAudioUrl}`)
      } catch (error) {
        console.error('Failed to upload audio:', error)
        // Continue without audio URL - don't fail the entire request
        console.log('Continuing without audio upload due to error')
      }
    }

    // Update the question with the user's answer
    const updatedQuestion = await prisma.interviewQuestion.update({
      where: { id: questionId },
      data: {
        userAnswerAudioUrl: userAnswerAudioUrl,
        userAnswerText: userAnswerText,
        answeredAt: new Date()
      }
    })

    // Check if this was the last question
    const isLastQuestion = question.questionIndex >= (question.session.totalQuestions - 1)

    if (isLastQuestion) {
      // Complete the interview session
      await prisma.interviewSession.update({
        where: { id: question.sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      })

      console.log(`Interview session ${question.sessionId} completed`)
    }

    return NextResponse.json({
      success: true,
      data: {
        questionId: updatedQuestion.id,
        isCompleted: isLastQuestion,
        nextQuestionIndex: isLastQuestion ? null : question.questionIndex + 1,
        totalQuestions: question.session.totalQuestions
      }
    })

  } catch (error) {
    console.error('Submit answer API error:', error)
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    )
  }
}