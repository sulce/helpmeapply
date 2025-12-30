'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  X, 
  ExternalLink,
  FileDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Building,
  Calendar,
  Mail
} from 'lucide-react'

interface Job {
  id: string
  title: string
  company: string
  url?: string
  source?: string
  sourceInfo?: any
}

interface CheckInModalProps {
  job: Job | null
  isOpen: boolean
  onClose: () => void
  customizedResumeUrl?: string | null
  coverLetter?: string
  onApplicationUpdate: (applicationData: any) => void
  initialStep?: 'instructions' | 'check_in' | 'complete'
  isCustomizingResume?: boolean
  isGeneratingCoverLetter?: boolean
}

interface ApplicationUpdate {
  status: 'applied' | 'need_followup' | 'not_applied'
  applicationDate?: string
  notes?: string
  referenceNumber?: string
}

export function CheckInModal({ 
  job, 
  isOpen, 
  onClose,
  customizedResumeUrl,
  coverLetter,
  onApplicationUpdate,
  initialStep = 'instructions',
  isCustomizingResume = false,
  isGeneratingCoverLetter = false
}: CheckInModalProps) {
  const [step, setStep] = useState<'instructions' | 'check_in' | 'complete'>(initialStep)
  const [applicationData, setApplicationData] = useState<ApplicationUpdate>({
    status: 'applied',
    applicationDate: new Date().toISOString().split('T')[0],
    notes: '',
    referenceNumber: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  console.log('=== CHECK-IN MODAL RENDER ===')
  console.log('isOpen:', isOpen)
  console.log('job:', job?.title)
  console.log('step:', step)

  if (!isOpen || !job) return null

  const handleClose = () => {
    setStep('instructions')
    setApplicationData({
      status: 'applied',
      applicationDate: new Date().toISOString().split('T')[0],
      notes: '',
      referenceNumber: ''
    })
    onClose()
  }

  const handleApplicationSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Submit application status update
      const response = await fetch('/api/applications/manual-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          ...applicationData
        })
      })

      if (response.ok) {
        onApplicationUpdate(applicationData)
        setStep('complete')
      } else {
        throw new Error('Failed to update application status')
      }
    } catch (error) {
      console.error('Error updating application:', error)
      alert('Failed to update application status. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 'instructions') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Manual Application Required</h2>
                <div className="flex items-center text-gray-600 space-x-2">
                  <span>{job.title}</span>
                  <span>•</span>
                  <span>{job.company}</span>
                  <span>•</span>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <span className="mr-1">📝</span>
                    External Application
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Application Process</h3>
                  <p className="text-blue-800 text-sm">
                    This job requires manual application on an external website. We&apos;ve prepared your materials and will guide you through the process.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Step-by-Step Process:</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                    <div>
                      <p className="font-medium">Download Your Customized Materials</p>
                      <p className="text-sm text-gray-600">Get your tailored resume and cover letter for this specific role</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                    <div>
                      <p className="font-medium">Apply on Company Website</p>
                      <p className="text-sm text-gray-600">We'll redirect you to the job posting to complete your application</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                    <div>
                      <p className="font-medium">Track Your Application</p>
                      <p className="text-sm text-gray-600">Come back and let us know the status of your application</p>
                    </div>
                  </div>
                  <button 
                    className="flex items-start space-x-3 w-full text-left hover:bg-blue-25 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => {
                      // Open interview practice page in new tab
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

              {/* Download Materials Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center">
                  <FileDown className="h-4 w-4 mr-2" />
                  Your Customized Materials
                </h4>
                <div className="space-y-3">
                  {/* Resume Section */}
                  <div className="space-y-2">
                    {isCustomizingResume ? (
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
                        <FileDown className="h-4 w-4 mr-2" />
                        Download Customized Resume
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center p-3 bg-gray-50 border border-gray-200 rounded">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm text-gray-500">Resume customization will begin shortly...</span>
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
                              const blob = new Blob([coverLetter], { type: 'text/plain' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `${job?.company}_${job?.title}_Cover_Letter.txt`
                              document.body.appendChild(a)
                              a.click()
                              document.body.removeChild(a)
                              URL.revokeObjectURL(url)
                            }}
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            Download
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
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm text-gray-500">Cover letter generation will begin shortly...</span>
                      </div>
                    )}
                  </div>

                  {/* Status Summary */}
                  {(isCustomizingResume || isGeneratingCoverLetter) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">Preparing your materials...</p>
                          <p>This may take a few moments while we customize your resume and generate a personalized cover letter for this specific role.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    // Open job URL in new tab
                    if (job.url) window.open(job.url, '_blank')
                    // Move to check-in step
                    setStep('check_in')
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Continue to Application
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (step === 'check_in') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-lg w-full">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Application Check-In</h2>
                <p className="text-gray-600 text-sm">How did your application go?</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">Application Status</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="applied"
                      checked={applicationData.status === 'applied'}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Successfully Applied</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="need_followup"
                      checked={applicationData.status === 'need_followup'}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                      <span>Need to Follow Up Later</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="not_applied"
                      checked={applicationData.status === 'not_applied'}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="flex items-center">
                      <X className="h-4 w-4 text-red-600 mr-2" />
                      <span>Did Not Apply</span>
                    </div>
                  </label>
                </div>
              </div>

              {applicationData.status === 'applied' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Application Date
                    </label>
                    <input
                      type="date"
                      value={applicationData.applicationDate}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, applicationDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Reference Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Application confirmation number..."
                      value={applicationData.referenceNumber}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Any additional notes about the application process..."
                  value={applicationData.notes}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('instructions')} 
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleApplicationSubmit}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Saving...' : 'Update Status'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-700 mb-2">Status Updated!</h2>
            <p className="text-gray-600 mb-6">
              Your application status has been recorded. We'll help you track the progress and follow up as needed.
            </p>
            
            {applicationData.status === 'applied' && (
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <p className="text-green-800 text-sm">
                  Great job! Your application for <strong>{job.title}</strong> at <strong>{job.company}</strong> has been submitted and tracked.
                </p>
              </div>
            )}
            
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return null
}