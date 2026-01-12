# Example: Converting Existing API Route to Subscription-Protected

## Before (Unprotected Route)

```typescript
// src/app/api/jobs/scan/route.ts (example conversion)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Job scanning logic here
    return NextResponse.json({ success: true })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## After (Subscription-Protected Route)

```typescript
// src/app/api/jobs/scan/route.ts (protected version)
import { NextRequest, NextResponse } from 'next/server'
import { withSubscription } from '@/lib/billing'

// Use withSubscription wrapper to enforce subscription access
export const POST = withSubscription(async (request, { user, subscription }) => {
  try {
    // user and subscription are automatically provided
    // This code only runs for users with active subscriptions
    
    console.log(`Job scan requested by user ${user.id} with ${subscription.subscriptionStatus} status`)
    
    // Job scanning logic here
    return NextResponse.json({ 
      success: true,
      message: 'Job scan started for premium user'
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
```

## Alternative: Manual Access Check

```typescript
// src/app/api/jobs/scan/route.ts (manual check version)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserSubscriptionStatus } from '@/lib/billing'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Manual subscription check
    const subscriptionStatus = await getUserSubscriptionStatus(session.user.id)
    if (!subscriptionStatus.hasAccess) {
      return NextResponse.json(
        { 
          error: 'Active subscription required',
          requiresSubscription: true,
          upgradeUrl: '/billing'
        },
        { status: 402 }
      )
    }

    // Job scanning logic here
    return NextResponse.json({ success: true })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Page-Level Protection Example

```typescript
// src/app/jobs/page.tsx (protected page)
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPageSubscriptionData } from '@/lib/billing'
import { redirect } from 'next/navigation'

export default async function JobsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  // Check subscription access
  const subscriptionData = await getPageSubscriptionData(session.user.id)
  
  if (!subscriptionData.hasAccess) {
    redirect('/billing')
  }

  // Page content for subscribed users
  return (
    <div>
      <h1>Premium Jobs Dashboard</h1>
      {/* Your protected content */}
    </div>
  )
}
```

## Client Component with Subscription Check

```typescript
// src/components/PremiumFeature.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export function PremiumFeature() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    try {
      const response = await fetch('/api/billing/status')
      if (response.ok) {
        const data = await response.json()
        setHasAccess(data.subscription.hasAccess)
      } else {
        setHasAccess(false)
      }
    } catch (error) {
      setHasAccess(false)
    }
  }

  if (hasAccess === null) {
    return <div>Loading...</div>
  }

  if (!hasAccess) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
        <p className="text-gray-600 mb-4">
          This feature requires an active subscription to access.
        </p>
        <Button onClick={() => router.push('/billing')}>
          Upgrade Now
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Premium feature content */}
      <h3>Advanced Job Matching</h3>
      {/* Feature implementation */}
    </div>
  )
}
```

## Error Response Format

When subscription check fails, return consistent error format:

```typescript
{
  "error": "Active subscription required",
  "code": "SUBSCRIPTION_REQUIRED",
  "requiresSubscription": true,
  "upgradeUrl": "/billing",
  "currentStatus": "canceled",
  "gracePeriodEnd": "2024-01-15T10:00:00Z" // if applicable
}
```

## Best Practices

1. **Use `withSubscription` wrapper** for simple route protection
2. **Manual checks** when you need custom logic or error handling
3. **Page-level redirects** for entire protected pages
4. **Client-side checks** for UI/UX but never rely on them for security
5. **Consistent error responses** across all protected endpoints
6. **Grace period handling** for payment failures
7. **Clear upgrade paths** in error responses