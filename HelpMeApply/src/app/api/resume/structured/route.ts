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
      return NextResponse.json(
        { error: 'No structured resume found' },
        { status: 404 }
      )
    }

    // Parse JSON fields and return structured data
    const resumeData = {
      contactInfo: JSON.parse(structuredResume.contactInfo || '{}'),
      summary: structuredResume.summary,
      experience: JSON.parse(structuredResume.experience || '[]'),
      education: JSON.parse(structuredResume.education || '[]'),
      skills: JSON.parse(structuredResume.skills || '[]'),
      certifications: JSON.parse(structuredResume.certifications || '[]'),
      projects: JSON.parse(structuredResume.projects || '[]'),
      achievements: JSON.parse(structuredResume.achievements || '[]'),
      languages: JSON.parse(structuredResume.languages || '[]'),
      // Template settings
      templateRegion: structuredResume.templateRegion,
      includePhoto: structuredResume.includePhoto,
      photoUrl: structuredResume.photoUrl,
      sectionOrder: JSON.parse(structuredResume.sectionOrder || '[]'),
      personalDetails: JSON.parse(structuredResume.personalDetails || '{}'),
      isComplete: structuredResume.isComplete,
      lastPdfUrl: structuredResume.lastPdfUrl,
      updatedAt: structuredResume.updatedAt
    }

    return NextResponse.json({
      success: true,
      resumeData
    })

  } catch (error) {
    console.error('Get structured resume error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve structured resume' },
      { status: 500 }
    )
  }
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

    const { resumeData } = await req.json()

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

    // Upsert structured resume data
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

    return NextResponse.json({
      success: true,
      message: 'Resume saved successfully',
      completionPercentage: Math.round((completedSections / 5) * 100),
      isComplete
    })

  } catch (error) {
    console.error('Save structured resume error:', error)
    return NextResponse.json(
      { error: 'Failed to save structured resume' },
      { status: 500 }
    )
  }
}