import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { calculateProfileCompletion } from '@/lib/profileCompletion'

const autoApplySettingsSchema = z.object({
  isEnabled: z.boolean(),
  minMatchScore: z.number().min(0).max(1),
  maxApplicationsPerDay: z.number().min(1).max(50),
  excludedCompanies: z.array(z.string()).optional(),
  excludedKeywords: z.array(z.string()).optional(),
  preferredSources: z.array(z.string()).optional(),
  requireSalaryRange: z.boolean(),
  autoScanEnabled: z.boolean(),
  scanFrequencyHours: z.number().min(1).max(24),
  // New notification and approval settings
  notifyOnMatch: z.boolean().optional(),
  notifyMinScore: z.number().min(0).max(1).optional(),
  requireApproval: z.boolean().optional(),
  autoApplyEnabled: z.boolean().optional(),
  customizeResume: z.boolean().optional(),
  reviewTimeoutHours: z.number().min(1).max(168).optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: { autoApplySettings: true },
    })

    // Return default settings for new users if no profile exists yet
    if (!profile) {
      const defaultSettings = {
        isEnabled: false,
        minMatchScore: 0.75,
        maxApplicationsPerDay: 5,
        excludedCompanies: [],
        excludedKeywords: [],
        preferredSources: ['linkedin', 'indeed'],
        requireSalaryRange: false,
        autoScanEnabled: true,
        scanFrequencyHours: 6,
        notifyOnMatch: true,
        notifyMinScore: 0.6,
        requireApproval: true,
        autoApplyEnabled: false,
        customizeResume: true,
        reviewTimeoutHours: 24,
      }
      return NextResponse.json({ success: true, settings: defaultSettings })
    }

    const settings = profile.autoApplySettings

    const parsedSettings = settings ? {
      ...settings,
      excludedCompanies: settings.excludedCompanies 
        ? JSON.parse(settings.excludedCompanies) 
        : [],
      excludedKeywords: settings.excludedKeywords 
        ? JSON.parse(settings.excludedKeywords) 
        : [],
      preferredSources: settings.preferredSources 
        ? JSON.parse(settings.preferredSources) 
        : ['linkedin', 'indeed'],
    } : {
      // Default settings for users with profile but no AI settings yet
      isEnabled: false,
      minMatchScore: 0.75,
      maxApplicationsPerDay: 5,
      excludedCompanies: [],
      excludedKeywords: [],
      preferredSources: ['linkedin', 'indeed'],
      requireSalaryRange: false,
      autoScanEnabled: true,
      scanFrequencyHours: 6,
      notifyOnMatch: true,
      notifyMinScore: 0.6,
      requireApproval: true,
      autoApplyEnabled: false,
      customizeResume: true,
      reviewTimeoutHours: 24,
    }

    return NextResponse.json({ success: true, settings: parsedSettings })
  } catch (error) {
    console.error('Error fetching auto-apply settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = autoApplySettingsSchema.parse(body)

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: {
        skills: true,
        autoApplySettings: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check profile completeness before enabling auto-apply
    if (validatedData.isEnabled && (validatedData.autoApplyEnabled || validatedData.autoScanEnabled)) {
      // Special check for preferred locations - required for job scanning
      const preferredLocations = profile.preferredLocations ? 
        (Array.isArray(profile.preferredLocations) ? profile.preferredLocations : JSON.parse(profile.preferredLocations || '[]')) : []
      
      if (preferredLocations.length === 0) {
        return NextResponse.json({
          error: 'Preferred locations required',
          message: 'You must specify at least one preferred location before enabling AI job scanning. This ensures jobs are found only in locations where you want to work.',
          details: {
            missingField: 'preferredLocations',
            action: 'Go to your profile and add preferred job locations'
          }
        }, { status: 400 })
      }

      const transformedProfile = {
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
        skills: profile.skills?.map((skill: any) => ({
          name: skill.name,
          proficiency: skill.proficiency,
          yearsUsed: skill.yearsUsed,
        })),
        autoApplySettings: profile.autoApplySettings,
      }

      const completion = calculateProfileCompletion(transformedProfile)
      const criticalFieldsMissing = completion.missingFields.filter(f => f.importance === 'critical')

      if (completion.percentage < 70 || criticalFieldsMissing.length > 0) {
        return NextResponse.json({
          error: 'Profile incomplete for auto-apply',
          message: 'Your profile must be at least 70% complete with all critical fields filled to enable auto-apply.',
          details: {
            currentCompletion: completion.percentage,
            missingCriticalFields: criticalFieldsMissing.map(f => f.label),
            nextSteps: completion.nextSteps.slice(0, 3),
          }
        }, { status: 400 })
      }
    }

    const settingsData = {
      profileId: profile.id,
      isEnabled: validatedData.isEnabled,
      minMatchScore: validatedData.minMatchScore,
      maxApplicationsPerDay: validatedData.maxApplicationsPerDay,
      excludedCompanies: JSON.stringify(validatedData.excludedCompanies || []),
      excludedKeywords: JSON.stringify(validatedData.excludedKeywords || []),
      preferredSources: JSON.stringify(validatedData.preferredSources || ['linkedin', 'indeed']),
      requireSalaryRange: validatedData.requireSalaryRange,
      autoScanEnabled: validatedData.autoScanEnabled,
      scanFrequencyHours: validatedData.scanFrequencyHours,
      // New notification and approval settings
      notifyOnMatch: validatedData.notifyOnMatch ?? true,
      notifyMinScore: validatedData.notifyMinScore ?? 0.6,
      requireApproval: validatedData.requireApproval ?? true,
      autoApplyEnabled: validatedData.autoApplyEnabled ?? false,
      customizeResume: validatedData.customizeResume ?? true,
      reviewTimeoutHours: validatedData.reviewTimeoutHours ?? 24,
    }

    const settings = await prisma.autoApplySettings.upsert({
      where: { profileId: profile.id },
      update: settingsData,
      create: settingsData,
    })

    // Sync with background job scheduler
    try {
      const { jobScheduler } = await import('@/lib/jobQueue/scheduler')
      
      // Update scheduled job frequency if auto scanning is enabled
      if (validatedData.autoScanEnabled && validatedData.isEnabled) {
        console.log(`Updating job scan schedule for user ${session.user.id}: every ${validatedData.scanFrequencyHours} hours`)
      } else {
        console.log(`Auto scanning disabled for user ${session.user.id}`)
      }
      
      // Note: The job scheduler will pick up the new settings automatically
      // when it reads from the database on next scheduled run
    } catch (error) {
      console.error('Failed to sync with background job scheduler:', error)
      // Don't fail the API call if background sync fails
    }

    const parsedSettings = {
      ...settings,
      excludedCompanies: JSON.parse(settings.excludedCompanies || '[]'),
      excludedKeywords: JSON.parse(settings.excludedKeywords || '[]'),
      preferredSources: JSON.parse(settings.preferredSources || '[]'),
    }

    return NextResponse.json({ 
      success: true,
      message: 'Settings saved successfully',
      settings: parsedSettings 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error saving auto-apply settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: { autoApplySettings: true },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Handle partial updates (for toggle functionality)
    const currentSettings = profile.autoApplySettings
    
    if (!currentSettings) {
      // Create default settings if none exist
      const defaultSettings = {
        profileId: profile.id,
        isEnabled: body.isEnabled ?? false,
        minMatchScore: body.minMatchScore ?? 0.75,
        maxApplicationsPerDay: body.maxApplicationsPerDay ?? 5,
        excludedCompanies: JSON.stringify([]),
        excludedKeywords: JSON.stringify([]),
        preferredSources: JSON.stringify(['linkedin', 'indeed']),
        requireSalaryRange: body.requireSalaryRange ?? false,
        autoScanEnabled: body.autoScanEnabled ?? true,
        scanFrequencyHours: body.scanFrequencyHours ?? 6,
        notifyOnMatch: body.notifyOnMatch ?? true,
        notifyMinScore: body.notifyMinScore ?? 0.6,
        requireApproval: body.requireApproval ?? true,
        autoApplyEnabled: body.autoApplyEnabled ?? false,
        customizeResume: body.customizeResume ?? true,
        reviewTimeoutHours: body.reviewTimeoutHours ?? 24,
      }

      const settings = await prisma.autoApplySettings.create({
        data: defaultSettings
      })

      return NextResponse.json({ 
        success: true,
        message: 'Settings created and updated successfully',
        settings: {
          ...settings,
          excludedCompanies: JSON.parse(settings.excludedCompanies || '[]'),
          excludedKeywords: JSON.parse(settings.excludedKeywords || '[]'),
          preferredSources: JSON.parse(settings.preferredSources || '[]'),
        }
      })
    }

    // Update existing settings with only the fields provided
    const updateData: any = {}
    
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled
    if (body.minMatchScore !== undefined) updateData.minMatchScore = body.minMatchScore
    if (body.maxApplicationsPerDay !== undefined) updateData.maxApplicationsPerDay = body.maxApplicationsPerDay
    if (body.requireSalaryRange !== undefined) updateData.requireSalaryRange = body.requireSalaryRange
    if (body.autoScanEnabled !== undefined) updateData.autoScanEnabled = body.autoScanEnabled
    if (body.scanFrequencyHours !== undefined) updateData.scanFrequencyHours = body.scanFrequencyHours
    if (body.notifyOnMatch !== undefined) updateData.notifyOnMatch = body.notifyOnMatch
    if (body.notifyMinScore !== undefined) updateData.notifyMinScore = body.notifyMinScore
    if (body.requireApproval !== undefined) updateData.requireApproval = body.requireApproval
    if (body.autoApplyEnabled !== undefined) updateData.autoApplyEnabled = body.autoApplyEnabled
    if (body.customizeResume !== undefined) updateData.customizeResume = body.customizeResume
    if (body.reviewTimeoutHours !== undefined) updateData.reviewTimeoutHours = body.reviewTimeoutHours
    
    if (body.excludedCompanies !== undefined) updateData.excludedCompanies = JSON.stringify(body.excludedCompanies)
    if (body.excludedKeywords !== undefined) updateData.excludedKeywords = JSON.stringify(body.excludedKeywords)
    if (body.preferredSources !== undefined) updateData.preferredSources = JSON.stringify(body.preferredSources)

    const settings = await prisma.autoApplySettings.update({
      where: { profileId: profile.id },
      data: updateData
    })

    const parsedSettings = {
      ...settings,
      excludedCompanies: JSON.parse(settings.excludedCompanies || '[]'),
      excludedKeywords: JSON.parse(settings.excludedKeywords || '[]'),
      preferredSources: JSON.parse(settings.preferredSources || '[]'),
    }

    return NextResponse.json({ 
      success: true,
      message: 'Settings updated successfully',
      settings: parsedSettings 
    })
  } catch (error) {
    console.error('Error updating auto-apply settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    await prisma.autoApplySettings.deleteMany({
      where: { profileId: profile.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting auto-apply settings:', error)
    return NextResponse.json(
      { error: 'Failed to delete settings' },
      { status: 500 }
    )
  }
}