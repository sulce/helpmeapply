/**
 * Client-side subscription guard component
 * This is a fallback - primary enforcement is server-side
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SubscriptionGuardProps {
  children: React.ReactNode
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const response = await fetch('/api/billing/status')
      const data = await response.json()

      if (response.ok && data.subscription?.hasAccess) {
        setHasAccess(true)
      } else {
        router.push('/billing?reason=expired')
        return
      }
    } catch (error) {
      console.error('Subscription check failed:', error)
      router.push('/billing?reason=error')
      return
    } finally {
      setIsChecking(false)
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}
