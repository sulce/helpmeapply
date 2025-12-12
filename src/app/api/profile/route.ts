import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { profileSchema, profileDraftSchema } from '@/lib/validations'
import { authOptions } from '@/lib/auth'

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
    const { isDraft, ...profileData } = body
    
    console.log('Profile API - isDraft:', isDraft)
    console.log('Profile API - profileData:', JSON.stringify(profileData, null, 2))
    
    // Use appropriate schema based on whether this is a draft or final save
    const schema = isDraft ? profileDraftSchema : profileSchema
    console.log('Profile API - Using schema:', isDraft ? 'profileDraftSchema' : 'profileSchema')
    
    let data
    try {
      data = schema.parse(profileData)
      console.log('Profile API - Validation successful, parsed data:', JSON.stringify(data, null, 2))
    } catch (validationError) {
      console.error('Profile API - Validation failed:', validationError)
      throw validationError
    }

    // Prepare update data, only including defined fields
    const updateData: any = {}
    const createData: any = {
      userId: session.user.id,
    }

    // Handle each field, providing defaults for create and only setting if defined for update
    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName
      createData.fullName = data.fullName
    } else if (!isDraft) {
      createData.fullName = ''
    }

    if (data.email !== undefined) {
      updateData.email = data.email
      createData.email = data.email
    } else if (!isDraft) {
      createData.email = ''
    }

    if (data.mobile !== undefined) {
      updateData.mobile = data.mobile
      createData.mobile = data.mobile
    }

    if (data.jobTitlePrefs !== undefined) {
      updateData.jobTitlePrefs = JSON.stringify(data.jobTitlePrefs)
      createData.jobTitlePrefs = JSON.stringify(data.jobTitlePrefs)
    } else if (!isDraft) {
      createData.jobTitlePrefs = '[]'
    }

    if (data.yearsExperience !== undefined) {
      updateData.yearsExperience = data.yearsExperience
      createData.yearsExperience = data.yearsExperience
    }

    if (data.salaryMin !== undefined) {
      updateData.salaryMin = data.salaryMin
      createData.salaryMin = data.salaryMin
    }

    if (data.salaryMax !== undefined) {
      updateData.salaryMax = data.salaryMax
      createData.salaryMax = data.salaryMax
    }

    if (data.preferredLocations !== undefined) {
      updateData.preferredLocations = JSON.stringify(data.preferredLocations)
      createData.preferredLocations = JSON.stringify(data.preferredLocations)
    } else if (!isDraft) {
      createData.preferredLocations = '[]'
    }

    if (data.employmentTypes !== undefined) {
      updateData.employmentTypes = JSON.stringify(data.employmentTypes)
      createData.employmentTypes = JSON.stringify(data.employmentTypes)
    } else if (!isDraft) {
      createData.employmentTypes = '[]'
    }

    if (data.linkedinUrl !== undefined) {
      updateData.linkedinUrl = data.linkedinUrl
      createData.linkedinUrl = data.linkedinUrl
    }

    if (data.indeedProfile !== undefined) {
      updateData.indeedProfile = data.indeedProfile
      createData.indeedProfile = data.indeedProfile
    }

    if (data.resumeUrl !== undefined) {
      updateData.resumeUrl = data.resumeUrl
      createData.resumeUrl = data.resumeUrl
    }

    // Set defaults for required fields in create mode if not provided
    // These are needed even for drafts to ensure database constraints are met
    createData.fullName = createData.fullName || ''
    createData.email = createData.email || ''
    createData.jobTitlePrefs = createData.jobTitlePrefs || '[]'
    createData.preferredLocations = createData.preferredLocations || '[]'
    createData.employmentTypes = createData.employmentTypes || '[]'

    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: createData,
    })

    // Handle skills - delete existing and create new ones
    if (data.skills) {
      await prisma.skill.deleteMany({
        where: { profileId: profile.id }
      })

      if (data.skills.length > 0) {
        await prisma.skill.createMany({
          data: data.skills.map((skill: any) => ({
            profileId: profile.id,
            name: skill.name,
            proficiency: skill.proficiency,
            yearsUsed: skill.yearsUsed,
          }))
        })
      }
    }

    // Re-fetch the profile with skills and auto-apply settings to return the complete data
    const updatedProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: { 
        skills: true,
        autoApplySettings: true
      },
    })

    return NextResponse.json({ profile: updatedProfile }, { status: 200 })
  } catch (error) {
    console.error('Profile creation error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as any
      console.error('Zod validation error details:', zodError.issues)
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: zodError.issues,
          message: zodError.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: { 
        skills: true,
        autoApplySettings: true
      },
    })

    // If no profile exists, create a basic one with session data
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: session.user.id,
          fullName: session.user.name || '',
          email: session.user.email || '',
          jobTitlePrefs: '[]',
          preferredLocations: '[]',
          employmentTypes: '[]',
        },
        include: { 
          skills: true,
          autoApplySettings: true
        },
      })
    }

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}