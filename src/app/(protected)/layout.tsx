import { enforceSubscriptionAccess } from '@/lib/billing'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side subscription check - redirects to /billing if no access
  await enforceSubscriptionAccess()

  return <>{children}</>
}
