'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Circle, ArrowRight, User, Upload, Settings, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { calculateProfileCompletion, getProfileCompletionColor, getProfileCompletionBgColor } from '@/lib/profileCompletion'

interface ProfileCompletionCardProps {
  profile: any
  compact?: boolean
  className?: string
}

export function ProfileCompletionCard({ profile, compact = false, className = '' }: ProfileCompletionCardProps) {
  const router = useRouter()
  const completion = calculateProfileCompletion(profile)

  const getFieldIcon = (fieldName: string) => {
    switch (fieldName) {
      case 'fullName':
      case 'email':
      case 'mobile':
        return <User className="h-4 w-4" />
      case 'resumeUrl':
        return <Upload className="h-4 w-4" />
      case 'preferredLocations':
      case 'employmentTypes':
        return <MapPin className="h-4 w-4" />
      case 'autoApplySettings':
        return <Settings className="h-4 w-4" />
      default:
        return <Circle className="h-4 w-4" />
    }
  }

  const getActionUrl = (fieldName: string) => {
    switch (fieldName) {
      case 'fullName':
      case 'email':
      case 'mobile':
      case 'jobTitlePrefs':
      case 'yearsExperience':
      case 'salaryMin':
      case 'salaryMax':
      case 'preferredLocations':
      case 'employmentTypes':
      case 'linkedinUrl':
        return '/profile'
      case 'skills':
        return '/profile?tab=skills'
      case 'resumeUrl':
        return '/resume-builder'
      case 'autoApplySettings':
        return '/profile?tab=automation'
      default:
        return '/profile'
    }
  }

  if (compact) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${getProfileCompletionBgColor(completion.percentage)} ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <User className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                Profile Completion
              </div>
              <div className={`text-lg font-semibold ${getProfileCompletionColor(completion.percentage)}`}>
                {completion.percentage}%
              </div>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => router.push('/profile')}
          >
            Update
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{completion.completedFields} of {completion.totalFields} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
        </div>

        {/* Next Step */}
        {completion.nextSteps.length > 0 && completion.percentage < 100 && (
          <div className="mt-3 text-xs text-gray-600">
            <span className="font-medium">Next: </span>
            {completion.nextSteps[0]}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Profile Completion</h3>
          <span className={`text-2xl font-bold ${getProfileCompletionColor(completion.percentage)}`}>
            {completion.percentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{completion.completedFields} of {completion.totalFields} sections completed</span>
            <span>{completion.percentage >= 90 ? 'Excellent!' : completion.percentage >= 70 ? 'Good progress' : 'Needs attention'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                completion.percentage >= 90 ? 'bg-green-500' :
                completion.percentage >= 70 ? 'bg-yellow-500' :
                completion.percentage >= 50 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
        </div>

        {/* Missing Fields */}
        {completion.missingFields.length > 0 && (
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-gray-900">
              Missing Information ({completion.missingFields.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {completion.missingFields.map((field) => (
                <div key={field.field} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    {getFieldIcon(field.field)}
                    <span className="text-sm text-gray-700">{field.label}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      field.importance === 'critical' ? 'bg-red-100 text-red-800' :
                      field.importance === 'important' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {field.importance}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(getActionUrl(field.field))}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {completion.nextSteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">
              {completion.percentage >= 100 ? 'You&apos;re All Set!' : 'Next Steps'}
            </h4>
            <div className="space-y-2">
              {completion.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start space-x-2">
                  {completion.percentage >= 100 ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-3">
          <Button
            onClick={() => router.push('/profile')}
            className="flex-1"
            variant={completion.percentage < 70 ? 'default' : 'outline'}
          >
            {completion.percentage < 70 ? 'Complete Profile' : 'Update Profile'}
          </Button>
          {completion.percentage >= 70 && (
            <Button
              onClick={() => router.push('/profile?tab=automation')}
              variant="default"
              className="flex-1"
            >
              AI Settings
            </Button>
          )}
        </div>

        {/* AI Readiness Indicator */}
        <div className={`mt-4 p-3 rounded-md border ${
          completion.percentage >= 90 ? 'bg-green-50 border-green-200' :
          completion.percentage >= 70 ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {completion.percentage >= 90 ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : completion.percentage >= 70 ? (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <div className={`text-sm font-medium ${
                completion.percentage >= 90 ? 'text-green-800' :
                completion.percentage >= 70 ? 'text-yellow-800' :
                'text-red-800'
              }`}>
                AI Job Search Status
              </div>
              <div className={`text-xs ${
                completion.percentage >= 90 ? 'text-green-700' :
                completion.percentage >= 70 ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {completion.percentage >= 90 ? 'Ready for full automation' :
                 completion.percentage >= 70 ? 'Ready for basic job matching' :
                 'Profile needs completion for AI to work effectively'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}