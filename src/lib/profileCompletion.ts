// Safe JSON parsing helper
function safeJsonParse(value: string | null | undefined, defaultValue: any = []): any {
  if (!value || typeof value !== 'string') {
    return defaultValue
  }
  
  try {
    const parsed = JSON.parse(value)
    return parsed !== null && parsed !== undefined ? parsed : defaultValue
  } catch (error) {
    console.warn('Failed to parse JSON:', value, error)
    return defaultValue
  }
}

interface Profile {
  fullName?: string
  email?: string
  mobile?: string | null
  jobTitlePrefs?: string[] | string | null // Can be array (parsed) or string (raw)
  yearsExperience?: number | null
  salaryMin?: number | null
  salaryMax?: number | null
  preferredLocations?: string[] | string | null // Can be array (parsed) or string (raw)
  employmentTypes?: string[] | string | null // Can be array (parsed) or string (raw)
  resumeUrl?: string | null
  structuredResume?: any // For resume builder data
  linkedinUrl?: string | null
  skills?: Array<{
    name: string
    proficiency: string
    yearsUsed?: number | null
  }>
  autoApplySettings?: {
    isEnabled?: boolean
    minMatchScore?: number
    maxApplicationsPerDay?: number
    notifyOnMatch?: boolean
    requireApproval?: boolean
  } | null
}

interface ProfileCompletionResult {
  percentage: number
  completedFields: number
  totalFields: number
  missingFields: Array<{
    field: string
    label: string
    importance: 'critical' | 'important' | 'optional'
  }>
  nextSteps: string[]
}

