'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ResumeEditor } from '@/components/profile/ResumeEditor'
import { Sidebar } from '@/components/ui/Sidebar'

import { type TemplateRegion } from '@/lib/regionalTemplates'

interface ResumeData {
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
  templateRegion: TemplateRegion
  includePhoto: boolean
  photoUrl?: string
  personalDetails?: any
}

export default function ResumeBuilderPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [initialData, setInitialData] = useState<Partial<ResumeData> | undefined>()
  const [isInitialDataSaved, setIsInitialDataSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user) {
      loadUserProfile()
    } else if (status === 'loading') {
      // Add a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.log('Session loading timeout, proceeding with empty data')
        setInitialData({
          contactInfo: {
            fullName: '',
            email: '',
            phone: '',
            address: '',
            linkedin: '',
            website: ''
          },
          professionalSummary: '',
          experience: [],
          education: [],
          skills: [],
          certifications: [],
          projects: [],
          languages: []
        })
        setIsLoading(false)
      }, 10000) // 10 second timeout

      return () => clearTimeout(timeout)
    }
  }, [session, status, router])

  const loadUserProfile = async () => {
    try {
      // First try to load existing structured resume
      const structuredResponse = await fetch('/api/resume/structured')
      if (structuredResponse.ok) {
        const { resumeData } = await structuredResponse.json()
        
        // Convert to the format expected by ResumeEditor
        const editorData: Partial<ResumeData> = {
          contactInfo: resumeData.contactInfo || {
            fullName: '',
            email: '',
            phone: '',
            address: '',
            linkedin: '',
            website: ''
          },
          professionalSummary: resumeData.summary || '',
          experience: resumeData.experience || [],
          education: resumeData.education || [],
          skills: resumeData.skills || [],
          certifications: resumeData.certifications || [],
          projects: resumeData.projects || [],
          languages: resumeData.languages || [],
          templateRegion: resumeData.templateRegion || 'US',
          includePhoto: resumeData.includePhoto || false,
          photoUrl: resumeData.photoUrl,
          personalDetails: resumeData.personalDetails || {}
        }
        
        console.log('Loaded existing structured resume data')
        setInitialData(editorData)
        setIsInitialDataSaved(true) // This data is already saved in the database
        return
      }

      // If no structured resume exists, fallback to profile data
      const profileResponse = await fetch('/api/profile')
      if (profileResponse.ok) {
        const profile = await profileResponse.json()
        
        // Convert profile data to resume format
        const resumeData: Partial<ResumeData> = {
          contactInfo: {
            fullName: profile.fullName || '',
            email: profile.email || session?.user?.email || '',
            phone: profile.mobile || '',
            address: profile.city && profile.state ? `${profile.city}, ${profile.state}` : '',
            linkedin: profile.linkedinUrl || '',
            website: ''
          },
          professionalSummary: '',
          experience: [],
          education: [],
          skills: profile.skills?.map((skill: any) => ({
            id: skill.id,
            name: skill.name,
            category: 'Technical',
            proficiency: skill.proficiency
          })) || [],
          certifications: [],
          projects: [],
          languages: []
        }
        
        console.log('Loaded profile data as starting point')
        setInitialData(resumeData)
        setIsInitialDataSaved(false) // Profile data isn't saved as structured resume yet
      } else {
        // No profile exists - start with basic data
        console.log('No profile found, starting with empty resume')
        setInitialData({
          contactInfo: {
            fullName: session?.user?.name || '',
            email: session?.user?.email || '',
            phone: '',
            address: '',
            linkedin: '',
            website: ''
          },
          professionalSummary: '',
          experience: [],
          education: [],
          skills: [],
          certifications: [],
          projects: [],
          languages: []
        })
        setIsInitialDataSaved(false) // Empty data isn't saved
      }
    } catch (error) {
      console.error('Error loading resume data:', error)
      // Even on error, provide empty structure so user can start
      setInitialData({
        contactInfo: {
          fullName: session?.user?.name || '',
          email: session?.user?.email || '',
          phone: '',
          address: '',
          linkedin: '',
          website: ''
        },
        professionalSummary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        projects: [],
        languages: []
      })
      setIsInitialDataSaved(false) // Error fallback data isn't saved
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (resumeData: ResumeData) => {
    try {
      // Transform the data to match the database structure
      const structuredData = {
        contactInfo: resumeData.contactInfo,
        summary: resumeData.professionalSummary,
        experience: resumeData.experience,
        education: resumeData.education,
        skills: resumeData.skills,
        certifications: resumeData.certifications,
        projects: resumeData.projects,
        achievements: [], // We can add this field later if needed
        languages: resumeData.languages,
        templateRegion: resumeData.templateRegion,
        includePhoto: resumeData.includePhoto,
        photoUrl: resumeData.photoUrl,
        personalDetails: resumeData.personalDetails,
        sectionOrder: [] // Default empty for now
      }

      const response = await fetch('/api/resume/structured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: structuredData })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Resume saved successfully! (${result.completionPercentage}% complete)`)
      } else {
        const error = await response.json()
        alert(`Error saving resume: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving resume:', error)
      alert('Error saving resume')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Resume Builder</h2>
          <p className="text-gray-500">Setting up your resume workspace...</p>
          <button 
            onClick={() => {
              console.log('Force loading complete')
              setIsLoading(false)
              setInitialData({
                contactInfo: {
                  fullName: '',
                  email: '',
                  phone: '',
                  address: '',
                  linkedin: '',
                  website: ''
                },
                professionalSummary: '',
                experience: [],
                education: [],
                skills: [],
                certifications: [],
                projects: [],
                languages: []
              })
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <Sidebar>
      <div className="p-3 lg:p-4">
        <ResumeEditor 
          userId={session.user.id}
          onSave={handleSave}
          initialData={initialData}
          isInitialDataSaved={isInitialDataSaved}
        />
      </div>
    </Sidebar>
  )
}