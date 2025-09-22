'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { CheckCircle, ArrowRight, ArrowLeft, User, Briefcase, Upload, Settings, Sparkles, X } from 'lucide-react'
import { getOnboardingStep, calculateProfileCompletion } from '@/lib/profileCompletion'

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
      title: 'Basic Information',
      description: 'Tell us about yourself and your career preferences.',
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
      title: 'You&apos;re All Set!',
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
        router.push('/profile')
        break
      case 'skills':
        router.push('/profile?tab=skills')
        break
      case 'resume':
        router.push('/profile?tab=resume')
        break
      case 'automation':
        router.push('/profile?tab=automation')
        break
      default:
        handleNext()
    }
    
    setIsLoading(false)
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
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Complete Your Basic Profile</h4>
                <p className="text-yellow-700 text-sm mb-3">
                  AI needs this information to find relevant jobs and customize applications.
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    {profile?.fullName ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    }
                    <span>Full Name</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {profile?.jobTitlePrefs ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    }
                    <span>Job Preferences</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {profile?.yearsExperience !== null ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    }
                    <span>Experience Level</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {profile?.preferredLocations ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    }
                    <span>Locations</span>
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
                  Configure how AI should find and apply to jobs. You can change these settings anytime.
                </p>
                <div className="text-sm text-green-700">
                  {profile?.autoApplySettings ? 'Settings configured ✓' : 'Not configured yet'}
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
                  Profile {completion.percentage}% Complete!
                </h4>
                <p className="text-gray-600 mb-6">
                  AI can now start finding and applying to jobs for you. Check your dashboard to monitor progress.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border">
                  <h5 className="font-medium text-blue-900 mb-1">What happens next?</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• AI scans job boards every 4 hours</li>
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

              {currentStep >= 1 && currentStep <= 4 ? (
                <Button
                  onClick={() => handleActionClick(currentStepData.id)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Complete This Step'}
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