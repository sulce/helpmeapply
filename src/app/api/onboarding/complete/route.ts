import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { method } = await req.json() // 'upload' or 'manual'

    // Get the user's profile to ensure it exists
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: { autoApplySettings: true },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Create default AI settings if they don't exist
    if (!profile.autoApplySettings) {
      const defaultAutoApplySettings = {
        profileId: profile.id,
        isEnabled: false, // Start disabled until user manually enables
        minMatchScore: 0.75, // 75% match score requirement
        maxApplicationsPerDay: 5, // Conservative start
        excludedCompanies: JSON.stringify([]),
        excludedKeywords: JSON.stringify(['unpaid', 'volunteer', 'commission only']),
        preferredSources: JSON.stringify(['linkedin', 'indeed']),
        requireSalaryRange: false,
        autoScanEnabled: true, // Enable scanning but not auto-applying
        scanFrequencyHours: 6, // Scan every 6 hours
        notifyOnMatch: true, // Notify user of good matches
        notifyMinScore: 0.6, // Notify for 60%+ matches
        requireApproval: true, // Always require approval initially
        autoApplyEnabled: false, // User must enable this manually
        customizeResume: true, // Always customize resumes
        reviewTimeoutHours: 24, // Give users 24 hours to review
      }

      await prisma.autoApplySettings.create({
        data: defaultAutoApplySettings
      })

      console.log('Created default AI settings for user:', session.user.id)
    }

    // Update user's profile to mark onboarding as complete
    await prisma.user.update({
      where: { id: session.user.id },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      defaultSettingsCreated: !profile.autoApplySettings,
      setupMethod: method
    })

  } catch (error) {
    console.error('Onboarding completion error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to complete onboarding',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}