'use client'

import { useState } from 'react'
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
  const [coverLetter, setCoverLetter] = useState('')
  const [customizeResume, setCustomizeResume] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [applicationResult, setApplicationResult] = useState<any>(null)

  if (!isOpen || !job) return null

  const handleApply = async () => {
    if (!userResumeData) {
      alert('Please complete your resume first')
      return
    }

    setIsApplying(true)
    try {
      const response = await fetch('/api/jobs/apply-with-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          resumeData: userResumeData,
          coverLetter,
          customizeResume
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setApplicationResult(result.data)
      } else {
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

                  {/* Submit Button */}
                  <Button 
                    onClick={handleApply}
                    disabled={isApplying}
                    className="w-full"
                  >
                    {isApplying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {customizeResume ? 'Customizing & Submitting...' : 'Submitting Application...'}
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Submit Application
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}