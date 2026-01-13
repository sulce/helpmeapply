import { Logo } from '@/components/ui/Logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="flex justify-center">
          <Logo size="lg" href="/" />
        </div>
        {children}
      </div>
    </div>
  )
}