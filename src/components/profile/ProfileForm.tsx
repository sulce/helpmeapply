'use client'

import { useState, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, skillSchema, type ProfileInput, type SkillInput } from '@/lib/validations'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { SkillsAutocomplete } from '@/components/ui/SkillsAutocomplete'
import { Plus, Trash2, Upload } from 'lucide-react'
import { ResumeBuilderSection } from '@/components/profile/ResumeBuilderSection'

interface ProfileFormProps {
  initialData?: Partial<ProfileInput> & { skills?: SkillInput[] }
  onSubmit: (data: ProfileInput) => Promise<void>
  onSaveDraft?: (data: Partial<ProfileInput> & { skills?: SkillInput[] }) => Promise<void>
}

export function ProfileForm({ initialData, onSubmit, onSaveDraft }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [skills, setSkills] = useState<SkillInput[]>(initialData?.skills || [])
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  
  const jobTitleInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const employmentTypeInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData || {
      fullName: '',
      email: '',
      mobile: '',
      jobTitlePrefs: [],
      yearsExperience: 0,
      salaryMin: 0,
      salaryMax: 0,
      preferredLocations: [],
      employmentTypes: [],
      linkedinUrl: '',
      indeedProfile: '',
    },
  })

  const jobTitlePrefs = watch('jobTitlePrefs') || []
  const preferredLocations = watch('preferredLocations') || []
  const employmentTypes = watch('employmentTypes') || []

  const addJobTitle = (title: string) => {
    if (title && !jobTitlePrefs.includes(title)) {
      console.log('Adding job title:', title)
      setValue('jobTitlePrefs', [...jobTitlePrefs, title])
      console.log('Updated jobTitlePrefs:', [...jobTitlePrefs, title])
    } else if (jobTitlePrefs.includes(title)) {
      console.log('Job title already exists:', title)
    } else {
      console.log('Invalid job title:', title)
    }
  }

  const removeJobTitle = (index: number) => {
    setValue('jobTitlePrefs', jobTitlePrefs.filter((_, i) => i !== index))
  }

  const addLocation = (location: string) => {
    if (location && !preferredLocations.includes(location)) {
      setValue('preferredLocations', [...preferredLocations, location])
    }
  }

  const removeLocation = (index: number) => {
    setValue('preferredLocations', preferredLocations.filter((_, i) => i !== index))
  }

  const toggleEmploymentType = (type: string) => {
    const types = employmentTypes.includes(type as any)
      ? employmentTypes.filter(t => t !== type)
      : [...employmentTypes, type as any]
    setValue('employmentTypes', types)
  }


  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadError('')
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      setUploadedFile(result.fileUrl)
      setValue('resumeUrl', result.fileUrl)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileRemove = async () => {
    try {
      const response = await fetch('/api/upload', {
        method: 'DELETE',
      })

      if (response.ok) {
        setUploadedFile(null)
        setValue('resumeUrl', '')
      }
    } catch (error) {
      console.error('Error removing file:', error)
    }
  }

  const handleFormSubmit = async (data: ProfileInput) => {
    setIsLoading(true)
    try {
      await onSubmit({ ...data, skills })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDraftSave = async () => {
    if (!onSaveDraft) return
    
    setIsDraftSaving(true)
    try {
      // Get current form values without validation using getValues() for immediate access
      const formValues = getValues()
      
      // Manually build the data object to ensure we get latest values for dynamic fields
      const draftData = {
        ...formValues,
        jobTitlePrefs: formValues.jobTitlePrefs || [], // Use form values directly
        preferredLocations: formValues.preferredLocations || [], // Use form values directly
        employmentTypes: formValues.employmentTypes || [], // Use form values directly
        skills, // Include the skills state
        resumeUrl: uploadedFile || formValues.resumeUrl // Ensure resume URL is included
      }
      
      console.log('Draft save - Form values from getValues():', formValues)
      console.log('Draft save - jobTitlePrefs from form:', formValues.jobTitlePrefs)
      console.log('Draft save - preferredLocations from form:', formValues.preferredLocations)
      console.log('Draft save - employmentTypes from form:', formValues.employmentTypes)
      console.log('Draft save - skills state:', skills)
      console.log('Draft save - uploadedFile state:', uploadedFile)
      console.log('Draft save - Final data being sent:', draftData)
      await onSaveDraft(draftData)
    } finally {
      setIsDraftSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
        <p className="mt-2 text-gray-600">Help us match you with the perfect job opportunities</p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Personal Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                {...register('fullName')}
                error={errors.fullName?.message}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                {...register('mobile')}
                error={errors.mobile?.message}
                placeholder="Enter your mobile number"
              />
            </div>
          </div>
        </div>

        {/* Job Preferences */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Job Preferences</h2>
          
          {/* Job Titles */}
          <div className="space-y-4">
            <div>
              <Label>Job Title Preferences *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  ref={jobTitleInputRef}
                  placeholder="Add job title (e.g., Software Engineer)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (jobTitleInputRef.current?.value) {
                        addJobTitle(jobTitleInputRef.current.value)
                        jobTitleInputRef.current.value = ''
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (jobTitleInputRef.current?.value) {
                      addJobTitle(jobTitleInputRef.current.value)
                      jobTitleInputRef.current.value = ''
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {jobTitlePrefs.map((title, index) => (
                  <span
                    key={index}
                    className="bg-primary-100 text-primary-800 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                  >
                    {title}
                    <button
                      type="button"
                      onClick={() => removeJobTitle(index)}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {errors.jobTitlePrefs && (
                <p className="text-sm text-red-600 mt-1">{errors.jobTitlePrefs.message}</p>
              )}
            </div>

            {/* Employment Types */}
            <div>
              <Label>Employment Types *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'REMOTE'].map((type) => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={employmentTypes.includes(type as any)}
                      onChange={() => toggleEmploymentType(type)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">{type.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
              {errors.employmentTypes && (
                <p className="text-sm text-red-600 mt-1">{errors.employmentTypes.message}</p>
              )}
            </div>

            {/* Locations */}
            <div>
              <Label>Preferred Locations *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  ref={locationInputRef}
                  placeholder="Add location (e.g., New York, Remote)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (locationInputRef.current?.value) {
                        addLocation(locationInputRef.current.value)
                        locationInputRef.current.value = ''
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (locationInputRef.current?.value) {
                      addLocation(locationInputRef.current.value)
                      locationInputRef.current.value = ''
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {preferredLocations.map((location, index) => (
                  <span
                    key={index}
                    className="bg-primary-100 text-primary-800 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                  >
                    {location}
                    <button
                      type="button"
                      onClick={() => removeLocation(index)}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {errors.preferredLocations && (
                <p className="text-sm text-red-600 mt-1">{errors.preferredLocations.message}</p>
              )}
            </div>

            {/* Experience and Salary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  {...register('yearsExperience', { valueAsNumber: true })}
                  error={errors.yearsExperience?.message}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="salaryMin">Minimum Salary ($)</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  {...register('salaryMin', { valueAsNumber: true })}
                  error={errors.salaryMin?.message}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label htmlFor="salaryMax">Maximum Salary ($)</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  {...register('salaryMax', { valueAsNumber: true })}
                  error={errors.salaryMax?.message}
                  placeholder="100000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Skills & Expertise</h2>
          
          <SkillsAutocomplete
            selectedSkills={skills.map(skill => ({
              id: Date.now().toString() + Math.random(),
              name: skill.name,
              category: 'Technical', // Default category for profile skills
              proficiency: skill.proficiency.charAt(0) + skill.proficiency.slice(1).toLowerCase() as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
            }))}
            onSkillsChange={(newSkills) => {
              // Convert SkillsAutocomplete format back to ProfileForm format
              const convertedSkills = newSkills.map(skill => ({
                name: skill.name,
                proficiency: skill.proficiency.toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT',
                yearsUsed: 0 // Default value since SkillsAutocomplete doesn't track years
              }))
              setSkills(convertedSkills)
            }}
            placeholder="Search and add your skills (e.g., JavaScript, Python, Project Management)..."
          />
        </div>

        {/* Resume Builder */}
        <ResumeBuilderSection />

        {/* External Profiles */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">External Profiles</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
              <Input
                id="linkedinUrl"
                {...register('linkedinUrl')}
                error={errors.linkedinUrl?.message}
                placeholder="https://linkedin.com/in/your-profile"
              />
            </div>
            <div>
              <Label htmlFor="indeedProfile">Indeed Profile</Label>
              <Input
                id="indeedProfile"
                {...register('indeedProfile')}
                error={errors.indeedProfile?.message}
                placeholder="Indeed profile username or URL"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          {onSaveDraft && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleDraftSave}
              isLoading={isDraftSaving}
            >
              Save as Draft
            </Button>
          )}
          <Button type="submit" isLoading={isLoading}>
            Complete Profile
          </Button>
        </div>
      </form>
    </div>
  )
}