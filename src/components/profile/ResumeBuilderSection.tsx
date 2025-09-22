'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  FileText, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Edit,
  Download,
  RefreshCw
} from 'lucide-react'

interface ResumeStatus {
  hasResume: boolean
  completionPercentage: number
  lastUpdated?: string
  sections: {
    contactInfo: boolean
    summary: boolean
    experience: boolean
    education: boolean
    skills: boolean
  }
  generatedPdfUrl?: string
}

export function ResumeBuilderSection() {
  const [resumeStatus, setResumeStatus] = useState<ResumeStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  useEffect(() => {
    checkResumeStatus()
  }, [])

  const checkResumeStatus = async () => {
    try {
      const response = await fetch('/api/resume/status')
      if (response.ok) {
        const data = await response.json()
        setResumeStatus(data.status)
      } else {
        // No resume exists yet
        setResumeStatus({
          hasResume: false,
          completionPercentage: 0,
          sections: {
            contactInfo: false,
            summary: false,
            experience: false,
            education: false,
            skills: false
          }
        })
      }
    } catch (error) {
      console.error('Error checking resume status:', error)
      setResumeStatus({
        hasResume: false,
        completionPercentage: 0,
        sections: {
          contactInfo: false,
          summary: false,
          experience: false,
          education: false,
          skills: false
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generatePdf = async () => {
    setIsGeneratingPdf(true)
    try {
      // First, fetch the structured resume data
      const resumeResponse = await fetch('/api/resume/structured')
      if (!resumeResponse.ok) {
        alert('No resume data found. Please complete your resume first.')
        return
      }

      const { resumeData } = await resumeResponse.json()
      
      // Transform the data structure for PDF generator
      const pdfResumeData = {
        contactInfo: resumeData.contactInfo,
        professionalSummary: resumeData.summary, // Convert summary to professionalSummary
        experience: resumeData.experience,
        education: resumeData.education,
        skills: resumeData.skills,
        certifications: resumeData.certifications,
        projects: resumeData.projects,
        languages: resumeData.languages
      }
      
      // Then generate the PDF with the actual resume data
      const response = await fetch('/api/resume/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resumeData: pdfResumeData,
          userId: 'current-user' // This will be validated on the server side
        })
      })

      if (response.ok) {
        const data = await response.json()
        setResumeStatus(prev => prev ? {
          ...prev,
          generatedPdfUrl: data.pdfUrl
        } : null)
        alert('PDF generated successfully!')
      } else {
        const errorData = await response.json()
        console.error('PDF Generation Error:', errorData)
        console.error('Resume data sent:', pdfResumeData)
        alert(`Failed to generate PDF: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!resumeStatus) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Resume Builder
        </h2>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Unable to check resume status</p>
          <Button onClick={checkResumeStatus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Professional Resume
        </h2>
        
        {resumeStatus.hasResume && (
          <div className="flex items-center text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            {resumeStatus.completionPercentage}% Complete
          </div>
        )}
      </div>

      {!resumeStatus.hasResume ? (
        // No resume created yet
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Create Your Professional Resume</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Build a structured, professional resume that automatically customizes for each job application. 
            No more corrupted PDFs or formatting issues.
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Clean, professional formatting
            </div>
            <div className="flex items-center justify-center text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              AI-powered job customization
            </div>
            <div className="flex items-center justify-center text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              ATS-friendly format
            </div>
          </div>

          <Button 
            onClick={() => window.open('/resume-builder', '_blank')}
            size="lg"
            className="mb-4"
          >
            <Plus className="h-5 w-5 mr-2" />
            Start Building Resume
          </Button>

          <p className="text-xs text-gray-500">
            Opens in new tab • Takes 10-15 minutes to complete
          </p>
        </div>
      ) : (
        // Resume exists - show status and actions
        <div className="space-y-6">
          {/* Completion Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Resume Completion</span>
              <span className="text-sm text-gray-600">{resumeStatus.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${resumeStatus.completionPercentage}%` }}
              />
            </div>
            {resumeStatus.lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated {new Date(resumeStatus.lastUpdated).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Section Status */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Section Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(resumeStatus.sections).map(([section, completed]) => (
                <div key={section} className="flex items-center text-sm">
                  {completed ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                  )}
                  <span className={completed ? 'text-gray-700' : 'text-gray-500'}>
                    {section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => window.open('/resume-builder', '_blank')}
              variant="outline"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Resume
            </Button>

            <Button 
              onClick={generatePdf}
              disabled={isGeneratingPdf || resumeStatus.completionPercentage < 50}
              variant="outline"
            >
              {isGeneratingPdf ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Generate PDF
            </Button>

            {resumeStatus.generatedPdfUrl && (
              <Button 
                onClick={() => window.open(resumeStatus.generatedPdfUrl, '_blank')}
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Latest PDF
              </Button>
            )}

            <Button 
              onClick={checkResumeStatus}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>

          {/* Tips for incomplete resume */}
          {resumeStatus.completionPercentage < 100 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Complete Your Resume</h4>
                  <p className="text-blue-800 text-sm mb-2">
                    A complete resume gets better job matches and higher response rates.
                  </p>
                  <ul className="text-blue-700 text-sm space-y-1">
                    {!resumeStatus.sections.contactInfo && <li>• Add contact information</li>}
                    {!resumeStatus.sections.summary && <li>• Write professional summary</li>}
                    {!resumeStatus.sections.experience && <li>• Add work experience</li>}
                    {!resumeStatus.sections.education && <li>• Include education details</li>}
                    {!resumeStatus.sections.skills && <li>• List your skills</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}