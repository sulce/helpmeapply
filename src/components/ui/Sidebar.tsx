'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from './Button'
import { Logo } from './Logo'
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  User, 
  LogOut,
  Bot,
  BarChart3,
  Settings,
  Menu,
  X,
  CreditCard
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  if (!session) {
    return <div>{children}</div>
  }

  const menuItems = [
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
    },
    {
      href: '/jobs',
      icon: Briefcase,
      label: 'Jobs',
    },
    {
      href: '/applications',
      icon: FileText,
      label: 'Applications',
    },
    {
      href: '/profile',
      icon: User,
      label: 'Profile',
    },
    {
      href: '/ai-test',
      icon: Bot,
      label: 'AI Assistant',
    },
    {
      href: '/analytics',
      icon: BarChart3,
      label: 'Analytics',
    },
    {
      href: '/resume-builder',
      icon: Settings,
      label: 'Resume Builder',
    },
    {
      href: '/billing',
      icon: CreditCard,
      label: 'Billing',
    },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white shadow-lg"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
        // Desktop
        "hidden md:flex",
        isCollapsed ? "w-20" : "w-64",
        // Mobile
        "md:relative md:translate-x-0",
        isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full w-72",
        isMobileOpen && "flex"
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
          <div className={cn(
            "flex items-center flex-1",
            isCollapsed && "justify-center"
          )}>
            <Logo
              href="/dashboard"
              size="sm"
              showText={!isCollapsed}
              className={isCollapsed ? "justify-center" : ""}
            />
          </div>

          {/* Desktop collapse button */}
          {!isCollapsed && (
            <div className="hidden md:block">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* User info */}
        {!isCollapsed && (
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-sm">
                  {session.user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {session.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session.user?.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed user avatar */}
        {isCollapsed && (
          <div className="px-3 py-4 border-b border-gray-200 flex justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-sm">
                {session.user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50",
                  isCollapsed ? "justify-center px-2" : "space-x-3"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn(
                  "flex-shrink-0 transition-colors",
                  active ? "h-5 w-5 text-blue-600" : "h-5 w-5",
                )} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: '/' })}
            className={cn(
              "w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Sign Out</span>}
          </Button>
        </div>

        {/* Expand button for collapsed state */}
        {isCollapsed && (
          <div className="px-3 py-3 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(false)}
              className="w-full justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="Expand sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 w-full transition-all duration-300",
        isCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <main className="flex-1 overflow-auto bg-gray-50 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}