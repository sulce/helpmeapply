'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { CheckCircle, ArrowRight, ArrowLeft, User, Briefcase, Upload, Settings, Sparkles, X, FileText } from 'lucide-react'
import { getOnboardingStep, calculateProfileCompletion } from '@/lib/profileCompletion'
import { ResumeUploadOnly } from '@/components/profile/ResumeUploadOnly'

interface OnboardingWizardProps {
  profile: any
  onComplete: () => void
  onSkip?: () => void
  onRefresh?: () => void
}

export function OnboardingWizard({ profile, onComplete, onSkip, onRefresh }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showResumeUpload, setShowResumeUpload] = useState(false)
  const [showResumeBuilder, setShowResumeBuilder] = useState(false)
  
  console.log('OnboardingWizard - Profile data:', profile)
  console.log('OnboardingWizard - Skills:', profile?.skills)
  console.log('OnboardingWizard - Skills length:', profile?.skills?.length)
  console.log('OnboardingWizard - Is skills array:', Array.isArray(profile?.skills))
  
  // Use the same logic as profileCompletion.ts for consistency
  const skillsCount = (profile?.skills && Array.isArray(profile.skills)) ? profile.skills.length : 0
  console.log('OnboardingWizard - Calculated skills count:', skillsCount)
  
  // Recalculate on profile changes
  const completion = calculateProfileCompletion(profile)
  const onboardingStep = getOnboardingStep(profile)
  
  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to HelpMeApply AI!',
      description: 'Let&apos;s set up your profile so AI can find and apply to perfect jobs for you.',
      icon: <Sparkles className="h-8 w-8 text-primary-600" />,
      canSkip: true
    },
    {
      id: 'profile',
      title: 'Resume Setup',
      description: 'Upload your resume or use our builder to create one.',
      icon: <User className="h-8 w-8 text-primary-600" />,
      canSkip: false
    },
    {
      id: 'skills',
      title: 'Your Skills',
      description: 'Add your skills to help AI match you with relevant opportunities.',
      icon: <Briefcase className="h-8 w-8 text-primary-600" />,
      canSkip: false
    },
    {
      id: 'resume',
      title: 'Upload Resume',
      description: 'Your resume helps AI customize applications for each job.',
      icon: <Upload className="h-8 w-8 text-primary-600" />,
      canSkip: false
    },
    {
      id: 'automation',
      title: 'AI Automation Settings',
      description: 'Configure how AI should find and apply to jobs for you.',
      icon: <Settings className="h-8 w-8 text-primary-600" />,
      canSkip: true
    },
    {
      id: 'complete',
      title: "You're All Set!",
      description: 'AI is now ready to start finding jobs for you.',
      icon: <CheckCircle className="h-8 w-8 text-green-600" />,
      canSkip: false
    }
  ]

  useEffect(() => {
    // Start from the appropriate step based on profile completion
    console.log('OnboardingWizard - Onboarding step determined:', onboardingStep)
    
    switch (onboardingStep) {
      case 'profile':
        setCurrentStep(1)
        break
      case 'skills':
        setCurrentStep(2)
        break
      case 'resume':
        setCurrentStep(3)
        break
      case 'preferences':
        setCurrentStep(4)
        break
      case 'complete':
        setCurrentStep(5)
        break
      default:
        setCurrentStep(0)
    }
  }, [onboardingStep]) // Only depend on onboardingStep to prevent infinite loops

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    if (onSkip) {
      onSkip()
    } else {
      onComplete()
    }
  }

  const handleActionClick = async (stepId: string) => {
    setIsLoading(true)
    
    switch (stepId) {
      case 'profile':
        // Show resume setup options instead of redirecting
        break
      case 'skills':
        router.push('/profile?tab=skills')
        break
      case 'resume':
        router.push('/resume-builder')
        break
      case 'automation':
        // Apply default AI settings instead of redirecting to manual configuration
        await applyDefaultAISettings()
        break
      default:
        handleNext()
    }
    
    setIsLoading(false)
  }

  const applyDefaultAISettings = async () => {
    try {
      // First apply AI settings
      const response = await fetch('/api/auto-apply/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEnabled: true,
          minMatchScore: 0.75,
          maxApplicationsPerDay: 5,
          autoScanEnabled: true,
          scanFrequencyHours: 6,
          notifyOnMatch: true,
          requireApproval: true,
          autoApplyEnabled: false,
          customizeResume: true,
        }),
      })

      if (response.ok) {
        console.log('Default AI settings applied successfully')
        
        // Check if job title preferences are missing and add default ones
        // No longer setting default job title preferences
        // Job titles should come from resume extraction or user manual input
        console.log('Skipping default job title preferences - relying on resume extraction or manual user input')
        
        if (onRefresh) {
          await onRefresh()
        }
        handleNext()
      } else {
        console.error('Failed to apply default AI settings')
        // Still proceed to next step even if settings fail
        handleNext()
      }
    } catch (error) {
      console.error('Error applying default AI settings:', error)
      // Still proceed to next step even if settings fail
      handleNext()
    }
  }

  const handleResumeUploadComplete = async (data: any) => {
    setShowResumeUpload(false)
    
    // Add a small delay to ensure database operations complete
    setTimeout(async () => {
      if (onRefresh) {
        await onRefresh()
        // Add another small delay for UI to update
        setTimeout(() => {
          handleNext()
        }, 500)
      } else {
        handleNext()
      }
    }, 1000)
  }

  const handleUploadOption = () => {
    setShowResumeUpload(true)
  }

  const handleBuilderOption = () => {
    setShowResumeBuilder(true)
  }

  const confirmBuilderRedirect = () => {
    router.push('/resume-builder')
  }

  // Add effect to refresh profile when returning from other pages
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && onRefresh) {
        console.log('OnboardingWizard - Document became visible, refreshing profile')
        onRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [onRefresh])

  const currentStepData = steps[currentStep]

  // Show resume upload overlay
  if (showResumeUpload) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Resume</h2>
                <p className="text-gray-600">
                  Upload your existing resume and we&apos;ll automatically extract your information.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResumeUpload(false)}
                className="p-1 h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
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
                onClick={() => setShowResumeUpload(false)}
              >
                Back to Options
              </Button>
              <Button
                variant="outline"
                onClick={handleBuilderOption}
              >
                Use Resume Builder Instead
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show resume builder confirmation
  if (showResumeBuilder) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Resume Builder</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResumeBuilder(false)}
                className="p-1 h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Create Your Resume
              </h3>
              <p className="text-gray-600">
                You&apos;ll be taken to our full-featured resume builder where you can create a professional resume from scratch.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-800 mb-2">What you&apos;ll get:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Professional resume templates</li>
                <li>• AI-powered content suggestions</li>
                <li>• Real-time preview and editing</li>
                <li>• Multiple export formats</li>
              </ul>
            </div>

            <p className="text-sm text-gray-500 text-center">
              You can return to complete your profile setup after building your resume.
            </p>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowResumeBuilder(false)}
                className="flex-1"
              >
                Back to Options
              </Button>
              <Button
                onClick={confirmBuilderRedirect}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Start Building
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Progress Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Profile Setup</h2>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="p-1 h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Close wizard"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {currentStepData.icon}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-gray-600">
              {currentStepData.description}
            </p>
          </div>

          {/* Step-specific content */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary-50 rounded-lg">
                  <User className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Smart Matching</h4>
                  <p className="text-sm text-gray-600">AI analyzes your profile to find perfect job matches</p>
                </div>
                <div className="text-center p-4 bg-primary-50 rounded-lg">
                  <Upload className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Auto Applications</h4>
                  <p className="text-sm text-gray-600">Customize resumes and apply to jobs automatically</p>
                </div>
                <div className="text-center p-4 bg-primary-50 rounded-lg">
                  <Settings className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Full Control</h4>
                  <p className="text-sm text-gray-600">You decide when and how AI applies to jobs</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Set Up Your Resume</h4>
                <p className="text-blue-700 text-sm mb-3">
                  Upload your existing resume or use our builder to create one. This helps AI find the best job matches.
                </p>
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-blue-700 font-medium mb-4">Choose how to set up your resume:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button 
                        onClick={handleUploadOption}
                        className="p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <Upload className="h-8 w-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <h5 className="font-medium text-gray-900 mb-1">Upload Existing Resume</h5>
                        <p className="text-sm text-gray-600">AI extracts all your information automatically</p>
                      </button>
                      <button 
                        onClick={handleBuilderOption}
                        className="p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <h5 className="font-medium text-gray-900 mb-1">Use Resume Builder</h5>
                        <p className="text-sm text-gray-600">Create a professional resume from scratch</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Add Your Skills</h4>
                <p className="text-blue-700 text-sm mb-3">
                  Skills help AI match you with jobs that fit your expertise level.
                </p>
                <div className="text-sm text-blue-700">
                  Current skills: {skillsCount} (need at least 3)
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-2">Upload Your Resume</h4>
                <p className="text-purple-700 text-sm mb-3">
                  Your resume is essential for AI to customize applications for each specific job.
                </p>
                <div className="flex items-center space-x-2">
                  {profile?.resumeUrl ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-700">Resume uploaded ✓</span>
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      <span className="text-sm text-purple-700">No resume uploaded yet</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">AI Automation Settings</h4>
                <p className="text-green-700 text-sm mb-3">
                  We&apos;ll apply smart default settings to get you started. You can customize these anytime in your profile.
                </p>
                <div className="bg-white border border-green-300 rounded-lg p-3 mt-3">
                  <h5 className="font-medium text-green-800 mb-2">Default Settings:</h5>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Match threshold: 75% (high-quality jobs only)</li>
                    <li>• Max applications: 5 per day</li>
                    <li>• Auto-scan every 6 hours</li>
                    <li>• Notify on matches, require your approval</li>
                    <li>• Customize resume for each application</li>
                  </ul>
                </div>
                <div className="text-sm text-green-700 mt-2">
                  {profile?.autoApplySettings ? 'Settings configured ✓' : 'Ready to apply default settings'}
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {completion.percentage >= 70 ? 
                    `Profile ${completion.percentage}% Complete!` : 
                    'Setup Complete!'
                  }
                </h4>
                <p className="text-gray-600 mb-6">
                  AI is now ready to start finding jobs for you! {completion.percentage < 70 && 'Complete your profile for even better job matches.'} Check your dashboard to monitor progress.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border">
                  <h5 className="font-medium text-blue-900 mb-1">What happens next?</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• AI scans job boards every {profile?.autoApplySettings?.scanFrequencyHours || 6} hours</li>
                    <li>• You&apos;ll get notifications for good matches</li>
                    <li>• Review and approve applications</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border">
                  <h5 className="font-medium text-green-900 mb-1">You&apos;re in control</h5>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Set match score thresholds</li>
                    <li>• Review before applying</li>
                    <li>• Pause anytime in settings</li>
                  </ul>
                </div>
              </div>

              {completion.percentage < 70 && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h5 className="font-medium text-amber-800 mb-2">💡 Improve Your Job Matches</h5>
                  <p className="text-sm text-amber-700 mb-2">
                    Complete your profile to get better AI job recommendations:
                  </p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    {completion.missingFields.filter(f => f.importance === 'important').slice(0, 3).map((field, index) => (
                      <li key={index}>• Add {field.label.toLowerCase()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex space-x-3">
              {currentStepData.canSkip && currentStep < steps.length - 1 && (
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  Skip Setup
                </Button>
              )}

              {(currentStep >= 2 && currentStep <= 3) || currentStep === 4 ? (
                <Button
                  onClick={() => handleActionClick(currentStepData.id)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 
                   currentStep === 4 ? 'Apply Default Settings' : 'Complete This Step'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={isLoading}
                >
                  {currentStep === steps.length - 1 ? 'Get Started!' : 'Continue'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}