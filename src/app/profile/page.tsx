'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { AutoApplySettings } from '@/components/profile/AutoApplySettings'
import { ProfileCompletionCard } from '@/components/profile/ProfileCompletionCard'
import { ProfileImportCard } from '@/components/profile/ProfileImportCard'
import { Sidebar } from '@/components/ui/Sidebar'
import { ProfileInput, SkillInput } from '@/lib/validations'
import { parseProfileData } from '@/lib/profileCompletion'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profileData, setProfileData] = useState<(Partial<ProfileInput> & { skills?: SkillInput[] }) | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoApplyData, setAutoApplyData] = useState<any>(null)
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
    details?: string[]
  }>({ type: null, message: '' })
  
  const [profileStatus, setProfileStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile()
      fetchAutoApplySettings()
    }
  }, [session])

  // Refresh profile data when window regains focus (e.g., returning from Resume Builder)
  useEffect(() => {
    const handleWindowFocus = () => {
      if (session?.user?.id) {
        fetchProfile()
      }
    }

    window.addEventListener('focus', handleWindowFocus)
    return () => window.removeEventListener('focus', handleWindowFocus)
  }, [session?.user?.id])

  const fetchProfile = async () => {
    try {
      const [profileResponse, structuredResumeResponse] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/resume/structured').catch(() => null) // Don't fail if no structured resume
      ])
      
      if (profileResponse.ok) {
        const data = await profileResponse.json()
        // Parse profile data consistently
        const parsedProfile = parseProfileData(data.profile)
        
        if (parsedProfile) {
          // Check for structured resume data to ensure consistent completion calculation
          if (structuredResumeResponse?.ok) {
            const structuredData = await structuredResumeResponse.json()
            parsedProfile.structuredResume = structuredData.resumeData
          }
          
          setProfileData(parsedProfile)
        } else {
          // No profile exists yet - pre-populate with user session data
          setProfileData({
            fullName: session?.user?.name || '',
            email: session?.user?.email || '',
            jobTitlePrefs: [],
            preferredLocations: [],
            employmentTypes: [],
            skills: []
          })
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Still pre-populate with session data on error
      setProfileData({
        fullName: session?.user?.name || '',
        email: session?.user?.email || '',
        jobTitlePrefs: [],
        preferredLocations: [],
        employmentTypes: [],
        skills: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAutoApplySettings = async () => {
    try {
      const response = await fetch('/api/auto-apply/settings')
      if (response.ok) {
        const data = await response.json()
        console.log('AutoApply API response:', data)
        setAutoApplyData(data.settings || null)
      }
    } catch (error) {
      console.error('Error fetching auto-apply settings:', error)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  const handleProfileSubmit = async (data: ProfileInput) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Profile creation failed')
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Profile submission error:', error)
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleProfileDraftSave = async (data: Partial<ProfileInput> & { skills?: SkillInput[] }) => {
    try {
      console.log('Client - Draft save data:', JSON.stringify({ ...data, isDraft: true }, null, 2))
      
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, isDraft: true }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.log('Client - Error response:', errorData)
        throw new Error(errorData.message || errorData.error || 'Draft save failed')
      }

      const responseData = await response.json()
      console.log('Client - Draft save successful, server response:', responseData)

      // Show success message
      console.log('Client - Showing success notification')
      setProfileStatus({
        type: 'success',
        message: 'Profile draft saved successfully! Completion percentage updated.'
      })

      // Clear success message after 5 seconds (longer so user can see it)
      setTimeout(() => {
        console.log('Client - Clearing success notification')
        setProfileStatus({ type: null, message: '' })
      }, 5000)

      // Refresh profile data
      await fetchProfile()
    } catch (error) {
      console.error('Profile draft save error:', error)
      setProfileStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred while saving draft'
      })
    }
  }

  const handleAutoApplySubmit = async (data: any) => {
    try {
      setSaveStatus({ type: null, message: '' })
      
      const response = await fetch('/api/auto-apply/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const responseData = await response.json()

      if (!response.ok) {
        if (response.status === 400 && responseData.error === 'Profile incomplete for auto-apply') {
          setSaveStatus({
            type: 'error',
            message: responseData.message,
            details: responseData.details.nextSteps
          })
        } else {
          setSaveStatus({
            type: 'error',
            message: responseData.error || 'Failed to save AI settings',
          })
        }
        return
      }
      
      // Refresh the data
      await fetchAutoApplySettings()
      setSaveStatus({
        type: 'success',
        message: responseData.message || 'AI settings saved successfully!'
      })

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSaveStatus({ type: null, message: '' })
      }, 5000)

    } catch (error) {
      console.error('Error saving AI settings:', error)
      setSaveStatus({
        type: 'error',
        message: 'Network error: Failed to save AI settings. Please try again.'
      })
    }
  }

  return (
    <Sidebar>
      <div className="pt-4 pr-4 pb-4 lg:pt-6 lg:pr-6 lg:pb-6">
        <div className="max-w-4xl space-y-4">
          {/* Profile Completion Card */}
          {profileData && (
            <ProfileCompletionCard 
              profile={profileData} 
              compact={true} 
              onRefresh={fetchProfile}
            />
          )}

          {/* Profile Import Card - Temporarily hidden until ready */}
          {/* <ProfileImportCard /> */}
          
          {/* Profile Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
              <p className="text-gray-600 mt-2">
                Tell us about yourself to help our AI find the perfect job matches.
              </p>
            </div>
            <div className="p-6">
              {/* Status Message for Profile */}
              {profileStatus.type && (
                <div className={`mb-6 p-4 rounded-lg border ${
                  profileStatus.type === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {profileStatus.type === 'success' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="font-medium">{profileStatus.message}</p>
                    </div>
                    <button
                      onClick={() => setProfileStatus({ type: null, message: '' })}
                      className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              <ProfileForm 
                onSubmit={handleProfileSubmit} 
                onSaveDraft={handleProfileDraftSave}
                initialData={profileData || undefined} 
              />
            </div>
          </div>

          {/* AI Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">AI Auto-Apply Settings</h2>
              <p className="text-gray-600 mt-2">
                Configure how the AI automatically finds and applies to jobs that match your profile.
              </p>
            </div>
            <div className="p-6">
              {/* Status Message */}
              {saveStatus.type && (
                <div className={`mb-6 p-4 rounded-lg border ${
                  saveStatus.type === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {saveStatus.type === 'success' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="font-medium">{saveStatus.message}</p>
                      {saveStatus.details && saveStatus.details.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">Next steps:</p>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {saveStatus.details.map((detail, index) => (
                              <li key={index}>{detail}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSaveStatus({ type: null, message: '' })}
                      className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <AutoApplySettings 
                initialData={autoApplyData}
                onSubmit={handleAutoApplySubmit} 
              />
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  )
}