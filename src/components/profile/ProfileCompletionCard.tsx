'use client'

import { useRouter } from 'next/navigation'

interface ProfileCompletionCardProps {
  profile?: any
  compact?: boolean
  onRefresh?: () => Promise<void>
  className?: string
}

export function ProfileCompletionCard({ profile, compact, onRefresh, className }: ProfileCompletionCardProps) {
  const router = useRouter()
  
  // Check if user has uploaded a resume
  const hasResume = !!profile?.resumeUrl
  
  // Check if user has set custom job preferences
  const hasCustomPreferences = profile?.jobTitlePrefs && 
                               (() => {
                                 try {
                                   return JSON.parse(profile.jobTitlePrefs).length > 0
                                 } catch (error) {
                                   console.warn('Failed to parse jobTitlePrefs:', error)
                                   return false
                                 }
                               })()
  
  // Check if user has a default job title from resume
  const hasDefaultJobTitle = !!profile?.defaultJobTitle
  
  // Determine status based on new simplified flow
  if (!hasResume) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className || ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-1">Get Started</h3>
            <p className="text-blue-700 text-sm">
              Upload your resume to start finding jobs automatically
            </p>
          </div>
          <button 
            onClick={() => router.push('/profile')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            Upload Resume
          </button>
        </div>
      </div>
    )
  }
  
  // Resume uploaded, show job search status
  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-green-900 mb-1">Ready to Find Jobs!</h3>
          <div className="space-y-1">
            <p className="text-green-700 text-sm">
              {hasDefaultJobTitle && (
                <>Searching for: <span className="font-medium">{profile.defaultJobTitle}</span></>
              )}
              {!hasDefaultJobTitle && hasCustomPreferences && (
                <>Using your custom job preferences</>
              )}
              {!hasDefaultJobTitle && !hasCustomPreferences && (
                <>Ready to search for jobs</>
              )}
            </p>
            {!hasCustomPreferences && (
              <p className="text-green-600 text-xs">
                Want different jobs? 
                <button 
                  onClick={() => router.push('/profile')}
                  className="ml-1 text-green-700 hover:text-green-800 underline font-medium"
                >
                  Refine job preferences
                </button>
              </p>
            )}
          </div>
        </div>
        <div className="ml-4">
          <button 
            onClick={() => router.push('/jobs')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm"
          >
            View Jobs
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileCompletionCard