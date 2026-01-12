import { enforceSubscriptionAccess } from '@/lib/billing'

export default async function ApplicationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side subscription check - redirects to /billing?reason=expired if no access
  await enforceSubscriptionAccess()

  return <>{children}</>
}