export function calculateProfileCompletion(profile: Profile | null | undefined): ProfileCompletionResult {
  console.log('Profile completion - Input profile:', profile)
  console.log('Profile completion - Skills data:', profile?.skills)
  console.log('Profile completion - Skills array check:', Array.isArray(profile?.skills))
  console.log('Profile completion - Skills length:', profile?.skills?.length)
  
  if (!profile) {
    return {
      percentage: 0,
      completedFields: 0,
      totalFields: 12,
      missingFields: [
        { field: 'fullName', label: 'Full Name', importance: 'critical' },
        { field: 'email', label: 'Email Address', importance: 'critical' },
        { field: 'jobTitlePrefs', label: 'Job Title Preferences', importance: 'critical' },
        { field: 'yearsExperience', label: 'Years of Experience', importance: 'important' },
        { field: 'skills', label: 'Skills', importance: 'critical' },
        { field: 'preferredLocations', label: 'Preferred Locations', importance: 'important' },
        { field: 'employmentTypes', label: 'Employment Types', importance: 'important' },
        { field: 'salaryRange', label: 'Salary Range', importance: 'important' },
        { field: 'resumeUrl', label: 'Resume Upload', importance: 'critical' },
        { field: 'mobile', label: 'Phone Number', importance: 'optional' },
        { field: 'linkedinUrl', label: 'LinkedIn Profile', importance: 'optional' },
        { field: 'autoApplySettings', label: 'AI Application Settings', importance: 'important' },
      ],
      nextSteps: [
        'Complete your basic profile information',
        'Upload your resume',
        'Add your skills and experience',
        'Set up AI application preferences'
      ]
    }
  }

  // Define field weights based on importance for job applications
  const fields = [
    // Critical fields (required for AI to work effectively)
    { key: 'fullName', weight: 10, isComplete: !!profile.fullName?.trim(), label: 'Full Name', importance: 'critical' as const },
    { key: 'email', weight: 10, isComplete: !!profile.email?.trim(), label: 'Email Address', importance: 'critical' as const },
    { key: 'jobTitlePrefs', weight: 15, isComplete: (() => {
      const prefs = Array.isArray(profile.jobTitlePrefs) ? profile.jobTitlePrefs : safeJsonParse(profile.jobTitlePrefs, [])
      return prefs.length > 0
    })(), label: 'Job Title Preferences', importance: 'critical' as const },
    { key: 'skills', weight: 15, isComplete: (() => {
      const isArray = Array.isArray(profile.skills)
      const length = profile.skills?.length || 0
      const isComplete = isArray && length >= 3
      console.log('Profile completion - Skills check:', { isArray, length, isComplete, skills: profile.skills })
      return isComplete
    })(), label: 'Skills (at least 3)', importance: 'critical' as const },
    { key: 'resumeUrl', weight: 15, isComplete: !!(profile.resumeUrl || profile.structuredResume), label: 'Resume Upload', importance: 'critical' as const },
    
    // Important fields (enhance AI matching)
    { key: 'yearsExperience', weight: 8, isComplete: profile.yearsExperience !== null && profile.yearsExperience !== undefined, label: 'Years of Experience', importance: 'important' as const },
    { key: 'preferredLocations', weight: 8, isComplete: (() => {
      const locations = Array.isArray(profile.preferredLocations) ? profile.preferredLocations : safeJsonParse(profile.preferredLocations, [])
      return locations.length > 0
    })(), label: 'Preferred Locations', importance: 'important' as const },
    { key: 'employmentTypes', weight: 6, isComplete: safeJsonParse(profile.employmentTypes as string, []).length > 0, label: 'Employment Types', importance: 'important' as const },
    { key: 'salaryRange', weight: 7, isComplete: !!profile.salaryMin || !!profile.salaryMax, label: 'Salary Range', importance: 'important' as const },
    { key: 'autoApplySettings', weight: 10, isComplete: !!profile.autoApplySettings, label: 'AI Application Settings', importance: 'important' as const },
    
    // Optional fields (nice to have)
    { key: 'mobile', weight: 3, isComplete: !!profile.mobile?.trim(), label: 'Phone Number', importance: 'optional' as const },
    { key: 'linkedinUrl', weight: 3, isComplete: !!profile.linkedinUrl?.trim(), label: 'LinkedIn Profile', importance: 'optional' as const },
  ]

  const completedFields = fields.filter(field => field.isComplete)
  const missingFields = fields.filter(field => !field.isComplete)
  
  // Calculate weighted completion percentage
  const totalWeight = fields.reduce((sum, field) => sum + field.weight, 0)
  const completedWeight = completedFields.reduce((sum, field) => sum + field.weight, 0)
  const percentage = Math.round((completedWeight / totalWeight) * 100)

  // Generate next steps based on missing critical/important fields
  const nextSteps: string[] = []
  const missingCritical = missingFields.filter(f => f.importance === 'critical')
  const missingImportant = missingFields.filter(f => f.importance === 'important')

  if (missingCritical.length > 0) {
    if (missingCritical.some(f => f.key === 'resumeUrl')) {
      nextSteps.push('Upload your resume or use the Resume Builder - this is essential for AI to customize applications')
    }
    if (missingCritical.some(f => f.key === 'jobTitlePrefs')) {
      nextSteps.push('Add job title preferences to help AI find relevant positions')
    }
    if (missingCritical.some(f => f.key === 'skills')) {
      nextSteps.push('Add at least 3 skills with proficiency levels for better job matching')
    }
    if (missingCritical.some(f => f.key === 'fullName' || f.key === 'email')) {
      nextSteps.push('Complete basic profile information (name, email)')
    }
  }

  if (missingImportant.length > 0 && missingCritical.length === 0) {
    if (missingImportant.some(f => f.key === 'autoApplySettings')) {
      nextSteps.push('Configure AI application settings to start automatic job searching')
    }
    if (missingImportant.some(f => f.key === 'yearsExperience')) {
      nextSteps.push('Add years of experience for more accurate job matching')
    }
    if (missingImportant.some(f => f.key === 'preferredLocations')) {
      nextSteps.push('Set preferred locations to find jobs in your desired areas')
    }
    if (missingImportant.some(f => f.key === 'salaryRange')) {
      nextSteps.push('Set salary expectations to filter appropriate opportunities')
    }
  }

  if (nextSteps.length === 0 && percentage < 100) {
    nextSteps.push('Complete optional fields like phone number and LinkedIn profile')
  }

  if (percentage >= 100) {
    nextSteps.push('Your profile is complete! AI job search is ready to work for you.')
  }

  return {
    percentage,
    completedFields: completedFields.length,
    totalFields: fields.length,
    missingFields: missingFields.map(f => ({
      field: f.key,
      label: f.label,
      importance: f.importance
    })),
    nextSteps
  }
}

export function getProfileCompletionColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600'
  if (percentage >= 70) return 'text-yellow-600' 
  if (percentage >= 50) return 'text-orange-600'
  return 'text-red-600'
}

export function getProfileCompletionBgColor(percentage: number): string {
  if (percentage >= 90) return 'bg-green-100 border-green-200'
  if (percentage >= 70) return 'bg-yellow-100 border-yellow-200'
  if (percentage >= 50) return 'bg-orange-100 border-orange-200'
  return 'bg-red-100 border-red-200'
}

