'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  X, 
  FileText, 
  MessageSquare, 
  Download,
  ExternalLink,
  Eye,
  Loader2
} from 'lucide-react'

interface CustomizedResumeInfo {
  id: string
  customizedResumeUrl?: string
  matchScore?: number
  createdAt: string
}

interface Application {
  id: string
  jobTitle: string
  company: string
  coverLetter?: string
  customizedResumeUrl?: string
  resumeCustomizationData?: string
  customizedResumes?: CustomizedResumeInfo[]
}

interface CustomizedResume {
  id: string
  jobTitle: string
  company: string
  customizedContent: string
  customizationNotes: string[]
  suggestedImprovements: string[]
  keywordMatches: any[]
  matchScore?: number
  originalResumeUrl?: string
  customizedResumeUrl?: string
  createdAt: string
  updatedAt: string
}

interface ApplicationMaterialsModalProps {
  application: Application | null
  isOpen: boolean
  onClose: () => void
}

export function ApplicationMaterialsModal({ 
  application, 
  isOpen, 
  onClose 
}: ApplicationMaterialsModalProps) {
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume')
  const [customizedResume, setCustomizedResume] = useState<CustomizedResume | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && application && activeTab === 'resume' && hasResumeData()) {
      fetchCustomizedResume()
    }
  }, [isOpen, application, activeTab])

  const hasResumeData = () => {
    return (application?.customizedResumes && application.customizedResumes.length > 0) || application?.resumeCustomizationData
  }

  const fetchCustomizedResume = async () => {
    if (!application) return
    
    const customizedResumeInfo = application.customizedResumes?.[0]
    if (!customizedResumeInfo) {
      setError('No customized resume found')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/resume/customized/${customizedResumeInfo.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch customized resume')
      }

      const data = await response.json()
      setCustomizedResume(data.resume)
    } catch (err) {
      console.error('Error fetching customized resume:', err)
      setError(err instanceof Error ? err.message : 'Failed to load resume')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadResume = () => {
    if (customizedResume?.customizedResumeUrl) {
      window.open(customizedResume.customizedResumeUrl, '_blank')
    }
  }

  const downloadCoverLetter = () => {
    if (application?.coverLetter) {
      const blob = new Blob([application.coverLetter], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${application.company}_${application.jobTitle}_Cover_Letter.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (!isOpen || !application) return null

  const hasResume = hasResumeData()
  const hasCoverLetter = application.coverLetter

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Application Materials</h2>
              <p className="text-sm text-gray-600">
                {application.jobTitle} at {application.company}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b">
            {hasResume && (
              <button
                onClick={() => setActiveTab('resume')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'resume'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Customized Resume
              </button>
            )}
            {hasCoverLetter && (
              <button
                onClick={() => setActiveTab('cover-letter')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'cover-letter'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Cover Letter
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'resume' && hasResume && (
              <div className="space-y-6">
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading customized resume...</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {customizedResume && (
                  <div className="space-y-6">
                    {/* Resume Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {customizedResume.matchScore && (
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {Math.round(customizedResume.matchScore * 100)}% Job Match
                          </div>
                        )}
                        <span className="text-sm text-gray-500">
                          Created {new Date(customizedResume.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {customizedResume.originalResumeUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(customizedResume.originalResumeUrl, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Original Resume
                          </Button>
                        )}
                        {customizedResume.customizedResumeUrl && (
                          <Button
                            size="sm"
                            onClick={downloadResume}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Customization Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {customizedResume.customizationNotes.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="font-semibold text-blue-900 mb-3">Customizations Made</h3>
                          <ul className="space-y-2">
                            {customizedResume.customizationNotes.map((note, index) => (
                              <li key={index} className="text-blue-800 text-sm flex items-start">
                                <span className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {customizedResume.keywordMatches.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h3 className="font-semibold text-green-900 mb-3">Keywords Matched</h3>
                          <div className="flex flex-wrap gap-2">
                            {customizedResume.keywordMatches.slice(0, 10).map((match, index) => (
                              <span key={index} className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">
                                {typeof match === 'string' ? match : match.keyword || match}
                              </span>
                            ))}
                            {customizedResume.keywordMatches.length > 10 && (
                              <span className="text-green-700 text-xs">
                                +{customizedResume.keywordMatches.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resume Content */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Resume Content</h3>
                      <div className="bg-white p-4 rounded border text-sm whitespace-pre-wrap font-mono leading-relaxed">
                        {customizedResume.customizedContent}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'cover-letter' && hasCoverLetter && (
              <div className="space-y-6">
                {/* Cover Letter Actions */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Cover Letter Used</h3>
                  <Button size="sm" onClick={downloadCoverLetter}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>

                {/* Cover Letter Content */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="bg-white p-6 rounded border text-sm whitespace-pre-wrap leading-relaxed">
                    {application.coverLetter}
                  </div>
                </div>
              </div>
            )}

            {/* No materials available */}
            {!hasResume && !hasCoverLetter && (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Available</h3>
                <p className="text-gray-600">
                  No customized resume or cover letter was used for this application.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}