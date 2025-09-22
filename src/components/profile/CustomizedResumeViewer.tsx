'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  FileText, 
  Download, 
  Eye, 
  EyeOff, 
  Star,
  Lightbulb,
  Target,
  ChevronDown
} from 'lucide-react'

interface CustomizedResume {
  id?: string
  jobTitle: string
  company: string
  customizedContent: string
  customizationNotes: string[]
  keywordMatches: string[]
  suggestedImprovements: string[]
  matchScore?: number
  originalResumeUrl: string
  customizedResumeUrl?: string
  customizedPdfUrl?: string
  extractedSections?: Array<{ title: string; content: string }>
  originalText?: string
  createdAt?: string
}

interface CustomizedResumeViewerProps {
  customizedResume: CustomizedResume
  onDownload?: () => void
  onRegenerateResume?: () => void
  showComparison?: boolean
  compact?: boolean
}

export function CustomizedResumeViewer({ 
  customizedResume, 
  onDownload,
  onRegenerateResume,
  showComparison = false,
  compact = false
}: CustomizedResumeViewerProps) {
  const [showDetails, setShowDetails] = useState(!compact)
  const [activeTab, setActiveTab] = useState<'customized' | 'original' | 'comparison'>('customized')

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Customized Resume
            </h3>
            <p className="text-sm text-gray-600">
              {customizedResume.jobTitle} at {customizedResume.company}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {customizedResume.matchScore && (
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className={`text-sm font-medium ${getMatchScoreColor(customizedResume.matchScore)}`}>
                {Math.round(customizedResume.matchScore * 100)}% Match
              </span>
            </div>
          )}
          
          {compact && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Details
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Details
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Keywords Matched</span>
          </div>
          <p className="text-lg font-semibold text-blue-600">
            {customizedResume.keywordMatches.length}
          </p>
        </div>

        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <FileText className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Customizations</span>
          </div>
          <p className="text-lg font-semibold text-green-600">
            {customizedResume.customizationNotes.length}
          </p>
        </div>

        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-900">Improvements</span>
          </div>
          <p className="text-lg font-semibold text-yellow-600">
            {customizedResume.suggestedImprovements.length}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {customizedResume.customizedPdfUrl && (
          <Button 
            onClick={() => window.open(customizedResume.customizedPdfUrl, '_blank')} 
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        )}
        
        <Button onClick={onDownload} variant={customizedResume.customizedPdfUrl ? "outline" : "default"} className="flex items-center">
          <Download className="h-4 w-4 mr-2" />
          Download Text
        </Button>
        
        {onRegenerateResume && (
          <Button variant="outline" onClick={onRegenerateResume}>
            <FileText className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
        )}

        {showComparison && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('customized')}
              className={`px-3 py-1 text-sm rounded ${
                activeTab === 'customized'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Customized
            </button>
            <button
              onClick={() => setActiveTab('original')}
              className={`px-3 py-1 text-sm rounded ${
                activeTab === 'original'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1 text-sm rounded ${
                activeTab === 'comparison'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Side by Side
            </button>
          </div>
        )}
      </div>

      {/* Details Section */}
      {showDetails && (
        <div className="space-y-6">
          {/* Customization Notes */}
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2 text-lg font-medium text-gray-900 mb-3"
            >
              <ChevronDown className="h-4 w-4" />
              <span>Customization Summary</span>
            </button>

            {customizedResume.customizationNotes.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Applied Customizations
                </h4>
                <ul className="space-y-2">
                  {customizedResume.customizationNotes.map((note, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {customizedResume.keywordMatches.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Matched Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {customizedResume.keywordMatches.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {customizedResume.suggestedImprovements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Suggested Improvements
                </h4>
                <ul className="space-y-2">
                  {customizedResume.suggestedImprovements.map((improvement, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Resume Content */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">
              {activeTab === 'original' ? 'Original Resume' : 
               activeTab === 'comparison' ? 'Resume Comparison' : 
               'Customized Resume'}
            </h4>

            {activeTab === 'comparison' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Original</h5>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 max-h-96 overflow-y-auto">
                    {customizedResume.originalText ? (
                      <pre className="whitespace-pre-wrap font-sans">
                        {customizedResume.originalText}
                      </pre>
                    ) : (
                      <p className="italic">Original resume content extraction not available...</p>
                    )}
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Customized</h5>
                  <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans">
                      {customizedResume.customizedContent}
                    </pre>
                  </div>
                </div>
              </div>
            ) : activeTab === 'original' ? (
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 max-h-96 overflow-y-auto">
                {customizedResume.originalText ? (
                  <>
                    {customizedResume.extractedSections && customizedResume.extractedSections.length > 0 ? (
                      <div className="space-y-4">
                        <div className="text-xs text-gray-500 mb-3">
                          Extracted {customizedResume.extractedSections.length} sections from original resume
                        </div>
                        {customizedResume.extractedSections.map((section, index) => (
                          <div key={index} className="border-l-2 border-gray-300 pl-3">
                            <h6 className="font-medium text-gray-800 text-sm">{section.title}</h6>
                            <p className="text-xs text-gray-600 mt-1">{section.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans">
                        {customizedResume.originalText}
                      </pre>
                    )}
                  </>
                ) : (
                  <p className="italic">Original resume text not available...</p>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans">
                  {customizedResume.customizedContent}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timestamp */}
      {customizedResume.createdAt && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Customized on {new Date(customizedResume.createdAt).toLocaleString()}
          </p>
        </div>
      )}
    </Card>
  )
}