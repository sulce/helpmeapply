'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Sidebar } from '@/components/ui/Sidebar'
import { ResumeViewer } from '@/components/profile/ResumeViewer'
import { ApplicationsList } from '@/components/dashboard/ApplicationsList'
import { ProfileCompletionCard } from '@/components/profile/ProfileCompletionCard'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { FirstTimeUserSetup } from '@/components/onboarding/FirstTimeUserSetup'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { PerformanceAnalytics } from '@/components/dashboard/PerformanceAnalytics'
import { ResumeAnalytics } from '@/components/dashboard/ResumeAnalytics'
import { AIInsights } from '@/components/dashboard/AIInsights'
import { InterviewHistory } from '@/components/interview/InterviewHistory'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { User, Settings, Search, FileText, BarChart3, Upload, Zap, RefreshCw, Home, Target, Brain, Mic, CreditCard, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { shouldShowOnboarding, calculateProfileCompletion, parseProfileData } from '@/lib/profileCompletion'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [applications, setApplications] = useState<any>(null)
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [autoApplySettings, setAutoApplySettings] = useState<any>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false)
  const [jobStats, setJobStats] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [usageData, setUsageData] = useState<any>(null)

  const fetchProfile = useCallback(async () => {
    try {
      const [profileResponse, structuredResumeResponse] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/resume/structured').catch(() => null) // Don't fail if no structured resume
      ])
      
      if (profileResponse.ok) {
        const data = await profileResponse.json()
        
        // Parse profile data consistently
        const parsedProfile = parseProfileData(data.profile)
        
        // Check for structured resume data
        if (structuredResumeResponse?.ok) {
          const structuredData = await structuredResumeResponse.json()
          parsedProfile.structuredResume = structuredData.resumeData
        }
        
        setProfile(parsedProfile)
        
        // Check if this is a first-time user (no profile exists or very incomplete)
        const isFirstTime = !parsedProfile || 
          (!parsedProfile.fullName && 
           !parsedProfile.jobTitlePrefs?.length && 
           !parsedProfile.resumeUrl && 
           !parsedProfile.structuredResume)
        setIsFirstTimeUser(isFirstTime)
        
        // Check if we should show onboarding
        const shouldShow = shouldShowOnboarding(parsedProfile)
        console.log('📊 Dashboard onboarding check:', {
          shouldShow,
          profile: {
            fullName: parsedProfile?.fullName,
            email: parsedProfile?.email,
            jobTitlePrefs: parsedProfile?.jobTitlePrefs,
            skills: parsedProfile?.skills?.length,
            resumeUrl: parsedProfile?.resumeUrl,
            structuredResume: !!parsedProfile?.structuredResume,
            autoApplySettings: !!parsedProfile?.autoApplySettings
          }
        })
        setShowOnboarding(shouldShow)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      // On error, treat as first-time user with minimal data from session
      setProfile({
        fullName: session?.user?.name || '',
        email: session?.user?.email || '',
        jobTitlePrefs: [],
        preferredLocations: [],
        employmentTypes: [],
        skills: []
      })
      setIsFirstTimeUser(true)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [])

  const fetchApplications = useCallback(async () => {
    try {
      const response = await fetch('/api/applications')
      if (response.ok) {
        const data = await response.json()
        setApplications(data)
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setIsLoadingApplications(false)
    }
  }, [])

  const fetchAutoApplySettings = useCallback(async () => {
    try {
      const response = await fetch('/api/auto-apply/settings')
      if (response.ok) {
        const data = await response.json()
        setAutoApplySettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching auto-apply settings:', error)
    }
  }, [])

  const fetchJobStats = useCallback(async () => {
    try {
      const [jobsResponse, queueResponse] = await Promise.all([
        fetch('/api/jobs'),
        fetch('/api/jobs/queue/status')
      ])
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        const jobs = jobsData.data?.jobs || []
        // Count jobs from the last 24 hours (truly new jobs)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const newJobs = jobs.filter((job: any) => {
          const jobDate = new Date(job.createdAt)
          return jobDate > yesterday && !job.appliedTo
        })
        setJobStats({ newJobs: newJobs.length, totalJobs: jobs.length })
      }
    } catch (error) {
      console.error('Error fetching job stats:', error)
    }
  }, [])

  const fetchUsageData = useCallback(async () => {
    try {
      const response = await fetch('/api/plans/usage')
      if (response.ok) {
        const data = await response.json()
        setUsageData(data.usage)
      }
    } catch (error) {
      console.error('Error fetching usage data:', error)
    }
  }, [])

  const startJobScan = async () => {
    try {
      setIsScanning(true)
      const response = await fetch('/api/jobs/scan', {
        method: 'POST'
      })
      if (response.ok) {
        // Refresh job stats after scan
        setTimeout(() => {
          fetchJobStats()
          setIsScanning(false)
        }, 3000)
      } else {
        setIsScanning(false)
      }
    } catch (error) {
      console.error('Error starting job scan:', error)
      setIsScanning(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchProfile()
      fetchApplications()
      fetchAutoApplySettings()
      fetchJobStats()
      fetchUsageData()
    }
  }, [status, router, fetchProfile, fetchApplications, fetchAutoApplySettings, fetchJobStats, fetchUsageData])

  // Refresh profile data when window regains focus (e.g., returning from Resume Builder)
  useEffect(() => {
    const handleWindowFocus = () => {
      if (status === 'authenticated') {
        fetchProfile()
      }
    }

    window.addEventListener('focus', handleWindowFocus)
    return () => window.removeEventListener('focus', handleWindowFocus)
  }, [status, fetchProfile])

  // Refresh profile data after onboarding
  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false)
    // Fetch profile without triggering onboarding check
    try {
      const [profileResponse, structuredResumeResponse] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/resume/structured')
      ])

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        let parsedProfile = parseProfileData(profileData.profile)

        if (structuredResumeResponse?.ok) {
          const structuredData = await structuredResumeResponse.json()
          parsedProfile.structuredResume = structuredData.resumeData
        }

        setProfile(parsedProfile)
        // Don't call shouldShowOnboarding here - user just completed it!
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }, [])

  // Allow onboarding wizard to trigger profile refresh
  const handleOnboardingRefresh = useCallback(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleOnboardingSkip = useCallback(() => {
    setShowOnboarding(false)
  }, [])

  const handleFirstTimeUserComplete = useCallback(async (method: 'upload' | 'manual') => {
    setIsFirstTimeUser(false)
    
    if (method === 'upload') {
      // Resume was uploaded and parsed, refresh profile and stay on dashboard
      await fetchProfile()
    }
    // For manual entry, the FirstTimeUserSetup component handles the redirect to resume builder
  }, [fetchProfile])

  const handleFirstTimeUserSkip = useCallback(() => {
    setIsFirstTimeUser(false)
  }, [])

  if (status === 'loading' || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Dashboard</h2>
          <p className="text-gray-500">Setting up your personalized job search hub...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <Sidebar>
      <div className="p-4 md:pt-4 md:pr-4 md:pb-4 lg:pt-6 lg:pr-6 lg:pb-6">
        <div className="space-y-4">
          {/* Welcome Section */}
          <div className="bg-white shadow rounded-lg p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2 truncate">
                    Welcome back, {session.user?.name || 'Job Seeker'}!
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 line-clamp-2">
                    Your AI-powered job application assistant is ready to help you find and apply to your dream jobs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Status Section */}
          {usageData && (
            <div className="bg-white shadow rounded-lg p-4 lg:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {usageData.planTitle}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {usageData.isTrialActive
                        ? `Trial - ${usageData.daysRemainingInPeriod} days remaining`
                        : 'Active Subscription'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm w-full sm:w-auto">
                    <div className="text-center sm:text-right">
                      <div className="font-medium text-gray-900">
                        {usageData.autoApplications.used}/{usageData.autoApplications.limit === Infinity ? '∞' : usageData.autoApplications.limit}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">Auto Apps</div>
                    </div>
                    <div className="text-center sm:text-right">
                      <div className="font-medium text-gray-900">
                        {usageData.mockInterviews.used}/{usageData.mockInterviews.limit || 'N/A'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">Interviews</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/billing')}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Manage Plan
                  </Button>
                </div>
              </div>
              {usageData.isTrialActive && usageData.daysRemainingInPeriod <= 2 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-yellow-600 mr-2" />
                    <div className="text-sm text-yellow-800">
                      Your trial expires soon. Upgrade to continue using all features.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile Completion Section */}
          <div className="mb-6">
            <ProfileCompletionCard 
              profile={profile} 
              compact={true} 
              onRefresh={fetchProfile}
            />
          </div>

          {/* Tabbed Dashboard */}
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="border-b border-gray-200 overflow-x-auto">
              <TabsList className="w-full justify-start bg-transparent p-0 h-auto inline-flex min-w-full">
                <TabsTrigger value="overview" className="flex items-center space-x-1 sm:space-x-2 pb-3 px-2 sm:px-0 sm:pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-xs sm:text-sm whitespace-nowrap">
                  <Home className="h-4 w-4 flex-shrink-0" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center space-x-1 sm:space-x-2 pb-3 px-2 sm:px-0 sm:pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-xs sm:text-sm whitespace-nowrap">
                  <Target className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Performance</span>
                  <span className="sm:hidden">Perf</span>
                </TabsTrigger>
                <TabsTrigger value="resume" className="flex items-center space-x-1 sm:space-x-2 pb-3 px-2 sm:px-0 sm:pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-xs sm:text-sm whitespace-nowrap">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span>Resume</span>
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex items-center space-x-1 sm:space-x-2 pb-3 px-2 sm:px-0 sm:pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-xs sm:text-sm whitespace-nowrap">
                  <Brain className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">AI Insights</span>
                  <span className="sm:hidden">AI</span>
                </TabsTrigger>
                <TabsTrigger value="interviews" className="flex items-center space-x-1 sm:space-x-2 pb-3 px-2 sm:px-0 sm:pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-xs sm:text-sm whitespace-nowrap">
                  <Mic className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Interview Practice</span>
                  <span className="sm:hidden">Interview</span>
                </TabsTrigger>
                <TabsTrigger value="applications" className="flex items-center space-x-1 sm:space-x-2 pb-3 px-2 sm:px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-xs sm:text-sm whitespace-nowrap">
                  <BarChart3 className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Applications</span>
                  <span className="sm:hidden">Apps</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              <DashboardOverview
                profile={profile}
                jobStats={jobStats}
                applications={applications}
                autoApplySettings={autoApplySettings}
                isScanning={isScanning}
                startJobScan={startJobScan}
              />
            </TabsContent>

            <TabsContent value="performance">
              <PerformanceAnalytics />
            </TabsContent>

            <TabsContent value="resume">
              <div className="space-y-8">
                <ResumeAnalytics />
                
                {/* Resume Section */}
                {!isLoadingProfile && (
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Current Resume
                      </h3>
                      {profile?.resumeUrl ? (
                        <ResumeViewer
                          resumeUrl={profile.resumeUrl}
                          fileName="Resume.pdf"
                          onDelete={async () => {
                            try {
                              const response = await fetch('/api/upload', {
                                method: 'DELETE',
                              })
                              if (response.ok) {
                                setProfile({ ...profile, resumeUrl: null })
                              }
                            } catch (error) {
                              console.error('Error deleting resume:', error)
                            }
                          }}
                        />
                      ) : (
                        <div className="text-center py-8">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No resume uploaded</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Upload your resume to improve job matching and applications.
                          </p>
                          <div className="mt-6">
                            <Button
                              onClick={() => router.push('/profile')}
                              className="inline-flex items-center"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Resume
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="insights">
              <AIInsights />
            </TabsContent>

            <TabsContent value="interviews">
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Practice</h3>
                  <p className="text-gray-600 mb-4">
                    Practice interviews for your job applications with AI-powered questions and feedback.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">How it works:</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Click &quot;Practice Interview&quot; on any job application</li>
                      <li>Answer AI-generated questions based on the job description</li>
                      <li>Get real-time feedback on your responses</li>
                      <li>Track your progress and improvement over time</li>
                    </ol>
                  </div>
                </div>
                <InterviewHistory />
              </div>
            </TabsContent>

            <TabsContent value="applications">
              <ApplicationsList />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* First Time User Setup */}
      {isFirstTimeUser && (
        <FirstTimeUserSetup
          onComplete={handleFirstTimeUserComplete}
          onSkip={handleFirstTimeUserSkip}
          userEmail={session?.user?.email || undefined}
          userName={session?.user?.name || undefined}
        />
      )}

      {/* Onboarding Wizard */}
      {!isFirstTimeUser && showOnboarding && (
        <OnboardingWizard
          profile={profile}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
          onRefresh={handleOnboardingRefresh}
        />
      )}
    </Sidebar>
  )
}