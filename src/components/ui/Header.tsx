'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button } from './Button'
import { Logo } from './Logo'

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 sm:py-6">
          <div className="flex items-center">
            <Logo href={session ? "/dashboard" : "/"} size="md" />
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {session ? (
              <>
                <nav className="hidden md:flex space-x-4">
                  <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                    Dashboard
                  </Link>
                  <Link href="/jobs" className="text-gray-600 hover:text-gray-900">
                    Jobs
                  </Link>
                  <Link href="/applications" className="text-gray-600 hover:text-gray-900">
                    Applications
                  </Link>
                  <Link href="/profile" className="text-gray-600 hover:text-gray-900">
                    Profile
                  </Link>
                  <Link href="/faq" className="text-gray-600 hover:text-gray-900">
                    FAQ
                  </Link>
                </nav>
                <span className="hidden lg:inline text-gray-700 text-sm">Welcome, {session.user?.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-xs sm:text-sm px-2 sm:px-4"
                >
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Out</span>
                </Button>
              </>
            ) : (
              <nav className="flex space-x-2 sm:space-x-4">
                <Link href="/faq" className="text-gray-600 hover:text-gray-900 text-sm sm:text-base">
                  FAQ
                </Link>
              </nav>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}