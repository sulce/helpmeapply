import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
    const applicationId = searchParams.get('applicationId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const whereClause: any = {
      userId: session.user.id
    }

    if (applicationId) {
      whereClause.applicationId = applicationId
    }

    if (status) {
      whereClause.status = status
    }

    // Get interview sessions with basic info
    const interviewSessions = await prisma.interviewSession.findMany({
      where: whereClause,
      select: {
        id: true,
        jobTitle: true,
        company: true,
        status: true,
        currentQuestion: true,
        totalQuestions: true,
        overallScore: true,
        feedback: true,
        createdAt: true,
        completedAt: true,
        application: {
          select: {
            id: true,
            jobTitle: true,
            company: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get total count
    const totalSessions = await prisma.interviewSession.count({
      where: whereClause
    })

    // Get basic statistics
    const stats = await prisma.interviewSession.groupBy({
      by: ['status'],
      where: {
        userId: session.user.id
      },
      _count: {
        status: true
      }
    })

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status
      return acc
    }, {} as Record<string, number>)

    // Calculate average score for completed sessions
    const completedSessions = await prisma.interviewSession.findMany({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        overallScore: {
          not: null
        }
      },
      select: {
        overallScore: true
      }
    })

    const averageScore = completedSessions.length > 0 
      ? completedSessions.reduce((sum, session) => sum + (session.overallScore || 0), 0) / completedSessions.length
      : null

    return NextResponse.json({
      success: true,
      data: {
        sessions: interviewSessions,
        total: totalSessions,
        stats: {
          ...statsMap,
          averageScore: averageScore ? Math.round(averageScore * 100) / 100 : null,
          totalCompleted: statsMap.COMPLETED || 0,
          totalInProgress: statsMap.IN_PROGRESS || 0
        },
        pagination: {
          limit,
          offset,
          hasMore: totalSessions > offset + limit
        }
      }
    })

  } catch (error) {
    console.error('Get interview sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to get interview sessions' },
      { status: 500 }
    )
  }
}