'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card } from '@/components/ui/Card'
import { Bot, Settings, AlertTriangle, Clock, Target, Bell, CheckCircle, Edit3 } from 'lucide-react'

const autoApplySchema = z.object({
  isEnabled: z.boolean(),
  minMatchScore: z.number().min(0).max(1),
  maxApplicationsPerDay: z.number().min(1).max(50),
  excludedCompanies: z.array(z.string()).optional(),
  excludedKeywords: z.array(z.string()).optional(),
  preferredSources: z.array(z.string()).optional(),
  requireSalaryRange: z.boolean(),
  autoScanEnabled: z.boolean(),
  scanFrequencyHours: z.number().min(1).max(24),
  // New notification and approval settings
  notifyOnMatch: z.boolean(),
  notifyMinScore: z.number().min(0).max(1),
  requireApproval: z.boolean(),
  autoApplyEnabled: z.boolean(),
  customizeResume: z.boolean(),
  reviewTimeoutHours: z.number().min(1).max(168), // 1 hour to 1 week
})

type AutoApplySettingsInput = z.infer<typeof autoApplySchema>

interface AutoApplySettingsProps {
  initialData?: Partial<AutoApplySettingsInput>
  onSubmit: (data: AutoApplySettingsInput) => Promise<void>
}

export function AutoApplySettings({ initialData, onSubmit }: AutoApplySettingsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [excludedCompanies, setExcludedCompanies] = useState<string[]>(
    initialData?.excludedCompanies || []
  )
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>(
    initialData?.excludedKeywords || []
  )
  const [preferredSources, setPreferredSources] = useState<string[]>(
    initialData?.preferredSources || ['linkedin', 'indeed']
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AutoApplySettingsInput>({
    resolver: zodResolver(autoApplySchema),
    defaultValues: {
      isEnabled: false,
      minMatchScore: 0.75,
      maxApplicationsPerDay: 5,
      requireSalaryRange: false,
      autoScanEnabled: true,
      scanFrequencyHours: 4,
      // New defaults
      notifyOnMatch: true,
      notifyMinScore: 0.6,
      requireApproval: true,
      autoApplyEnabled: false,
      customizeResume: true,
      reviewTimeoutHours: 24,
      ...initialData,
    },
  })

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      console.log('Resetting form with initialData:', initialData)
      // Reset form with new data
      reset({
        isEnabled: false,
        minMatchScore: 0.75,
        maxApplicationsPerDay: 5,
        requireSalaryRange: false,
        autoScanEnabled: true,
        scanFrequencyHours: 4,
        notifyOnMatch: true,
        notifyMinScore: 0.6,
        requireApproval: true,
        autoApplyEnabled: false,
        customizeResume: true,
        reviewTimeoutHours: 24,
        ...initialData,
      })
      
      // Update local state arrays
      setExcludedCompanies(initialData.excludedCompanies || [])
      setExcludedKeywords(initialData.excludedKeywords || [])
    }
  }, [initialData, reset])

  const isEnabled = watch('isEnabled')
  const autoScanEnabled = watch('autoScanEnabled')
  const minMatchScore = watch('minMatchScore')
  const notifyOnMatch = watch('notifyOnMatch')
  const requireApproval = watch('requireApproval')
  const autoApplyEnabled = watch('autoApplyEnabled')
  const notifyMinScore = watch('notifyMinScore')
  const customizeResume = watch('customizeResume')
  const requireSalaryRange = watch('requireSalaryRange')

  const addExcludedCompany = (company: string) => {
    if (company && !excludedCompanies.includes(company)) {
      const updated = [...excludedCompanies, company]
      setExcludedCompanies(updated)
      setValue('excludedCompanies', updated)
    }
  }

  const removeExcludedCompany = (index: number) => {
    const updated = excludedCompanies.filter((_, i) => i !== index)
    setExcludedCompanies(updated)
    setValue('excludedCompanies', updated)
  }

  const addExcludedKeyword = (keyword: string) => {
    if (keyword && !excludedKeywords.includes(keyword)) {
      const updated = [...excludedKeywords, keyword]
      setExcludedKeywords(updated)
      setValue('excludedKeywords', updated)
    }
  }

  const removeExcludedKeyword = (index: number) => {
    const updated = excludedKeywords.filter((_, i) => i !== index)
    setExcludedKeywords(updated)
    setValue('excludedKeywords', updated)
  }

  const togglePreferredSource = (source: string) => {
    const updated = preferredSources.includes(source)
      ? preferredSources.filter(s => s !== source)
      : [...preferredSources, source]
    setPreferredSources(updated)
    setValue('preferredSources', updated)
  }

  const updateSingleField = async (fieldName: keyof AutoApplySettingsInput, value: any) => {
    if (isUpdating) return
    
    setIsUpdating(true)
    try {
      const response = await fetch('/api/auto-apply/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [fieldName]: value }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to update setting:', errorData)
        // Revert the form field value on error
        setValue(fieldName, !value)
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      // Revert the form field value on error
      setValue(fieldName, !value)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleFormSubmit = async (data: AutoApplySettingsInput) => {
    setIsLoading(true)
    try {
      await onSubmit({
        ...data,
        excludedCompanies,
        excludedKeywords,
        preferredSources,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Bot className="h-8 w-8 text-primary-600 mr-2" />
          <h1 className="text-3xl font-bold text-gray-900">AI Auto-Apply Settings</h1>
        </div>
        <p className="text-gray-600">
          Configure your AI assistant to automatically apply to jobs that match your criteria
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Main Toggle */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Enable Auto-Apply
              </h2>
              <p className="text-gray-600 mt-1">
                Allow AI to automatically apply to jobs that meet your criteria
              </p>
            </div>
            <Switch
              checked={isEnabled}
              size="lg"
              onChange={async (e) => {
                const value = e.target.checked
                setValue('isEnabled', value, { shouldDirty: true })
                await updateSingleField('isEnabled', value)
              }}
              disabled={isUpdating}
            />
          </div>
        </Card>

        {isEnabled && (
          <>
            {/* Notification Settings */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-primary-600" />
                  <h3 className="text-lg font-semibold">Job Notifications</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Job Match Notifications</Label>
                      <p className="text-sm text-gray-600">
                        Get notified when AI finds jobs that match your profile
                      </p>
                    </div>
                    <Switch 
                      checked={notifyOnMatch}
                      onChange={async (e) => {
                        const value = e.target.checked
                        setValue('notifyOnMatch', value, { shouldDirty: true })
                        await updateSingleField('notifyOnMatch', value)
                      }}
                      disabled={isUpdating}
                    />
                  </div>

                  {notifyOnMatch && (
                    <div>
                      <Label htmlFor="notifyMinScore">
                        Notification Threshold: {' '}
                        <span className={`font-semibold ${getMatchScoreColor(notifyMinScore)}`}>
                          {Math.round(notifyMinScore * 100)}%
                        </span>
                      </Label>
                      <input
                        id="notifyMinScore"
                        type="range"
                        min="0.5"
                        max="0.9"
                        step="0.05"
                        {...register('notifyMinScore', { valueAsNumber: true })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
                      />
                      <div className="flex justify-between text-sm text-gray-500 mt-1">
                        <span>50% (All)</span>
                        <span>70% (Good)</span>
                        <span>90% (Excellent)</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Get notified about jobs with match scores above this threshold
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Application Control */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary-600" />
                  <h3 className="text-lg font-semibold">Application Control</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Your Approval</Label>
                      <p className="text-sm text-gray-600">
                        Review and approve each application before submission
                      </p>
                    </div>
                    <Switch 
                      checked={requireApproval}
                      onChange={async (e) => {
                        const value = e.target.checked
                        setValue('requireApproval', value, { shouldDirty: true })
                        await updateSingleField('requireApproval', value)
                      }}
                      disabled={isUpdating}
                    />
                  </div>

                  {!requireApproval && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Fully Automated Applications</Label>
                        <p className="text-sm text-gray-600">
                          Allow AI to apply automatically without your approval
                        </p>
                      </div>
                      <Switch 
                        checked={autoApplyEnabled}
                        onChange={async (e) => {
                          const value = e.target.checked
                          setValue('autoApplyEnabled', value, { shouldDirty: true })
                          await updateSingleField('autoApplyEnabled', value)
                        }}
                        disabled={isUpdating}
                      />
                    </div>
                  )}

                  {requireApproval && (
                    <div>
                      <Label htmlFor="reviewTimeoutHours">Review Timeout (hours)</Label>
                      <Select {...register('reviewTimeoutHours', { valueAsNumber: true })}>
                        <option value={1}>1 hour</option>
                        <option value={6}>6 hours</option>
                        <option value={12}>12 hours</option>
                        <option value={24}>24 hours (recommended)</option>
                        <option value={48}>48 hours</option>
                        <option value={72}>3 days</option>
                        <option value={168}>1 week</option>
                      </Select>
                      <p className="text-sm text-gray-600 mt-1">
                        Applications expire if not reviewed within this time
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Customize Resume for Each Job</Label>
                      <p className="text-sm text-gray-600">
                        AI will tailor your resume for each specific position
                      </p>
                    </div>
                    <Switch 
                      checked={customizeResume}
                      onChange={async (e) => {
                        const value = e.target.checked
                        setValue('customizeResume', value, { shouldDirty: true })
                        await updateSingleField('customizeResume', value)
                      }}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Match Score Threshold for Auto-Apply */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-primary-600" />
                  <h3 className="text-lg font-semibold">Auto-Apply Threshold</h3>
                </div>
                <div>
                  <Label htmlFor="minMatchScore">
                    {requireApproval ? 'Review Threshold' : 'Auto-Apply Threshold'}: {' '}
                    <span className={`font-semibold ${getMatchScoreColor(minMatchScore)}`}>
                      {Math.round(minMatchScore * 100)}%
                    </span>
                  </Label>
                  <input
                    id="minMatchScore"
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    {...register('minMatchScore', { valueAsNumber: true })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>50% (Low)</span>
                    <span>75% (Recommended)</span>
                    <span>95% (Very High)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {requireApproval 
                      ? 'Send applications for your review when match score is above this threshold'
                      : 'Automatically apply to jobs with match score above this threshold'
                    }
                  </p>
                </div>
              </div>
            </Card>

            {/* Application Limits */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary-600" />
                  Application Limits
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxApplicationsPerDay">Max Applications Per Day</Label>
                    <Input
                      id="maxApplicationsPerDay"
                      type="number"
                      min="1"
                      max="50"
                      {...register('maxApplicationsPerDay', { valueAsNumber: true })}
                      error={errors.maxApplicationsPerDay?.message}
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Recommended: 5-10 applications per day
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="scanFrequencyHours">Scan Frequency (hours)</Label>
                    <Select {...register('scanFrequencyHours', { valueAsNumber: true })}>
                      <option value={1}>Every hour</option>
                      <option value={2}>Every 2 hours</option>
                      <option value={4}>Every 4 hours</option>
                      <option value={6}>Every 6 hours</option>
                      <option value={12}>Every 12 hours</option>
                      <option value={24}>Once daily</option>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Job Sources */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preferred Job Sources</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['linkedin', 'indeed', 'glassdoor', 'monster'].map((source) => (
                    <label key={source} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferredSources.includes(source)}
                        onChange={() => togglePreferredSource(source)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm capitalize">{source}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            {/* Filters */}
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                  <h3 className="text-lg font-semibold">Filters & Exclusions</h3>
                </div>

                {/* Excluded Companies */}
                <div>
                  <Label>Excluded Companies</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Enter company name to exclude"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addExcludedCompany(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).parentElement?.querySelector('input')
                        if (input?.value) {
                          addExcludedCompany(input.value)
                          input.value = ''
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {excludedCompanies.map((company, index) => (
                      <span
                        key={index}
                        className="bg-red-100 text-red-800 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                      >
                        {company}
                        <button
                          type="button"
                          onClick={() => removeExcludedCompany(index)}
                          className="text-red-600 hover:text-red-800 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Excluded Keywords */}
                <div>
                  <Label>Excluded Keywords</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Enter keywords to avoid (e.g., 'unpaid', 'commission only')"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addExcludedKeyword(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).parentElement?.querySelector('input')
                        if (input?.value) {
                          addExcludedKeyword(input.value)
                          input.value = ''
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {excludedKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="bg-red-100 text-red-800 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeExcludedKeyword(index)}
                          className="text-red-600 hover:text-red-800 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Additional Filters */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Salary Range</Label>
                      <p className="text-sm text-gray-600">
                        Only apply to jobs that specify salary information
                      </p>
                    </div>
                    <Switch 
                      checked={requireSalaryRange}
                      onChange={async (e) => {
                        const value = e.target.checked
                        setValue('requireSalaryRange', value, { shouldDirty: true })
                        await updateSingleField('requireSalaryRange', value)
                      }}
                      disabled={isUpdating}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Job Scanning</Label>
                      <p className="text-sm text-gray-600">
                        Automatically search for new jobs based on your preferences
                      </p>
                    </div>
                    <Switch 
                      checked={autoScanEnabled}
                      onChange={async (e) => {
                        const value = e.target.checked
                        setValue('autoScanEnabled', value, { shouldDirty: true })
                        await updateSingleField('autoScanEnabled', value)
                      }}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Summary Card */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start">
                <Bot className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800">AI Assistant Summary</h4>
                  <div className="text-sm text-blue-700 mt-2 space-y-1">
                    {requireApproval ? (
                      <div>
                        <p className="font-medium">📋 Review Mode Active:</p>
                        <p>• AI will find jobs scoring {Math.round(minMatchScore * 100)}%+ and send for your approval</p>
                        <p>• You have {watch('reviewTimeoutHours')} hours to review each application</p>
                        <p>• {customizeResume ? 'Resume will be' : 'Resume will not be'} customized for each job</p>
                      </div>
                    ) : autoApplyEnabled ? (
                      <div>
                        <p className="font-medium">🤖 Full Auto-Apply Active:</p>
                        <p>• AI will automatically apply to jobs scoring {Math.round(minMatchScore * 100)}%+</p>
                        <p>• Maximum {watch('maxApplicationsPerDay')} applications per day</p>
                        <p>• {customizeResume ? 'Resume will be' : 'Resume will not be'} customized for each job</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">🔔 Notification Only:</p>
                        <p>• You&apos;ll be notified about jobs scoring {Math.round((notifyMinScore || 0.6) * 100)}%+</p>
                        <p>• No automatic applications will be submitted</p>
                        <p>• You can manually review and apply to each opportunity</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Warning Card */}
            <Card className="p-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800">Important Notes</h4>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                    <li>• AI will analyze job descriptions and customize applications accordingly</li>
                    <li>• You&apos;ll receive notifications for all job matches and application activities</li>
                    <li>• Review mode gives you full control over each application before submission</li>
                    <li>• Auto-apply mode works best with high match score thresholds (75%+)</li>
                    <li>• You can pause, modify, or disable these settings at any time</li>
                  </ul>
                </div>
              </div>
            </Card>
          </>
        )}

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline">
            Reset to Defaults
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  )
}