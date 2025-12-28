'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Zap,
  ExternalLink
} from 'lucide-react'

interface Job {
  id: string
  title: string
  company: string
  url: string
  source: string
  sourceInfo?: any
}

interface SmartApplyModalProps {
  job: Job | null
  isOpen: boolean
  onClose: () => void
  userProfile?: any
}

interface ApplicationForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  resumeFile: File | null
  coverLetter?: string
}

export function SmartApplyModal({ 
  job, 
  isOpen, 
  onClose,
  userProfile 
}: SmartApplyModalProps) {
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>('form')
  const [formData, setFormData] = useState<ApplicationForm>({
    firstName: userProfile?.contactInfo?.fullName?.split(' ')[0] || '',
    lastName: userProfile?.contactInfo?.fullName?.split(' ').slice(1).join(' ') || '',
    email: userProfile?.contactInfo?.email || '',
    phone: userProfile?.contactInfo?.phone || '',
    resumeFile: null,
    coverLetter: ''
  })
  const [dragActive, setDragActive] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  if (!isOpen || !job) return null

  // Only show for Greenhouse/Lever jobs
  if (!job.sourceInfo || !['GREENHOUSE', 'LEVER'].includes(job.sourceInfo.source)) {
    return null
  }

  const handleClose = () => {
    setStep('form')
    setErrorMessage('')
    onClose()
  }

  const handleInputChange = (field: keyof ApplicationForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      setErrorMessage('Please upload a PDF file')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrorMessage('File size must be less than 5MB')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      resumeFile: file
    }))
    setErrorMessage('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleSubmit = async () => {
    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setErrorMessage('Please fill in all required fields')
      return
    }
    
    if (!formData.resumeFile) {
      setErrorMessage('Please upload your resume')
      return
    }

    setStep('submitting')
    
    try {
      const submitFormData = new FormData()
      submitFormData.append('firstName', formData.firstName)
      submitFormData.append('lastName', formData.lastName)
      submitFormData.append('email', formData.email)
      submitFormData.append('phone', formData.phone)
      submitFormData.append('resume', formData.resumeFile)
      submitFormData.append('coverLetter', formData.coverLetter || '')
      submitFormData.append('jobUrl', job.url)
      submitFormData.append('jobTitle', job.title)
      submitFormData.append('company', job.company)
      submitFormData.append('platform', job.sourceInfo.source)

      const response = await fetch('/api/auto-apply', {
        method: 'POST',
        body: submitFormData
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setStep('success')
      } else {
        setErrorMessage(result.error || 'Application failed')
        setStep('error')
      }
      
    } catch (error) {
      setErrorMessage('Network error - please try again')
      setStep('error')
    }
  }

  const isFormValid = formData.firstName && formData.lastName && formData.email && formData.resumeFile

  if (step === 'submitting') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Submitting Application</h3>
            <p className="text-gray-600 text-sm">
              Our automation is filling out the application form on {job.company}'s website...
            </p>
            <div className="mt-4 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center justify-center text-blue-700 text-sm">
                <Zap className="h-4 w-4 mr-2" />
                This may take 30-60 seconds
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                <h2 className="text-xl font-bold text-green-700">Application Submitted!</h2>
              </div>
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-800 text-sm">
                  Your application for <strong>{job.title}</strong> at <strong>{job.company}</strong> has been successfully submitted through their {job.sourceInfo.displayName} portal.
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">What's Next?</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• You'll receive a confirmation email from {job.company}</li>
                  <li>• The hiring team will review your application</li>
                  <li>• Check your email for updates on next steps</li>
                </ul>
              </div>
              
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
                <h2 className="text-xl font-bold text-red-700">Application Failed</h2>
              </div>
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-red-800 text-sm">{errorMessage}</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Alternative Options:</h4>
                <div className="space-y-2">
                  <Button 
                    onClick={() => window.open(job.url, '_blank')}
                    variant="outline" 
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Apply Manually on {job.company}'s Site
                  </Button>
                  <Button 
                    onClick={() => setStep('form')}
                    className="w-full"
                  >
                    Try Smart Apply Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Smart Apply to {job.title}</h2>
              <div className="flex items-center text-gray-600 space-x-2">
                <span>{job.company}</span>
                <span>•</span>
                <div className="flex items-center">
                  <span className="mr-1">{job.sourceInfo.icon}</span>
                  {job.sourceInfo.displayName}
                </div>
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
                <h3 className="font-medium text-blue-900 mb-1">Smart Application Process</h3>
                <p className="text-blue-800 text-sm">
                  We'll automatically fill out the application form on {job.company}'s website using the information below. This keeps you on our platform while ensuring your application reaches the right place.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            {/* Contact Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john.doe@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <FileText className="h-4 w-4 inline mr-1" />
                Resume *
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : formData.resumeFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
              >
                {formData.resumeFile ? (
                  <div className="text-green-700">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">{formData.resumeFile.name}</p>
                    <p className="text-sm text-green-600">
                      {(formData.resumeFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setFormData(prev => ({ ...prev, resumeFile: null }))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-600">
                    <Upload className="h-8 w-8 mx-auto mb-2" />
                    <p className="mb-1">Drop your resume here or</p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file)
                        }}
                      />
                      <span className="text-blue-600 hover:text-blue-700 underline">
                        browse files
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">PDF only, max 5MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cover Letter */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Cover Letter (Optional)
              </label>
              <textarea
                value={formData.coverLetter}
                onChange={(e) => handleInputChange('coverLetter', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dear Hiring Manager,..."
              />
              <p className="text-xs text-gray-500 mt-1">
                If left blank, we'll use your default cover letter from your profile
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                  <p className="text-red-700 text-sm">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex space-x-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!isFormValid}
                className="flex-1"
              >
                <Zap className="h-4 w-4 mr-2" />
                Submit Application
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}