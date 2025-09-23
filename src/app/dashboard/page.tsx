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
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { PerformanceAnalytics } from '@/components/dashboard/PerformanceAnalytics'
import { ResumeAnalytics } from '@/components/dashboard/ResumeAnalytics'
import { AIInsights } from '@/components/dashboard/AIInsights'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { User, Settings, Search, FileText, BarChart3, Upload, Zap, RefreshCw, Home, Target, Brain } from 'lucide-react'
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
  const [jobStats, setJobStats] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)

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
        
        // Check if we should show onboarding
        const shouldShow = shouldShowOnboarding(parsedProfile)
        setShowOnboarding(shouldShow)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
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
    }
  }, [status, router, fetchProfile, fetchApplications, fetchAutoApplySettings, fetchJobStats])

  // Refresh profile data after onboarding
  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false)
    fetchProfile()
  }, [fetchProfile])

  // Allow onboarding wizard to trigger profile refresh
  const handleOnboardingRefresh = useCallback(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleOnboardingSkip = useCallback(() => {
    setShowOnboarding(false)
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
      <div className="p-3 lg:p-4">
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
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Welcome back, {session.user?.name || 'Job Seeker'}!
                  </h2>
                  <p className="text-gray-600">
                    Your AI-powered job application assistant is ready to help you find and apply to your dream jobs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Completion Section */}
          <div className="mb-6">
            <ProfileCompletionCard profile={profile} compact={true} />
          </div>

          {/* Tabbed Dashboard */}
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="border-b border-gray-200">
              <TabsList className="w-full justify-start bg-transparent p-0 h-auto">
                <TabsTrigger value="overview" className="flex items-center space-x-2 pb-3 px-0 pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                  <Home className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center space-x-2 pb-3 px-0 pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                  <Target className="h-4 w-4" />
                  <span>Performance</span>
                </TabsTrigger>
                <TabsTrigger value="resume" className="flex items-center space-x-2 pb-3 px-0 pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                  <FileText className="h-4 w-4" />
                  <span>Resume</span>
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex items-center space-x-2 pb-3 px-0 pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                  <Brain className="h-4 w-4" />
                  <span>AI Insights</span>
                </TabsTrigger>
                <TabsTrigger value="applications" className="flex items-center space-x-2 pb-3 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                  <BarChart3 className="h-4 w-4" />
                  <span>Applications</span>
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

            <TabsContent value="applications">
              <ApplicationsList />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Onboarding Wizard */}
      {showOnboarding && (
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