'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Zap,
  Brain,
  Download,
  Eye,
  ArrowRight,
  Sparkles,
  Clock,
  Users,
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

interface SmartResumeImportProps {
  onImportComplete: (data: ParsedResumeData) => void
  onStartResumeBuilder: () => void
  className?: string
}

export function SmartResumeImport({ 
  onImportComplete, 
  onStartResumeBuilder,
  className = '' 
}: SmartResumeImportProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      // Upload file first
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

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
        throw new Error(errorData.error || 'Parsing failed')
      }

      const parseResult = await parseResponse.json()
      setImportResult(parseResult.data.parseResult)
      setParsedData(parseResult.data.resumeData)
      
      // Notify parent component
      onImportComplete(parseResult.data.resumeData)

    } catch (error) {
      console.error('Resume import error:', error)
      setError(error instanceof Error ? error.message : 'Import failed')
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
      <Card className={`p-6 ${className}`}>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-700 mb-2">Resume Imported Successfully!</h3>
          <p className="text-gray-600">Your resume has been parsed and your Resume Builder is now pre-populated</p>
        </div>

        {/* Confidence Score */}
        <div className={`p-4 rounded-lg border mb-6 ${getConfidenceColor(importResult.confidence)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Parsing Quality</span>
            <span className="font-bold">{Math.round(importResult.confidence * 100)}%</span>
          </div>
          <div className="w-full bg-white bg-opacity-50 rounded-full h-2 mb-2">
            <div 
              className="bg-current h-2 rounded-full transition-all duration-500"
              style={{ width: `${importResult.confidence * 100}%` }}
            />
          </div>
          <p className="text-sm">{getConfidenceText(importResult.confidence)}</p>
        </div>

        {/* Extracted Sections Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="font-semibold text-lg">{importResult.extractedSections.experience}</div>
            <div className="text-sm text-gray-600">Work Experiences</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">{importResult.extractedSections.education}</div>
            <div className="text-sm text-gray-600">Education</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">{importResult.extractedSections.skills}</div>
            <div className="text-sm text-gray-600">Skills</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">{importResult.extractedSections.certifications + importResult.extractedSections.projects}</div>
            <div className="text-sm text-gray-600">Certs & Projects</div>
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={onStartResumeBuilder}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Review & Edit in Resume Builder
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            Import Another Resume
          </Button>
        </div>
      </Card>
    )
  }

  // Show upload interface
  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <Brain className="h-12 w-12 text-blue-600" />
            <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-1 -right-1" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Smart Resume Import</h3>
        <p className="text-gray-600">Upload your existing resume and let AI automatically populate your Resume Builder</p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <h4 className="font-semibold text-purple-900 mb-1">Easy to Review</h4>
          <p className="text-sm text-purple-700">Edit and refine after import</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 mb-1">Import Failed</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          {isUploading || isParsing ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  {isUploading ? 'Uploading your resume...' : 'Parsing with AI...'}
                </h4>
                <p className="text-sm text-gray-600">
                  {isUploading 
                    ? 'Securely uploading your file' 
                    : 'AI is extracting and structuring your resume data'
                  }
                </p>
                <div className="flex items-center justify-center mt-4 space-x-2 text-sm text-blue-600">
                  <Zap className="h-4 w-4" />
                  <span>{isParsing ? 'AI Processing in progress...' : 'Please wait...'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Resume</h4>
              <p className="text-gray-600 mb-4">
                Drop your resume here or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
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
                id="resume-upload"
                disabled={isUploading || isParsing}
              />
              
              <label htmlFor="resume-upload" className="cursor-pointer">
                <Button 
                  type="button"
                  className="cursor-pointer"
                  disabled={isUploading || isParsing}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Choose Resume File
                </Button>
              </label>
            </div>
          )}
        </div>

        {/* Or divider */}
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Manual option */}
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h4 className="font-semibold text-gray-900 mb-2">Start from Scratch</h4>
          <p className="text-gray-600 text-sm mb-4">
            Build your resume manually using our guided Resume Builder
          </p>
          <Button 
            variant="outline" 
            onClick={onStartResumeBuilder}
            className="w-full sm:w-auto"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Open Resume Builder
          </Button>
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
    </Card>
  )
}