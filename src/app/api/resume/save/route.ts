import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { resumeData } = await req.json()

    if (!resumeData) {
      return NextResponse.json(
        { error: 'Resume data is required' },
        { status: 400 }
      )
    }

    console.log('Resume data received for user:', session.user.id)
    console.log('Resume sections:', Object.keys(resumeData))

    // Calculate completion percentage
    const sections = {
      contactInfo: resumeData.contactInfo && resumeData.contactInfo.fullName && resumeData.contactInfo.email,
      summary: resumeData.summary && resumeData.summary.trim().length > 0,
      experience: resumeData.experience && resumeData.experience.length > 0,
      education: resumeData.education && resumeData.education.length > 0,
      skills: resumeData.skills && resumeData.skills.length > 0
    }
    
    const completedSections = Object.values(sections).filter(Boolean).length
    const isComplete = completedSections >= 4 // At least 4 out of 5 core sections

    // Save structured resume data to database
    const structuredResume = await prisma.structuredResume.upsert({
      where: { userId: session.user.id },
      update: {
        contactInfo: JSON.stringify(resumeData.contactInfo || {}),
        summary: resumeData.summary || null,
        experience: JSON.stringify(resumeData.experience || []),
        education: JSON.stringify(resumeData.education || []),
        skills: JSON.stringify(resumeData.skills || []),
        certifications: JSON.stringify(resumeData.certifications || []),
        projects: JSON.stringify(resumeData.projects || []),
        achievements: JSON.stringify(resumeData.achievements || []),
        languages: JSON.stringify(resumeData.languages || []),
        // Template settings
        templateRegion: resumeData.templateRegion || 'US',
        includePhoto: resumeData.includePhoto || false,
        photoUrl: resumeData.photoUrl || null,
        sectionOrder: JSON.stringify(resumeData.sectionOrder || []),
        personalDetails: JSON.stringify(resumeData.personalDetails || {}),
        isComplete
      },
      create: {
        userId: session.user.id,
        contactInfo: JSON.stringify(resumeData.contactInfo || {}),
        summary: resumeData.summary || null,
        experience: JSON.stringify(resumeData.experience || []),
        education: JSON.stringify(resumeData.education || []),
        skills: JSON.stringify(resumeData.skills || []),
        certifications: JSON.stringify(resumeData.certifications || []),
        projects: JSON.stringify(resumeData.projects || []),
        achievements: JSON.stringify(resumeData.achievements || []),
        languages: JSON.stringify(resumeData.languages || []),
        // Template settings
        templateRegion: resumeData.templateRegion || 'US',
        includePhoto: resumeData.includePhoto || false,
        photoUrl: resumeData.photoUrl || null,
        sectionOrder: JSON.stringify(resumeData.sectionOrder || []),
        personalDetails: JSON.stringify(resumeData.personalDetails || {}),
        isComplete
      }
    })

    console.log('Resume saved successfully for user:', session.user.id, 'Completion:', `${Math.round((completedSections / 5) * 100)}%`)

    return NextResponse.json({
      success: true,
      message: 'Resume saved successfully',
      completionPercentage: Math.round((completedSections / 5) * 100),
      isComplete,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Save resume error:', error)
    return NextResponse.json(
      { error: 'Failed to save resume' },
      { status: 500 }
    )
  }
}