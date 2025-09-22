import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { calculateProfileCompletion, shouldShowOnboarding } from '@/lib/profileCompletion'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: {
        skills: true,
        autoApplySettings: true,
      },
    })

    // Transform Prisma profile to match our Profile interface
    const transformedProfile = profile ? {
      fullName: profile.fullName,
      email: profile.email,
      mobile: profile.mobile,
      jobTitlePrefs: profile.jobTitlePrefs,
      yearsExperience: profile.yearsExperience,
      salaryMin: profile.salaryMin,
      salaryMax: profile.salaryMax,
      preferredLocations: profile.preferredLocations,
      employmentTypes: profile.employmentTypes,
      resumeUrl: profile.resumeUrl,
      linkedinUrl: profile.linkedinUrl,
      skills: profile.skills.map(skill => ({
        name: skill.name,
        proficiency: skill.proficiency,
        yearsUsed: skill.yearsUsed,
      })),
      autoApplySettings: profile.autoApplySettings ? {
        isEnabled: profile.autoApplySettings.isEnabled,
        minMatchScore: profile.autoApplySettings.minMatchScore,
        maxApplicationsPerDay: profile.autoApplySettings.maxApplicationsPerDay,
        notifyOnMatch: profile.autoApplySettings.notifyOnMatch,
        requireApproval: profile.autoApplySettings.requireApproval,
      } : null,
    } : null

    const completion = calculateProfileCompletion(transformedProfile)
    const showOnboarding = shouldShowOnboarding(transformedProfile)

    return NextResponse.json({
      success: true,
      data: {
        completion,
        showOnboarding,
        profile: profile ? {
          id: profile.id,
          fullName: profile.fullName,
          email: profile.email,
          mobile: profile.mobile,
          jobTitlePrefs: profile.jobTitlePrefs,
          yearsExperience: profile.yearsExperience,
          salaryMin: profile.salaryMin,
          salaryMax: profile.salaryMax,
          preferredLocations: profile.preferredLocations,
          employmentTypes: profile.employmentTypes,
          resumeUrl: profile.resumeUrl,
          linkedinUrl: profile.linkedinUrl,
          skills: profile.skills,
          autoApplySettings: profile.autoApplySettings,
        } : null,
      }
    })

  } catch (error) {
    console.error('Profile completion check error:', error)
    return NextResponse.json(
      { error: 'Failed to check profile completion' },
      { status: 500 }
    )
  }
}