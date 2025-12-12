'use client'

import { useState, useId } from 'react'
import { Button } from '@/components/ui/Button'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Zap,
  Brain,
  Sparkles,
  Clock,
  Target
} from 'lucide-react'

interface ImportResult {
  confidence: number
  warnings: string[]
  extractedSections: {
    contactInfo: boolean
    experience: number
    education: number
    skills: number
    certifications: number
    projects: number
    summary: boolean
  }
}

interface ParsedResumeData {
  contactInfo: {
    fullName: string
    email: string
    phone: string
    address: string
    linkedin?: string
    website?: string
  }
  professionalSummary: string
  experience: any[]
  education: any[]
  skills: any[]
  certifications: string[]
  projects: string[]
  languages: string[]
}

interface ResumeUploadOnlyProps {
  onImportComplete: (data: ParsedResumeData) => void
  onError?: (error: string) => void
  className?: string
}

export function ResumeUploadOnly({ 
  onImportComplete, 
  onError,
  className = '' 
}: ResumeUploadOnlyProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Generate unique ID to avoid conflicts with other upload components
  const uploadId = useId()

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      // Upload file first
      const formData = new FormData()
      formData.append('file', file)
      
      // Add timeout to catch hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 30000)
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const uploadResult = await uploadResponse.json()
      setUploadedFile(uploadResult.fileUrl)

      // Start parsing
      setIsParsing(true)
      const parseResponse = await fetch('/api/resume/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeUrl: uploadResult.fileUrl })
      })

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json()
        
        // Handle specific error cases
        if (errorData.code === 'SERVICE_UNAVAILABLE') {
          throw new Error('Resume parsing is temporarily unavailable. Please try again later or contact support.')
        }
        
        throw new Error(errorData.error || 'Parsing failed')
      }

      const parseResult = await parseResponse.json()
      
      // Handle both normal AI parsing and manual entry fallback
      setImportResult(parseResult.data.parseResult)
      setParsedData(parseResult.data.resumeData)
      
      // Notify parent component
      onImportComplete(parseResult.data.resumeData)

    } catch (error) {
      console.error('Resume import error:', error)
      
      let errorMessage = 'Import failed'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Upload timed out. Please check your internet connection and try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
      if (onError) onError(errorMessage)
    } finally {
      setIsUploading(false)
      setIsParsing(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'Excellent parsing quality'
    if (confidence >= 0.6) return 'Good parsing quality'
    return 'Needs review'
  }

  // Show success result
  if (importResult && parsedData) {
    return (
      <div className={`${className}`}>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-green-700 mb-2">Resume Uploaded Successfully!</h3>
          <p className="text-gray-600 text-lg">Your resume has been parsed and your profile is now complete</p>
        </div>

        {/* Confidence Score */}
        <div className={`p-6 rounded-lg border mb-6 ${getConfidenceColor(importResult.confidence)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-lg">Parsing Quality</span>
            <span className="font-bold text-xl">{Math.round(importResult.confidence * 100)}%</span>
          </div>
          <div className="w-full bg-white bg-opacity-50 rounded-full h-3 mb-2">
            <div 
              className="bg-current h-3 rounded-full transition-all duration-500"
              style={{ width: `${importResult.confidence * 100}%` }}
            />
          </div>
          <p className="text-sm font-medium">{getConfidenceText(importResult.confidence)}</p>
        </div>

        {/* Extracted Sections Summary */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-4 text-center">Information Extracted</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="font-bold text-2xl text-blue-600">{importResult.extractedSections.experience}</div>
              <div className="text-sm text-gray-600">Work Experiences</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-purple-600">{importResult.extractedSections.education}</div>
              <div className="text-sm text-gray-600">Education</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-green-600">{importResult.extractedSections.skills}</div>
              <div className="text-sm text-gray-600">Skills</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-orange-600">{importResult.extractedSections.certifications + importResult.extractedSections.projects}</div>
              <div className="text-sm text-gray-600">Certs & Projects</div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {importResult.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">Please Review</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {importResult.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-center">
            <h4 className="font-semibold text-green-800 mb-2">What happens next?</h4>
            <p className="text-green-700 mb-4">
              Your profile has been automatically populated with all the information from your resume. 
              You can now start using AI to find and apply to jobs!
            </p>
            <div className="text-sm text-green-600">
              Redirecting to dashboard in a moment...
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show upload interface
  return (
    <div className={`${className}`}>
      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <h4 className="font-semibold text-blue-900 mb-1">Save Time</h4>
          <p className="text-sm text-blue-700">2 minutes vs 30+ minutes of manual entry</p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <h4 className="font-semibold text-green-900 mb-1">High Accuracy</h4>
          <p className="text-sm text-green-700">AI extracts data with 90%+ accuracy</p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <h4 className="font-semibold text-purple-900 mb-1">AI Powered</h4>
          <p className="text-sm text-purple-700">Smart parsing for all resume formats</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 mb-1">Upload Failed</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors bg-gray-50">
          {isUploading || isParsing ? (
            <div className="space-y-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                <Brain className="h-8 w-8 text-blue-600 absolute top-4 left-1/2 transform -translate-x-1/2" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-xl">
                  {isUploading ? 'Uploading your resume...' : 'AI is parsing your resume...'}
                </h4>
                <p className="text-gray-600 mb-4">
                  {isUploading 
                    ? 'Securely uploading your file to our servers' 
                    : 'Extracting and structuring your professional information'
                  }
                </p>
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <Zap className="h-5 w-5" />
                  <span className="font-medium">{isParsing ? 'AI Processing in progress...' : 'Please wait...'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h4 className="text-xl font-semibold text-gray-900 mb-3">Upload Your Resume</h4>
              <p className="text-gray-600 mb-6">
                Drop your resume here or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Supports PDF, DOC, and DOCX files (max 10MB)
              </p>
              
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      setError('File size must be less than 10MB')
                      return
                    }
                    handleFileUpload(file)
                  }
                }}
                className="hidden"
                id={uploadId}
                disabled={isUploading || isParsing}
              />
              
              <Button 
                type="button"
                size="lg"
                className="cursor-pointer px-8 py-3"
                disabled={isUploading || isParsing}
                onClick={() => {
                  const input = document.getElementById(uploadId) as HTMLInputElement
                  if (input) {
                    input.click()
                  }
                }}
              >
                <FileText className="h-5 w-5 mr-2" />
                Choose Resume File
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Supported Formats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-center text-sm text-gray-500">
          <span>Supported formats:</span>
          <div className="flex items-center space-x-4 ml-3">
            <span className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </span>
            <span className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              DOC
            </span>
            <span className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              DOCX
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}