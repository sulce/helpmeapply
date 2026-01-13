'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { JobsViewer } from '@/components/dashboard/JobsViewer'

export default function JobsPage() {
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
      <div className="p-4 md:pt-4 md:pr-4 md:pb-4 lg:pt-6 lg:pr-6 lg:pb-6">
        <JobsViewer />
      </div>
    </Sidebar>
  )
}