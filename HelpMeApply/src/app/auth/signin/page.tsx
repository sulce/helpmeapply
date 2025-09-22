'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacySignInRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the correct login page
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    </div>
  )
}