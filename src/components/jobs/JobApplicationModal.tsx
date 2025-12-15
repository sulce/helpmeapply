'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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
  AlertCircle
} from 'lucide-react'

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
    }
  }
  const [isApplying, setIsApplying] = useState(false)
  const [applicationResult, setApplicationResult] = useState<any>(null)
  const [showReview, setShowReview] = useState(false)

  // Generate actual customized resume when review modal opens
  const generateCustomizedResume = async () => {
    if (!job || !userResumeData || !customizeResume || isCustomizingPreview || customizedResumeUrl) return
    
    setIsCustomizingPreview(true)
    try {
      console.log('=== GENERATING CUSTOMIZED RESUME FOR REVIEW ===')
      console.log('Job:', job.title)
      console.log('User has resume data:', !!userResumeData)
      console.log('Resume data keys:', Object.keys(userResumeData || {}))
      
      const response = await fetch('/api/jobs/customize-resume-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          jobCompany: job.company,
          jobDescription: job.description,
          resumeData: userResumeData
        })
      })
      
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
    } catch (error) {
      console.error('Preview customization failed:', error)
    } finally {
      setIsCustomizingPreview(false)
    }
  }

  // Trigger customization when review modal opens
  useEffect(() => {
    console.log('=== REVIEW MODAL USEEFFECT ===')
    console.log('showReview:', showReview)
    console.log('customizedResumeUrl:', customizedResumeUrl)
    console.log('customizeResume:', customizeResume)
    console.log('job exists:', !!job)
    console.log('userResumeData exists:', !!userResumeData)
    
    if (showReview && customizeResume && job && userResumeData) {
      // Check if the existing URL is just the uploaded PDF (contains timestamp pattern)
      const isUploadedPdf = customizedResumeUrl && /\d{13}-/.test(customizedResumeUrl)
      
      if (!customizedResumeUrl || isUploadedPdf) {
        console.log('GENERATING CUSTOMIZATION - Reason:', !customizedResumeUrl ? 'No URL' : 'Uploaded PDF detected')
        
        // Clear the uploaded PDF URL if it exists
        if (isUploadedPdf) {
          console.log('Clearing uploaded PDF URL:', customizedResumeUrl)
          setCustomizedResumeUrl(null)
        }
        
        console.log('Job:', job.title)
        console.log('UserResumeData keys:', Object.keys(userResumeData || {}))
        generateCustomizedResume()
      } else {
        console.log('Using existing customized resume:', customizedResumeUrl)
      }
    } else {
      console.log('CONDITIONS NOT MET for customization')
      if (!showReview) console.log('- showReview is false')
      if (!customizeResume) console.log('- customizeResume is false')
      if (!job) console.log('- job is null')
      if (!userResumeData) console.log('- userResumeData is null')
    }
  }, [showReview, customizeResume, job, userResumeData])

  if (!isOpen || !job) return null

  const handleApply = async () => {
    console.log('=== HANDLE APPLY CALLED ===')
    console.log('userResumeData:', userResumeData)
    console.log('job:', job)
    console.log('coverLetter:', coverLetter)
    console.log('customizeResume:', customizeResume)
    
    if (!userResumeData) {
      console.log('ERROR: No userResumeData, showing alert')
      alert('Please complete your resume first')
      return
    }

    setIsApplying(true)
    console.log('Setting isApplying to true, starting fetch...')
    
    try {
      console.log('Making fetch request to /api/jobs/apply-with-resume')
      console.log('Request payload:', {
        jobId: job.id,
        resumeData: userResumeData,
        coverLetter,
        customizeResume
      })
      
      const response = await fetch('/api/jobs/apply-with-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jobId: job.id,
          resumeData: userResumeData,
          coverLetter,
          customizeResume
        })
      })

      console.log('Fetch completed, response status:', response.status)
      console.log('Response ok:', response.ok)

      const result = await response.json()
      console.log('Response data:', result)
      
      if (response.ok) {
        console.log('Application successful, setting result')
        setApplicationResult(result.data)
      } else {
        console.log('Application failed, throwing error')
        throw new Error(result.error || 'Application failed')
      }
    } catch (error) {
      console.error('Application error:', error)
      alert('Failed to submit application')
    } finally {
      setIsApplying(false)
    }
  }

  const handleClose = () => {
    setApplicationResult(null)
    setCoverLetter('')
    setCustomizeResume(true)
    setShowReview(false)
    onClose()
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
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800 font-medium">{applicationResult.message}</p>
                <p className="text-green-700 text-sm mt-1">
                  Applied on {new Date(applicationResult.appliedAt).toLocaleDateString()}
                </p>
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
                <h3 className="text-lg font-semibold mb-3">Cover Letter</h3>
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
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit Application
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
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Quick Apply (Recommended)
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