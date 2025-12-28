import { prisma } from './db'

export interface ResolvedJobPreferences {
  query: string
  location?: string
  employmentTypes: string[]
  source: 'USER' | 'RESUME'
}

/**
 * Resolve job search preferences based on user's preference source
 */
export async function resolveJobPreferences(userId: string): Promise<ResolvedJobPreferences> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      jobTitlePrefs: true,
      defaultJobTitle: true,
      preferencesSource: true,
      preferredLocations: true,
      employmentTypes: true,
    }
  })

  if (!profile) {
    throw new Error('User profile not found')
  }

  // Parse existing preferences
  const userJobTitles = profile.jobTitlePrefs ? JSON.parse(profile.jobTitlePrefs) : []
  const userLocations = profile.preferredLocations ? JSON.parse(profile.preferredLocations) : []
  const userEmploymentTypes = profile.employmentTypes ? JSON.parse(profile.employmentTypes) : []

  // Determine if user has set custom preferences
  const hasUserPreferences = userJobTitles.length > 0

  if (hasUserPreferences) {
    // Use user-defined preferences
    const resolved = {
      query: userJobTitles.join(' OR '),
      location: userLocations.length > 0 ? userLocations[0] : undefined,
      employmentTypes: userEmploymentTypes,
      source: 'USER' as const
    }
    console.log(`🔍 [VALIDATION] Using USER preferences - Query: "${resolved.query}", Location: "${resolved.location || 'Any'}"`)
    return resolved
  } else {
    // Use resume-derived defaults
    const query = profile.defaultJobTitle || 'software engineer'
    const resolved = {
      query,
      location: undefined, // No default location from resume
      employmentTypes: ['FULL_TIME'], // Default employment type
      source: 'RESUME' as const
    }
    console.log(`📄 [VALIDATION] Using RESUME preferences - Query: "${resolved.query}", DefaultJobTitle: "${profile.defaultJobTitle || 'none'}"`)
    return resolved
  }
}

/**
 * Get job search query for a specific user
 */
export async function getJobSearchQuery(userId: string): Promise<string> {
  const preferences = await resolveJobPreferences(userId)
  return preferences.query
}

/**
 * Update user preferences and mark as USER-defined
 */
export async function updateUserJobPreferences(
  userId: string,
  preferences: {
    jobTitles?: string[]
    locations?: string[]
    employmentTypes?: string[]
  }
): Promise<void> {
  await prisma.profile.update({
    where: { userId },
    data: {
      jobTitlePrefs: preferences.jobTitles ? JSON.stringify(preferences.jobTitles) : undefined,
      preferredLocations: preferences.locations ? JSON.stringify(preferences.locations) : undefined,
      employmentTypes: preferences.employmentTypes ? JSON.stringify(preferences.employmentTypes) : undefined,
      preferencesSource: 'USER'
    }
  })
}