export function shouldShowOnboarding(profile: Profile | null): boolean {
  if (!profile) return true
  
  const completion = calculateProfileCompletion(profile)
  const hasCriticalMissing = completion.missingFields.some(f => f.importance === 'critical')
  const criticalMissing = completion.missingFields.filter(f => f.importance === 'critical')
  
  // If user has AI automation settings configured, they've completed onboarding
  // Don't show onboarding again unless they're missing critical fields
  if (profile.autoApplySettings) {
    // Special case: If ONLY missing jobTitlePrefs but has resume, don't show onboarding
    // This fixes the issue where users uploaded resume but never manually set job titles
    if (criticalMissing.length === 1 && criticalMissing[0].field === 'jobTitlePrefs' && 
        (profile.resumeUrl || profile.structuredResume)) {
      return false
    }
    
    return hasCriticalMissing
  }
  
  // For users without AI settings, use the original logic
  // Show onboarding if profile completion is less than 60% or missing critical fields
  return completion.percentage < 60 || hasCriticalMissing
}

// Helper function to parse profile data consistently across the app
export function parseProfileData(rawProfile: any): any | null {
  if (!rawProfile) return null
  
  const parsed = {
    ...rawProfile,
    jobTitlePrefs: Array.isArray(rawProfile.jobTitlePrefs) ? rawProfile.jobTitlePrefs : safeJsonParse(rawProfile.jobTitlePrefs as string, []),
    preferredLocations: Array.isArray(rawProfile.preferredLocations) ? rawProfile.preferredLocations : safeJsonParse(rawProfile.preferredLocations as string, []),
    employmentTypes: Array.isArray(rawProfile.employmentTypes) ? rawProfile.employmentTypes : safeJsonParse(rawProfile.employmentTypes as string, []),
    skills: rawProfile.skills || []
  }
  
  console.log('parseProfileData - Raw skills:', rawProfile.skills)
  console.log('parseProfileData - Parsed skills:', parsed.skills)
  console.log('parseProfileData - Skills is array:', Array.isArray(parsed.skills))
  
  return parsed
}

export function getOnboardingStep(profile: Profile | null): 'profile' | 'skills' | 'resume' | 'preferences' | 'complete' {
  console.log('🎯 Checking onboarding step for profile:', {
    hasProfile: !!profile,
    fullName: profile?.fullName,
    email: profile?.email,
    jobTitlePrefs: profile?.jobTitlePrefs,
    jobTitlePrefsLength: Array.isArray(profile?.jobTitlePrefs) ? profile.jobTitlePrefs.length : 'not array',
    skillsLength: Array.isArray(profile?.skills) ? profile.skills.length : 'not array',
    resumeUrl: !!profile?.resumeUrl,
    structuredResume: !!profile?.structuredResume,
    autoApplySettings: !!profile?.autoApplySettings
  })

  // If no profile exists or basic info is missing, start with profile setup
  if (!profile?.fullName || !profile?.email) {
    console.log('🎯 Returning: profile - missing basic info')
    return 'profile'
  }

  // If user has a resume uploaded, skip to skills regardless of job title prefs
  // This fixes the issue where onboarding gets stuck on resume setup step
  if (profile.resumeUrl || profile.structuredResume) {
    // If skills are insufficient, go to skills step
    if (!Array.isArray(profile.skills) || profile.skills.length < 3) {
      console.log('🎯 Returning: skills - resume exists but skills insufficient')
      return 'skills'
    }
    
    // If no automation preferences set, go to preferences
    if (!profile.autoApplySettings) {
      console.log('🎯 Returning: preferences - resume and skills exist')
      return 'preferences'
    }
    
    // Everything is complete
    console.log('🎯 Returning: complete - all requirements met')
    return 'complete'
  }

  // No resume uploaded yet - check if job title prefs are set
  if (!Array.isArray(profile?.jobTitlePrefs) || profile.jobTitlePrefs.length === 0) {
    console.log('🎯 Returning: profile - no job title preferences')
    return 'profile'
  }
  
  // If skills are insufficient, go to skills step
  if (!Array.isArray(profile.skills) || profile.skills.length < 3) {
    console.log('🎯 Returning: skills')
    return 'skills'
  }
  
  // Resume is still needed
  if (!profile.resumeUrl && !profile.structuredResume) {
    console.log('🎯 Returning: resume')
    return 'resume'
  }
  
  // Automation preferences needed
  if (!profile.autoApplySettings) {
    console.log('🎯 Returning: preferences')
    return 'preferences'
  }
  
  console.log('🎯 Returning: complete')
  return 'complete'
}