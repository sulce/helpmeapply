'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Upload, FileText, ChevronRight, Sparkles, User, Clock, CheckCircle } from 'lucide-react'
import { ResumeUploadOnly } from '@/components/profile/ResumeUploadOnly'

interface FirstTimeUserSetupProps {
  onComplete: (method: 'upload' | 'manual') => void
  onSkip: () => void
  userEmail?: string
  userName?: string
}

export function FirstTimeUserSetup({ onComplete, onSkip, userEmail, userName }: FirstTimeUserSetupProps) {
  const [selectedMethod, setSelectedMethod] = useState<'upload' | 'manual' | null>(null)
  const [showUploadInterface, setShowUploadInterface] = useState(false)

  const handleMethodSelect = async (method: 'upload' | 'manual') => {
    setSelectedMethod(method)
    if (method === 'upload') {
      setShowUploadInterface(true)
    } else {
      // Redirect directly to resume builder for manual entry
      window.location.href = '/resume-builder'
    }
  }

  const handleResumeUploadComplete = async (data: any) => {
    try {
      // Call onboarding completion API to set up default AI settings
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'upload' })
      })
    } catch (error) {
      console.error('Error completing onboarding:', error)
    }
    
    // Resume has been uploaded and parsed
    onComplete('upload')
  }

  if (showUploadInterface) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Resume</h2>
            <p className="text-gray-600">
              Upload your existing resume and we&apos;ll automatically extract your information to complete your profile.
            </p>
          </div>

          {/* Upload Interface */}
          <div className="p-6">
            <ResumeUploadOnly 
              onImportComplete={handleResumeUploadComplete}
              onError={(error) => console.error('Upload error:', error)}
              className=""
            />
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setShowUploadInterface(false)}
              >
                Back to Options
              </Button>
              <Button
                variant="outline"
                onClick={() => onComplete('manual')}
              >
                Skip Upload, Fill Manually
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to HelpMeApply AI{userName ? `, ${userName}` : ''}!
            </h2>
            <p className="text-gray-600 text-lg">
              Let&apos;s get your profile set up so AI can start finding and applying to perfect jobs for you.
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Smart Matching</h3>
              <p className="text-sm text-gray-600">AI analyzes your profile to find perfect job matches</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Auto Applications</h3>
              <p className="text-sm text-gray-600">Customize resumes and apply to jobs automatically</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Save Time</h3>
              <p className="text-sm text-gray-600">Apply to hundreds of jobs while you focus on other things</p>
            </div>
          </div>
        </div>

        {/* Method Selection */}
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Choose how to set up your profile:
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Upload Resume Option */}
            <div 
              className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedMethod === 'upload' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => handleMethodSelect('upload')}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload Resume</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Upload your existing resume and we&apos;ll automatically extract all your information
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center text-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Auto-fills all profile fields</span>
                  </div>
                  <div className="flex items-center justify-center text-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Fastest setup (2-3 minutes)</span>
                  </div>
                  <div className="flex items-center justify-center text-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>AI extracts skills & experience</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-3 right-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
              </div>
            </div>

            {/* Manual Entry Option */}
            <div 
              className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedMethod === 'manual' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => handleMethodSelect('manual')}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Manual Entry</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Fill out your profile manually using our guided form and resume builder
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center text-blue-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Full control over information</span>
                  </div>
                  <div className="flex items-center justify-center text-blue-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Built-in resume builder</span>
                  </div>
                  <div className="flex items-center justify-center text-blue-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Perfect for career changers</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-3 right-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Estimate */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-3" />
              <div>
                <h4 className="font-medium text-yellow-800">Quick Setup</h4>
                <p className="text-yellow-700 text-sm">
                  Either method takes just 2-5 minutes. You can always edit your information later.
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          {selectedMethod && (
            <div className="text-center">
              <Button
                size="lg"
                onClick={() => handleMethodSelect(selectedMethod)}
                className="w-full md:w-auto px-8 py-3"
              >
                Continue with {selectedMethod === 'upload' ? 'Resume Upload' : 'Manual Entry'}
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Need help? Visit our <a href="#" className="text-blue-600 hover:underline">support center</a>
            </p>
            <Button
              variant="ghost"
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              I&apos;ll set this up later
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}