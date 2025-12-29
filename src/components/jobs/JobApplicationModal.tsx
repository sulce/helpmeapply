'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  X, 
  FileText, 
  Briefcase, 
  MapPin, 
  Calendar,
  DollarSign,
  Star,
  Zap,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Bot
} from 'lucide-react'
import { CheckInModal } from './CheckInModal'
import { getJobSourceInfo } from '@/lib/jobSourceDetector'

interface Job {
  id: string
  title: string
  company: string
  location?: string
  salary?: string
  description?: string
  requirements?: string[]
  employmentType?: string
  postedDate?: string
  source?: string
  canAutoApply?: boolean
  url?: string
  sourceInfo?: any
  automationType?: string
}

interface JobApplicationModalProps {
  job: Job | null
  isOpen: boolean
  onClose: () => void
  userResumeData?: any // The structured resume data from the user
}

export function JobApplicationModal({ 
  job, 
  isOpen, 
  onClose, 
  userResumeData 
}: JobApplicationModalProps) {
  // Check if this job has pre-generated content from notifications
  const jobNotification = (job as any)?.jobNotifications?.[0] || (job as any)?.notifications?.[0]
  
  const [coverLetter, setCoverLetter] = useState(jobNotification?.coverLetter || '')
  const [customizeResume, setCustomizeResume] = useState(true)
  const [customizedResumeUrl, setCustomizedResumeUrl] = useState(jobNotification?.customizedResume || null)
  const [customizedPreviewData, setCustomizedPreviewData] = useState<any>(null)
  const [isCustomizingPreview, setIsCustomizingPreview] = useState(false)
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false)
  
  // Update state when job data changes (when modal opens with new job)
  useEffect(() => {
    console.log('=== MODAL USEEFFECT ===')
    console.log('job:', !!job)
    console.log('isOpen:', isOpen)
    console.log('userResumeData:', !!userResumeData)
    
    if (job && isOpen && userResumeData) {
      console.log('All conditions met, processing job application modal')
      const notification = (job as any)?.jobNotifications?.[0] || (job as any)?.notifications?.[0]
      if (notification) {
        console.log('Found existing notification')
        // Don't use pre-generated cover letter - always generate fresh to avoid template issues
        setCoverLetter('')
        setCustomizedResumeUrl(notification.customizedResume || null)
        
        console.log('Generating fresh cover letter to avoid template issues')
        generateCoverLetterForJob()
      } else {
        console.log('No notification found, setting defaults')
        setCoverLetter('')
        setCustomizedResumeUrl(null)
        
        // Auto-generate cover letter if none exists
        console.log('Current coverLetter state:', coverLetter)
        if (!coverLetter || coverLetter.trim().length === 0) {
          console.log('Triggering cover letter generation')
          generateCoverLetterForJob()
        }
      }
    } else {
      console.log('Conditions not met for modal processing')
    }
  }, [job, isOpen, userResumeData])

  const generateCoverLetterForJob = async () => {
    console.log('=== GENERATE COVER LETTER CALLED ===')
    console.log('job:', job)
    console.log('userResumeData:', userResumeData)
    
    if (!job || !userResumeData) {
      console.log('ERROR: Missing job or userResumeData for cover letter generation')
      return
    }
    
    setIsGeneratingCoverLetter(true)
    try {
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          job: {
            title: job.title,
            company: job.company,
            description: job.description || ''
          },
          resumeData: userResumeData
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCoverLetter(data.coverLetter)
      }
    } catch (error) {
      console.error('Failed to generate cover letter:', error)
    } finally {
      setIsGeneratingCoverLetter(false)
    }
  }
  const [isApplying, setIsApplying] = useState(false)
  const [applicationResult, setApplicationResult] = useState<any>(null)
  const [showReview, setShowReview] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)

  // Generate actual customized resume when review modal opens
  const generateCustomizedResume = async () => {
    if (!job || !userResumeData || !customizeResume || isCustomizingPreview) return
    
    setIsCustomizingPreview(true)
    try {
      console.log('=== GENERATING CUSTOMIZED RESUME FOR REVIEW ===')
      console.log('Job:', job.title)
      console.log('User has resume data:', !!userResumeData)
      console.log('Resume data keys:', Object.keys(userResumeData || {}))
      
      // Add timeout to prevent long waits
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.log('Customization timed out after 60 seconds')
      }, 60000) // 60 second timeout (increased)
      
      const response = await fetch('/api/jobs/customize-resume-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          jobCompany: job.company,
          jobDescription: job.description,
          resumeData: userResumeData
        })
      })
      
      clearTimeout(timeoutId)
      
      console.log('Customization API response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Customization result:', result)
        console.log('Customized PDF URL:', result.customizedPdfUrl)
        
        if (result.customizedPdfUrl) {
          setCustomizedResumeUrl(result.customizedPdfUrl)
          console.log('Successfully set customized resume URL:', result.customizedPdfUrl)
          
          // Test if the URL is accessible
          try {
            const testResponse = await fetch(result.customizedPdfUrl, { method: 'HEAD' })
            if (!testResponse.ok) {
              console.error('Customized resume URL is not accessible:', testResponse.status)
            } else {
              console.log('Customized resume URL is accessible')
            }
          } catch (error) {
            console.error('Error testing customized resume URL accessibility:', error)
          }
        } else {
          console.error('No customized PDF URL in response:', result)
        }
      } else {
        const errorText = await response.text()
        console.error('Customization API failed:', response.status, errorText)
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error('Customization timed out')
        alert('Resume customization is taking too long. Using original resume instead.')
      } else {
        console.error('Preview customization failed:', error)
        alert('Failed to customize resume. Using original resume instead.')
      }
    } finally {
      setIsCustomizingPreview(false)
    }
  }

  // Trigger customization when review modal opens OR when manual apply modal opens
  useEffect(() => {
    console.log('=== CUSTOMIZATION USEEFFECT ===')
    console.log('showReview:', showReview)
    console.log('isOpen:', isOpen)
    console.log('job.canAutoApply:', job?.canAutoApply)
    console.log('customizedResumeUrl:', customizedResumeUrl)
    console.log('customizeResume:', customizeResume)
    console.log('job exists:', !!job)
    console.log('userResumeData exists:', !!userResumeData)
    
    // Trigger customization for review modal OR for manual apply jobs when modal opens
    const shouldCustomize = (showReview || (isOpen && job?.canAutoApply === false)) && 
                           customizeResume && job && userResumeData
    
    if (shouldCustomize) {
      // Always clear any existing URL to force fresh customization
      console.log('MODAL OPENED - Forcing fresh customization')
      
      if (customizedResumeUrl) {
        console.log('Clearing existing URL to force fresh generation:', customizedResumeUrl)
        setCustomizedResumeUrl(null)
      }
      
      // Small delay to ensure state is cleared
      setTimeout(() => {
        console.log('Starting fresh customization for job:', job.title)
        console.log('UserResumeData keys:', Object.keys(userResumeData || {}))
        generateCustomizedResume()
      }, 100)
    } else {
      console.log('CONDITIONS NOT MET for customization')
      if (!showReview && !(isOpen && job?.canAutoApply === false)) console.log('- Not in review mode or manual apply mode')
      if (!customizeResume) console.log('- customizeResume is false')
      if (!job) console.log('- job is null')
      if (!userResumeData) console.log('- userResumeData is null')
    }
  }, [showReview, isOpen, job?.canAutoApply]) // Depend on relevant state changes

  const handleClose = () => {
    setApplicationResult(null)
    setCoverLetter('')
    setCustomizeResume(true)
    setShowReview(false)
    onClose()
  }

  if (!isOpen || !job) return null

  // Debug job properties
  console.log('=== JOB MODAL DEBUG ===')
  console.log('job.canAutoApply:', job.canAutoApply)
  console.log('job.source:', job.source)
  console.log('job.sourceInfo:', job.sourceInfo)
  console.log('job.url:', job.url)
  
  // For auto-apply jobs with direct automation (Indeed), show enhanced manual flow
  if (job.canAutoApply === true && job.automationType === 'direct' && !showCheckInModal) {
    console.log('Indeed job - showing enhanced manual application flow')
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Indeed Quick Apply Ready</h2>
                <div className="flex items-center text-gray-600 space-x-2">
                  <span>{job.title}</span>
                  <span>•</span>
                  <span>{job.company}</span>
                  <span>•</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <span className="mr-1">🤖</span>
                    Indeed Quick Apply
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Zap className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Optimized for Indeed</h3>
                  <p className="text-blue-800 text-sm">
                    This job supports Indeed's Quick Apply. We'll prepare your materials and guide you through the streamlined application process.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Streamlined Indeed Process:</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                    <div>
                      <p className="font-medium">Get Your Application Materials</p>
                      <p className="text-sm text-gray-600">Download your customized resume and copy your tailored cover letter</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                    <div>
                      <p className="font-medium">Use Indeed's Quick Apply</p>
                      <p className="text-sm text-gray-600">Click "Easy Apply" on Indeed and upload your customized resume</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                    <div>
                      <p className="font-medium">Complete in Minutes</p>
                      <p className="text-sm text-gray-600">Indeed's Quick Apply usually takes 2-3 minutes to complete</p>
                    </div>
                  </div>
                  <button 
                    className="flex items-start space-x-3 w-full text-left hover:bg-blue-25 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => {
                      window.open(`/interview?job=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}`, '_blank')
                    }}
                  >
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">4</div>
                    <div>
                      <p className="font-medium">Practice Interview Questions</p>
                      <p className="text-sm text-gray-600">Prepare with AI-powered interview practice customized for this role</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Application Materials Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Your Application Materials
                </h4>
                <div className="space-y-3">
                  {/* Resume Section */}
                  <div className="space-y-2">
                    {isCustomizingPreview ? (
                      <div className="flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                        <span className="text-sm text-blue-700">Customizing resume for this position...</span>
                      </div>
                    ) : customizedResumeUrl ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(customizedResumeUrl, '_blank')}
                        className="w-full justify-start"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Download Customized Resume
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center p-3 bg-gray-50 border border-gray-200 rounded">
                        <span className="text-sm text-gray-500">Resume will be customized when you start the application</span>
                      </div>
                    )}
                  </div>

                  {/* Cover Letter Section */}
                  <div className="space-y-2">
                    {isGeneratingCoverLetter ? (
                      <div className="flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                        <span className="text-sm text-blue-700">Generating personalized cover letter...</span>
                      </div>
                    ) : coverLetter && coverLetter.trim() ? (
                      <div className="bg-gray-50 p-3 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Your Cover Letter:</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(coverLetter)
                              // Could add a toast notification here
                            }}
                          >
                            📋 Copy Text
                          </Button>
                        </div>
                        <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                          {coverLetter.split('\n').map((line, i) => (
                            <p key={i} className="mb-1">{line}</p>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-3 bg-gray-50 border border-gray-200 rounded">
                        <span className="text-sm text-gray-500">Cover letter will be generated when you start the application</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">Indeed Quick Apply Advantage</p>
                    <p>Your application will be processed faster and stand out with our AI-customized materials. Most Indeed Quick Apply applications take under 5 minutes!</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    // Start the application process and open Indeed
                    window.open(job.url, '_blank')
                    // Switch to check-in modal for tracking
                    setShowCheckInModal(true)
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Start Quick Apply
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // For manual apply jobs, show CheckInModal directly (skip review modal entirely)
  if (job.canAutoApply === false && !showCheckInModal) {
    return (
      <>
        <CheckInModal
          job={job}
          isOpen={true}
          onClose={handleClose}
          customizedResumeUrl={customizedResumeUrl}
          coverLetter={coverLetter}
          initialStep="instructions" // Start with instructions for direct flow
          isCustomizingResume={isCustomizingPreview}
          isGeneratingCoverLetter={isGeneratingCoverLetter}
          onApplicationUpdate={(applicationData) => {
            console.log('Application updated via CheckInModal:', applicationData)
            handleClose()
          }}
        />
      </>
    )
  }

  // Show CheckInModal independently when it's open (for other flows)
  if (showCheckInModal) {
    return (
      <>
        <CheckInModal
          job={job}
          isOpen={showCheckInModal}
          onClose={() => {
            setShowCheckInModal(false)
            handleClose()
          }}
          customizedResumeUrl={customizedResumeUrl}
          coverLetter={coverLetter}
          initialStep="check_in"
          isCustomizingResume={isCustomizingPreview}
          isGeneratingCoverLetter={isGeneratingCoverLetter}
          onApplicationUpdate={(applicationData) => {
            console.log('Application updated via CheckInModal:', applicationData)
            setShowCheckInModal(false)
            handleClose()
          }}
        />
      </>
    )
  }

  const handleApply = async () => {
    console.log('=== HANDLE APPLY CALLED ===')
    console.log('userResumeData:', userResumeData)
    console.log('job:', job)
    console.log('canAutoApply:', job?.canAutoApply)
    
    if (!userResumeData) {
      console.log('ERROR: No userResumeData, showing alert')
      alert('Please complete your resume first')
      return
    }

    // Manual apply jobs now go directly to CheckInModal, so this function shouldn't be called
    if (job?.canAutoApply === false) {
      console.warn('handleApply called for manual apply job - this should not happen')
      return
    }

    // For auto-apply jobs, use the existing logic
    const sourceInfo = job.sourceInfo || getJobSourceInfo(job.url || '')
    const isIndeedJob = sourceInfo.source === 'INDEED'
    const isExternalJob = sourceInfo.source === 'OTHER'
    setIsApplying(true)
    console.log('Setting isApplying to true, attempting application...')
    
    try {
      console.log('Making fetch request to /api/jobs/apply-automated')
      console.log('Request payload:', {
        jobId: job.id,
        resumeData: userResumeData,
        customizedResumeUrl: customizeResume ? customizedResumeUrl : null,
        coverLetter,
        useAutomation: isIndeedJob // Only use automation for Indeed jobs
      })
      
      const response = await fetch('/api/jobs/apply-automated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jobId: job.id,
          resumeData: userResumeData,
          customizedResumeUrl: customizeResume ? customizedResumeUrl : null,
          coverLetter,
          useAutomation: isIndeedJob // Only use automation for Indeed jobs
        })
      })

      console.log('Fetch completed, response status:', response.status)
      console.log('Response ok:', response.ok)

      const result = await response.json()
      console.log('Response data:', result)
      
      if (response.ok && result.success) {
        if (result.method === 'automated' && isIndeedJob) {
          // Successful automation for Indeed jobs
          console.log('✅ Automated application successful!')
          setApplicationResult({
            ...result.data,
            method: 'automated',
            platform: result.platform
          })
          
          alert(`🎉 Application submitted successfully via automation!\nConfirmation: ${result.data.confirmationId || 'N/A'}`)
          
        } else {
          // For non-Indeed jobs OR when automation fails
          console.log('📄 Materials prepared, checking job source for next action')
          
          if (isExternalJob) {
            // For external/other jobs, show CheckInModal for manual application tracking
            console.log('External job detected, showing CheckInModal')
            setCustomizedResumeUrl(result.customizedResumeUrl || customizedResumeUrl)
            setCoverLetter(result.coverLetter || coverLetter)
            setShowReview(false) // Close the main modal
            setShowCheckInModal(true)
          } else {
            // For other automation platforms (Greenhouse/Lever), show standard result
            setApplicationResult({
              method: 'redirect',
              platform: result.platform || 'external',
              message: `Your application materials are ready for ${job.company}`,
              redirectUrl: result.redirectUrl || job.url,
              resumeUrl: result.customizedResumeUrl || customizedResumeUrl,
              coverLetter: result.coverLetter || coverLetter,
              matchScore: result.matchScore,
              keywordMatches: result.keywordMatches,
              customizationNotes: result.customizationNotes,
              jobTitle: job.title,
              company: job.company
            })
          }
        }
        
      } else {
        console.log('Application failed completely')
        throw new Error(result.error || 'Application failed')
      }
      
    } catch (error) {
      console.error('Application error:', error)
      alert(`Failed to process application: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsApplying(false)
    }
  }

  if (applicationResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                <h2 className="text-2xl font-bold text-green-700">Application Submitted!</h2>
              </div>
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Application Method Indicator */}
              <div className={`p-4 rounded-lg ${
                applicationResult.method === 'automated' 
                  ? 'bg-green-50 border border-green-200' 
                  : applicationResult.method === 'redirect'
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {applicationResult.method === 'automated' ? (
                      <>
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-green-900">Automated Application</h3>
                          <p className="text-green-700 text-sm">Successfully submitted via automation</p>
                        </div>
                      </>
                    ) : applicationResult.method === 'redirect' ? (
                      <>
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-blue-900">Manual Application</h3>
                          <p className="text-blue-700 text-sm">Redirected to job board for manual completion</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                          <CheckCircle className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Application Submitted</h3>
                          <p className="text-gray-700 text-sm">Application has been processed</p>
                        </div>
                      </>
                    )}
                  </div>
                  {applicationResult.platform && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      applicationResult.platform === 'indeed'
                        ? 'bg-blue-100 text-blue-800'
                        : applicationResult.platform === 'greenhouse'
                        ? 'bg-green-100 text-green-800'
                        : applicationResult.platform === 'linkedin'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {applicationResult.platform}
                    </span>
                  )}
                </div>
                
                <div className="bg-white p-3 rounded border">
                  <p className="text-gray-800 font-medium">{applicationResult.message}</p>
                  {applicationResult.confirmationId && (
                    <p className="text-gray-600 text-sm mt-1">
                      Confirmation ID: <span className="font-mono">{applicationResult.confirmationId}</span>
                    </p>
                  )}
                  <p className="text-gray-600 text-sm mt-1">
                    Applied on {new Date(applicationResult.appliedAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
                
                {/* Redirect URL for manual applications */}
                {applicationResult.method === 'redirect' && applicationResult.redirectUrl && (
                  <div className="mt-3">
                    <Button
                      onClick={() => window.open(applicationResult.redirectUrl, '_blank')}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Continue Application on {applicationResult.platform}
                    </Button>
                  </div>
                )}
              </div>

              {applicationResult.matchScore && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-blue-900">Resume Match Score</h3>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="font-bold text-blue-700">
                        {Math.round(applicationResult.matchScore * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${applicationResult.matchScore * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {applicationResult.keywordMatches?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Keywords Matched ({applicationResult.keywordMatches.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {applicationResult.keywordMatches.slice(0, 10).map((keyword: string, index: number) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                    {applicationResult.keywordMatches.length > 10 && (
                      <span className="text-gray-500 text-xs">
                        +{applicationResult.keywordMatches.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {applicationResult.customizationNotes?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Resume Customizations</h3>
                  <ul className="space-y-1">
                    {applicationResult.customizationNotes.map((note: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <Zap className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Application Documents */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Application Documents</h3>
                <div className="flex space-x-3">
                  {applicationResult.resumeUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(applicationResult.resumeUrl, '_blank')}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Resume
                    </Button>
                  )}
                  {applicationResult.coverLetter && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Create a temporary page to display cover letter
                        const coverLetterWindow = window.open('', '_blank')
                        if (coverLetterWindow) {
                          coverLetterWindow.document.write(`
                            <html>
                              <head>
                                <title>Cover Letter</title>
                                <style>
                                  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
                                  h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
                                  .content { white-space: pre-wrap; }
                                </style>
                              </head>
                              <body>
                                <h1>Cover Letter</h1>
                                <div class="content">${applicationResult.coverLetter}</div>
                              </body>
                            </html>
                          `)
                          coverLetterWindow.document.close()
                        }
                      }}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Cover Letter
                    </Button>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handleClose} className="w-full">
                  Done
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Review Modal
  if (showReview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-5xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Review Your Application</h2>
                <p className="text-gray-600">Please review your resume and cover letter before submitting</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowReview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Resume Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Resume Preview
                  {isCustomizingPreview ? (
                    <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Customizing...
                    </span>
                  ) : customizedResumeUrl ? (
                    <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                      Customized for this job
                    </span>
                  ) : customizeResume ? (
                    <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Will be customized
                    </span>
                  ) : (
                    <span className="ml-2 text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      Using original resume
                    </span>
                  )}
                </h3>
                {isCustomizingPreview ? (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="text-center space-y-3">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-yellow-900 mb-2">Customizing Resume for This Job</h4>
                        <p className="text-yellow-700 text-sm">
                          AI is tailoring your resume to match this specific position...
                        </p>
                      </div>
                    </div>
                  </div>
                ) : customizedResumeUrl ? (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-center space-y-3">
                      <div className="flex items-center justify-center">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-900 mb-2">Resume Customized Successfully</h4>
                        <p className="text-green-700 text-sm mb-3">
                          Your resume has been tailored specifically for this position, optimizing keywords and highlighting relevant skills.
                        </p>
                        <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded mb-3">
                          ✓ Customized resume ready to view
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={async () => {
                              console.log('=== VIEW RESUME BUTTON CLICKED ===')
                              console.log('customizedResumeUrl:', customizedResumeUrl)
                              console.log('userResumeData.lastPdfUrl:', userResumeData?.lastPdfUrl)
                              
                              if (customizedResumeUrl) {
                                console.log('Opening customized resume:', customizedResumeUrl)
                                window.open(customizedResumeUrl, '_blank')
                              } else {
                                // Fallback: Generate a basic resume from the user's data
                                try {
                                  console.log('No customized URL found, generating fresh resume...')
                                  console.log('Generating fallback resume with user data:', userResumeData)
                                  
                                  // Remove any existing PDF URLs to force fresh generation
                                  const cleanResumeData = { ...userResumeData }
                                  delete cleanResumeData.lastPdfUrl
                                  
                                  const response = await fetch('/api/resume/generate-pdf', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      resumeData: cleanResumeData,
                                      forceRegenerate: true
                                    })
                                  })
                                  
                                  if (response.ok) {
                                    const result = await response.json()
                                    if (result.pdfUrl) {
                                      window.open(result.pdfUrl, '_blank')
                                    } else {
                                      alert('Unable to generate resume. Please try again.')
                                    }
                                  } else {
                                    const errorText = await response.text()
                                    console.error('Resume generation failed:', errorText)
                                    alert('Failed to generate resume. Please try again.')
                                  }
                                } catch (error) {
                                  console.error('Error generating resume:', error)
                                  alert('Error generating resume. Please try again.')
                                }
                              }
                            }}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View {customizedResumeUrl ? 'Customized' : 'Original'} Resume
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const notificationId = jobNotification?.id
                                if (!notificationId) return
                                
                                const response = await fetch('/api/regenerate-resume', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ notificationId })
                                })
                                
                                if (response.ok) {
                                  const result = await response.json()
                                  setCustomizedResumeUrl(result.customizedPdfUrl)
                                  alert('Resume regenerated and will be used for this application!')
                                } else {
                                  alert('Failed to regenerate resume')
                                }
                              } catch (error) {
                                alert('Error regenerating resume')
                              }
                            }}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Regenerate Resume
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4 max-h-96 overflow-y-auto">
                    {!userResumeData && (
                      <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                        <p className="text-yellow-800 text-sm font-medium">No resume data found. Please complete your profile first.</p>
                      </div>
                    )}
                    {/* Contact Info */}
                    <div>
                      <h4 className="font-semibold text-blue-900">Contact Information</h4>
                      <div className="text-sm space-y-1 mt-1">
                        <p>{userResumeData?.contactInfo?.fullName || 'Name not provided'}</p>
                        <p>{userResumeData?.contactInfo?.email || 'Email not provided'}</p>
                        <p>{userResumeData?.contactInfo?.phone || 'Phone not provided'}</p>
                        {userResumeData?.contactInfo?.address && <p>{userResumeData.contactInfo.address}</p>}
                        {userResumeData?.contactInfo?.linkedin && <p>{userResumeData.contactInfo.linkedin}</p>}
                      </div>
                    </div>

                    {/* Professional Summary */}
                    {userResumeData?.professionalSummary && (
                      <div>
                        <h4 className="font-semibold text-blue-900">Professional Summary</h4>
                        <p className="text-sm mt-1">{userResumeData.professionalSummary}</p>
                      </div>
                    )}

                    {/* Skills */}
                    {userResumeData?.skills?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-blue-900">Skills ({userResumeData.skills.length})</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {userResumeData.skills.slice(0, 10).map((skill: any, index: number) => (
                            <span 
                              key={index}
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                            >
                              {skill.name || skill}
                            </span>
                          ))}
                          {userResumeData.skills.length > 10 && (
                            <span className="text-xs text-gray-500">
                              +{userResumeData.skills.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Experience */}
                    {userResumeData?.experience?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-blue-900">Experience ({userResumeData.experience.length} roles)</h4>
                        <div className="space-y-2 mt-1">
                          {userResumeData.experience.slice(0, 3).map((exp: any, index: number) => (
                            <div key={index} className="text-sm">
                              <p className="font-medium">{exp.jobTitle || 'Job Title'} at {exp.company || 'Company'}</p>
                              <p className="text-gray-600 text-xs">
                                {exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}` : 'Date range not specified'}
                              </p>
                            </div>
                          ))}
                          {userResumeData.experience.length > 3 && (
                            <p className="text-xs text-gray-500">+{userResumeData.experience.length - 3} more roles</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {userResumeData?.education?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-blue-900">Education ({userResumeData.education.length})</h4>
                        <div className="space-y-1 mt-1">
                          {userResumeData.education.slice(0, 2).map((edu: any, index: number) => (
                            <div key={index} className="text-sm">
                              <p className="font-medium">{edu.degree || 'Degree'}</p>
                              <p className="text-gray-600 text-xs">{edu.institution || 'Institution'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cover Letter Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Cover Letter</h3>
                  {coverLetter.trim() && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Download as text file
                          const blob = new Blob([coverLetter], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${job.company}_${job.title}_Cover_Letter.txt`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                        }}
                      >
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Copy to clipboard
                          navigator.clipboard.writeText(coverLetter)
                          alert('Cover letter copied to clipboard!')
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  )}
                </div>
                {coverLetter.trim() ? (
                  <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {coverLetter}
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">No Cover Letter</h4>
                        <p className="text-yellow-700 text-sm mt-1">
                          You haven&apos;t written a cover letter. While optional, a good cover letter can significantly improve your chances.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t">
              <Button variant="outline" onClick={() => setShowReview(false)}>
                ← Back to Edit
              </Button>
              
              <div className="flex space-x-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel Application
                </Button>
                <Button 
                  onClick={handleApply}
                  disabled={isApplying}
                  className="min-w-[160px] bg-green-600 hover:bg-green-700"
                >
                  {isApplying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Applying...
                    </>
                  ) : (
                    <>
                      {job?.canAutoApply === false ? (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Continue to Job Site
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Application
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Apply to {job.title}</h2>
              <div className="flex items-center text-gray-600 space-x-4">
                <div className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" />
                  {job.company}
                </div>
                {job.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {job.location}
                  </div>
                )}
                {job.salary && (
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    {job.salary}
                  </div>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Details */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Job Details</h3>
              <div className="space-y-3">
                {job.description && (
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {job.description.length > 300 
                        ? `${job.description.substring(0, 300)}...`
                        : job.description
                      }
                    </p>
                  </div>
                )}
                
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">Requirements</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {job.requirements.slice(0, 5).map((req, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {req}
                        </li>
                      ))}
                      {job.requirements.length > 5 && (
                        <li className="text-gray-500 text-xs">
                          +{job.requirements.length - 5} more requirements
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {job.employmentType && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {job.employmentType}
                    </div>
                  )}
                  {job.postedDate && (
                    <div>
                      Posted {new Date(job.postedDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Application Form */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Your Application</h3>
              
              {!userResumeData ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-blue-900 mb-2">Build Your Professional Resume First</h3>
                    <p className="text-blue-800 text-sm mb-4">
                      Create a structured, professional resume that automatically customizes for each job. 
                      No more corrupted PDFs or formatting issues!
                    </p>
                    
                    <div className="space-y-2 mb-4 text-sm text-blue-700">
                      <div className="flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Clean, professional formatting
                      </div>
                      <div className="flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        AI-powered job customization
                      </div>
                      <div className="flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ATS-friendly format
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => window.open('/resume-builder', '_blank')}
                      className="mb-2"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Build Resume Now
                    </Button>
                    <p className="text-xs text-blue-600">
                      Takes 10-15 minutes • Opens in new tab
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Resume Customization Option */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="customize-resume"
                        checked={customizeResume}
                        onChange={(e) => setCustomizeResume(e.target.checked)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <label htmlFor="customize-resume" className="font-medium text-blue-900 cursor-pointer">
                          Customize resume for this job
                        </label>
                        <p className="text-blue-700 text-sm mt-1">
                          AI will optimize your resume by reordering skills, enhancing keywords, and improving match score for this specific position.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cover Letter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Cover Letter (Optional)
                    </label>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Dear Hiring Manager,&#10;&#10;I am excited to apply for the position of..."
                    />
                  </div>

                  {/* Application Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Application Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Resume:</span>
                        <span className="font-medium">
                          {customizeResume ? 'Customized for this job' : 'Standard version'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Cover Letter:</span>
                        <span className={coverLetter.trim() ? 'font-medium text-green-600' : 'text-gray-500'}>
                          {coverLetter.trim() ? 'Included' : 'Not included'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Skills in Resume:</span>
                        <span className="font-medium">
                          {userResumeData.skills?.length || 0} skills
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Apply vs Review Options */}
                  <div className="space-y-3">
                    <Button 
                      onClick={handleApply}
                      disabled={isApplying}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isApplying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Applying...
                        </>
                      ) : (
                        <>
                          {job?.canAutoApply === false ? (
                            <>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Apply on Company Site
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Quick Apply (Recommended)
                            </>
                          )}
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => setShowReview(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Review Before Applying
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

    </div>
  )
}