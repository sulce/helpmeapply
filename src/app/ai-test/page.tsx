'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { JobMatchTester } from '@/components/ai/JobMatchTester'
import { ResumeCustomizationTester } from '@/components/ai/ResumeCustomizationTester'
import { Button } from '@/components/ui/Button'

export default function AITestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'job-match' | 'resume-customization'>('job-match')

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  return (
    <Sidebar>
      <div className="p-3 lg:p-4">
        <div className="max-w-6xl">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">AI System Testing</h1>
            <p className="mt-2 text-gray-600">
              Test the AI job matching and resume customization features
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg p-1 shadow-sm border">
              <Button
                variant={activeTab === 'job-match' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('job-match')}
                className="mr-1"
              >
                Job Matching
              </Button>
              <Button
                variant={activeTab === 'resume-customization' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('resume-customization')}
              >
                Resume Customization
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'job-match' && <JobMatchTester />}
          {activeTab === 'resume-customization' && <ResumeCustomizationTester />}
        </div>
      </div>
    </Sidebar>
  )
}