import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch structured resume from database
    const structuredResume = await prisma.structuredResume.findUnique({
      where: { userId: session.user.id }
    })

    if (!structuredResume) {
      // No resume exists yet
      const emptyStatus = {
        hasResume: false,
        completionPercentage: 0,
        sections: {
          contactInfo: false,
          summary: false,
          experience: false,
          education: false,
          skills: false
        }
      }

      return NextResponse.json({
        success: true,
        status: emptyStatus
      })
    }

    // Parse JSON fields to check completion
    const contactInfo = JSON.parse(structuredResume.contactInfo || '{}')
    const experience = JSON.parse(structuredResume.experience || '[]')
    const education = JSON.parse(structuredResume.education || '[]')
    const skills = JSON.parse(structuredResume.skills || '[]')

    // Check each section completion
    const sections = {
      contactInfo: Object.keys(contactInfo).length > 0 && contactInfo.fullName && contactInfo.email,
      summary: structuredResume.summary && structuredResume.summary.trim().length > 0,
      experience: experience.length > 0,
      education: education.length > 0,
      skills: skills.length > 0
    }

    // Calculate completion percentage
    const completedSections = Object.values(sections).filter(Boolean).length
    const completionPercentage = Math.round((completedSections / 5) * 100)

    const status = {
      hasResume: true,
      completionPercentage,
      lastUpdated: structuredResume.updatedAt.toISOString(),
      sections,
      generatedPdfUrl: structuredResume.lastPdfUrl
    }

    return NextResponse.json({
      success: true,
      status
    })

  } catch (error) {
    console.error('Resume status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check resume status' },
      { status: 500 }
    )
  }
}