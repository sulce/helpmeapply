import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resumeParser, type ResumeParsingResult } from '@/lib/resumeParser'
import { z } from 'zod'

const importResumeSchema = z.object({
  resumeUrl: z.string().url('Invalid resume URL')
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
    const { resumeUrl } = importResumeSchema.parse(body)

    console.log('🚀 Starting resume import for user:', session.user.id, 'URL:', resumeUrl)

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not configured, providing basic fallback')
      
      // Provide a basic fallback response without AI parsing
      const basicResumeData = {
        contactInfo: {
          fullName: '',
          email: session.user.email || '',
          phone: '',
          address: '',
          linkedin: '',
          website: ''
        },
        professionalSummary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        projects: [],
        languages: [],
        templateRegion: 'US',
        includePhoto: false
      }

      return NextResponse.json({
        success: true,
        message: 'Resume uploaded successfully. Manual entry required for parsing.',
        data: {
          parseResult: {
            confidence: 0.1,
            warnings: ['Automatic parsing not available. Please manually enter your resume information.'],
            extractedSections: {
              contactInfo: false,
              experience: 0,
              education: 0,
              skills: 0,
              certifications: 0,
              projects: 0,
              summary: false
            }
          },
          resumeData: basicResumeData,
          completionPercentage: 10,
          structuredResumeId: null,
          profileUpdated: false,
          requiresManualEntry: true
        }
      })
    }

    // Parse the resume using AI
    console.log('🔍 Attempting to parse resume...')
    let parseResult: ResumeParsingResult
    
    try {
      parseResult = await resumeParser.parseFromUrl(resumeUrl)
    } catch (error) {
      console.error('Resume parsing threw an exception:', error)
      
      // Return a graceful fallback instead of failing
      const basicResumeData = {
        contactInfo: {
          fullName: '',
          email: session.user.email || '',
          phone: '',
          address: '',
          linkedin: '',
          website: ''
        },
        professionalSummary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        projects: [],
        languages: [],
        templateRegion: 'US',
        includePhoto: false
      }

      return NextResponse.json({
        success: true,
        message: 'Resume uploaded but parsing encountered issues. Manual entry may be required.',
        data: {
          parseResult: {
            confidence: 0.1,
            warnings: [
              'Resume parsing encountered technical issues.',
              'Please manually verify and enter your resume information.',
              error instanceof Error ? `Error: ${error.message}` : 'Unknown parsing error'
            ],
            extractedSections: {
              contactInfo: false,
              experience: 0,
              education: 0,
              skills: 0,
              certifications: 0,
              projects: 0,
              summary: false
            }
          },
          resumeData: basicResumeData,
          completionPercentage: 10,
          structuredResumeId: null,
          profileUpdated: false,
          requiresManualEntry: true
        }
      })
    }

    if (!parseResult.success || !parseResult.data) {
      console.log('⚠️ Resume parsing was not successful, providing fallback')
      
      // Provide fallback instead of error
      const basicResumeData = {
        contactInfo: {
          fullName: '',
          email: session.user.email || '',
          phone: '',
          address: '',
          linkedin: '',
          website: ''
        },
        professionalSummary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        projects: [],
        languages: [],
        templateRegion: 'US',
        includePhoto: false
      }

      return NextResponse.json({
        success: true,
        message: 'Resume uploaded but could not be automatically parsed. Manual entry required.',
        data: {
          parseResult: {
            confidence: 0.1,
            warnings: [
              parseResult.error || 'Resume parsing failed',
              'Please manually enter your resume information.',
              ...(parseResult.warnings || [])
            ],
            extractedSections: {
              contactInfo: false,
              experience: 0,
              education: 0,
              skills: 0,
              certifications: 0,
              projects: 0,
              summary: false
            }
          },
          resumeData: basicResumeData,
          completionPercentage: 10,
          structuredResumeId: null,
          profileUpdated: false,
          requiresManualEntry: true
        }
      })
    }

    const parsedData = parseResult.data

    // Store the parsed resume as structured resume data
    console.log('💾 Saving structured resume data to database...')
    const structuredResume = await prisma.structuredResume.upsert({
      where: { userId: session.user.id },
      update: {
        contactInfo: JSON.stringify(parsedData.contactInfo || {}),
        summary: parsedData.professionalSummary || '',
        experience: JSON.stringify(parsedData.experience || []),
        education: JSON.stringify(parsedData.education || []),
        skills: JSON.stringify(parsedData.skills || []),
        certifications: JSON.stringify(parsedData.certifications || []),
        projects: JSON.stringify(parsedData.projects || []),
        languages: JSON.stringify(parsedData.languages || []),
        templateRegion: parsedData.templateRegion || 'US',
        includePhoto: parsedData.includePhoto || false,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        contactInfo: JSON.stringify(parsedData.contactInfo || {}),
        summary: parsedData.professionalSummary || '',
        experience: JSON.stringify(parsedData.experience || []),
        education: JSON.stringify(parsedData.education || []),
        skills: JSON.stringify(parsedData.skills || []),
        certifications: JSON.stringify(parsedData.certifications || []),
        projects: JSON.stringify(parsedData.projects || []),
        languages: JSON.stringify(parsedData.languages || []),
        templateRegion: parsedData.templateRegion || 'US',
        includePhoto: parsedData.includePhoto || false
      }
    })
    console.log('✅ Structured resume saved with ID:', structuredResume.id)

    // Also update user's profile with key information if it's missing
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id }
    })

    const profileUpdates: any = {}
    
    // Update missing profile fields from parsed resume
    if (!profile?.fullName && parsedData.contactInfo.fullName && parsedData.contactInfo.fullName !== 'Name Not Found') {
      profileUpdates.fullName = parsedData.contactInfo.fullName
    }
    if (!profile?.email && parsedData.contactInfo.email) {
      profileUpdates.email = parsedData.contactInfo.email
    }
    if (!profile?.mobile && parsedData.contactInfo.phone) {
      profileUpdates.mobile = parsedData.contactInfo.phone
    }
    if (!profile?.linkedinUrl && parsedData.contactInfo.linkedin) {
      profileUpdates.linkedinUrl = parsedData.contactInfo.linkedin
    }

    // Handle skills separately if we have any
    const hasSkillsToUpdate = parsedData.skills && parsedData.skills.length > 0

    // Apply profile updates if needed or ensure profile exists
    const updatedProfile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: profileUpdates,
      create: {
        userId: session.user.id,
        fullName: parsedData.contactInfo.fullName || '',
        email: parsedData.contactInfo.email || '',
        mobile: parsedData.contactInfo.phone || '',
        linkedinUrl: parsedData.contactInfo.linkedin || '',
        jobTitlePrefs: JSON.stringify([]),
        preferredLocations: JSON.stringify([]),
        employmentTypes: JSON.stringify([]),
        yearsExperience: 0,
        salaryMin: 0,
        salaryMax: 0,
        ...profileUpdates
      }
    })

    // Update skills separately if we have any
    if (hasSkillsToUpdate) {
      console.log('🎯 Updating', parsedData.skills.length, 'skills for profile:', updatedProfile.id)
      
      // First delete existing skills for this profile
      await prisma.skill.deleteMany({
        where: { profileId: updatedProfile.id }
      })
      
      // Then create new skills
      await prisma.skill.createMany({
        data: parsedData.skills.map(skill => ({
          profileId: updatedProfile.id,
          name: skill.name,
          proficiency: skill.proficiency.toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT',
          yearsUsed: 0
        }))
      })
      console.log('✅ Skills updated successfully')
    }

    // Calculate completion percentage
    const completionData = {
      hasContactInfo: !!(parsedData.contactInfo.fullName && parsedData.contactInfo.email),
      hasExperience: parsedData.experience.length > 0,
      hasEducation: parsedData.education.length > 0,
      hasSkills: parsedData.skills.length > 0,
      hasSummary: !!parsedData.professionalSummary,
      totalSections: 5
    }

    const completedSections = Object.values(completionData).filter((val, idx) => 
      idx < completionData.totalSections ? val : false
    ).length

    const completionPercentage = Math.round((completedSections / completionData.totalSections) * 100)

    return NextResponse.json({
      success: true,
      message: 'Resume imported and parsed successfully',
      data: {
        parseResult: {
          confidence: parseResult.confidence,
          warnings: parseResult.warnings,
          extractedSections: {
            contactInfo: !!parsedData.contactInfo.fullName,
            experience: parsedData.experience.length,
            education: parsedData.education.length,
            skills: parsedData.skills.length,
            certifications: parsedData.certifications.length,
            projects: parsedData.projects.length,
            summary: !!parsedData.professionalSummary
          }
        },
        resumeData: parsedData,
        completionPercentage,
        structuredResumeId: structuredResume.id,
        profileUpdated: Object.keys(profileUpdates).length > 0
      }
    })

  } catch (error) {
    console.error('Resume import error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to import resume',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check import status and get existing parsed data
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get existing structured resume if any
    const existingResume = await prisma.structuredResume.findUnique({
      where: { userId: session.user.id }
    })

    if (!existingResume) {
      return NextResponse.json({
        success: true,
        hasExistingResume: false,
        message: 'No imported resume found'
      })
    }

    // Parse the stored JSON data
    const resumeData = {
      contactInfo: JSON.parse(existingResume.contactInfo || '{}'),
      professionalSummary: existingResume.summary || '',
      experience: JSON.parse(existingResume.experience || '[]'),
      education: JSON.parse(existingResume.education || '[]'),
      skills: JSON.parse(existingResume.skills || '[]'),
      certifications: JSON.parse(existingResume.certifications || '[]'),
      projects: JSON.parse(existingResume.projects || '[]'),
      languages: JSON.parse(existingResume.languages || '[]'),
      templateRegion: existingResume.templateRegion,
      includePhoto: existingResume.includePhoto
    }

    return NextResponse.json({
      success: true,
      hasExistingResume: true,
      data: {
        resumeData,
        metadata: {
          lastUpdated: existingResume.updatedAt,
          importedFrom: 'Smart Resume Import',
          confidence: 0.9,
          warnings: [],
          importedAt: existingResume.createdAt.toISOString()
        }
      }
    })

  } catch (error) {
    console.error('Get resume import status error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get import status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}