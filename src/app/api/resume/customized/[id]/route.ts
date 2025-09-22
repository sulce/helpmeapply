import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET - Retrieve specific customized resume
export async function GET(
  req: NextRequest, 
  { params }: RouteParams
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const customizedResume = await prisma.customizedResume.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        application: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
            jobUrl: true,
          }
        }
      }
    })

    if (!customizedResume) {
      return NextResponse.json(
        { error: 'Customized resume not found' },
        { status: 404 }
      )
    }

    // Transform data for frontend
    const customizationData = customizedResume.customizationData ? JSON.parse(customizedResume.customizationData) : {}
    const keywordMatches = customizedResume.keywordMatches ? JSON.parse(customizedResume.keywordMatches) : []

    const transformedResume = {
      id: customizedResume.id,
      jobTitle: customizedResume.jobTitle,
      company: customizedResume.company,
      customizedContent: customizedResume.customizedContent,
      customizationNotes: customizationData.customizationNotes || [],
      suggestedImprovements: customizationData.suggestedImprovements || [],
      keywordMatches,
      matchScore: customizedResume.matchScore,
      originalResumeUrl: customizedResume.originalResumeUrl,
      customizedResumeUrl: customizedResume.customizedResumeUrl,
      createdAt: customizedResume.createdAt.toISOString(),
      updatedAt: customizedResume.updatedAt.toISOString(),
      applicationId: customizedResume.applicationId,
      application: customizedResume.application,
    }

    return NextResponse.json({
      success: true,
      resume: transformedResume,
    })

  } catch (error) {
    console.error('Get customized resume error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve customized resume' },
      { status: 500 }
    )
  }
}

// DELETE - Delete specific customized resume
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if resume exists and belongs to user
    const customizedResume = await prisma.customizedResume.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!customizedResume) {
      return NextResponse.json(
        { error: 'Customized resume not found' },
        { status: 404 }
      )
    }

    // Delete the resume
    await prisma.customizedResume.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Customized resume deleted successfully',
    })

  } catch (error) {
    console.error('Delete customized resume error:', error)
    return NextResponse.json(
      { error: 'Failed to delete customized resume' },
      { status: 500 }
    )
  }
}

// PATCH - Update specific customized resume
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { customizedContent, customizationData, keywordMatches } = body

    // Check if resume exists and belongs to user
    const existingResume = await prisma.customizedResume.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingResume) {
      return NextResponse.json(
        { error: 'Customized resume not found' },
        { status: 404 }
      )
    }

    // Update the resume
    const updatedResume = await prisma.customizedResume.update({
      where: {
        id,
      },
      data: {
        ...(customizedContent !== undefined && { customizedContent }),
        ...(customizationData !== undefined && { customizationData: JSON.stringify(customizationData) }),
        ...(keywordMatches !== undefined && { keywordMatches: JSON.stringify(keywordMatches) }),
      },
    })

    // Transform response
    const customizationDataParsed = updatedResume.customizationData ? JSON.parse(updatedResume.customizationData) : {}
    const keywordMatchesParsed = updatedResume.keywordMatches ? JSON.parse(updatedResume.keywordMatches) : []

    return NextResponse.json({
      success: true,
      resume: {
        id: updatedResume.id,
        jobTitle: updatedResume.jobTitle,
        company: updatedResume.company,
        customizedContent: updatedResume.customizedContent,
        customizationNotes: customizationDataParsed.customizationNotes || [],
        suggestedImprovements: customizationDataParsed.suggestedImprovements || [],
        keywordMatches: keywordMatchesParsed,
        matchScore: updatedResume.matchScore,
        originalResumeUrl: updatedResume.originalResumeUrl,
        customizedResumeUrl: updatedResume.customizedResumeUrl,
        createdAt: updatedResume.createdAt.toISOString(),
        updatedAt: updatedResume.updatedAt.toISOString(),
      }
    })

  } catch (error) {
    console.error('Update customized resume error:', error)
    return NextResponse.json(
      { error: 'Failed to update customized resume' },
      { status: 500 }
    )
  }
}