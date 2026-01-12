'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { ApplicationsList } from '@/components/dashboard/ApplicationsList'

export default function ApplicationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

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
      <div className="pt-4 pr-4 pb-4 lg:pt-6 lg:pr-6 lg:pb-6">
        <div className="max-w-6xl">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Your Job Applications</h1>
            <p className="mt-2 text-gray-600">
              Track and manage all jobs the AI has applied to on your behalf
            </p>
          </div>
          <ApplicationsList />
        </div>
      </div>
    </Sidebar>
  )
}