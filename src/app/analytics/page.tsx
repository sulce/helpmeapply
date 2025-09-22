'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { PerformanceAnalytics } from '@/components/dashboard/PerformanceAnalytics'
import { ResumeAnalytics } from '@/components/dashboard/ResumeAnalytics'
import { AIInsights } from '@/components/dashboard/AIInsights'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { BarChart3, Target, Brain, TrendingUp } from 'lucide-react'

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Analytics</h2>
          <p className="text-gray-500">Analyzing your job search performance...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  return (
    <Sidebar>
      <div className="p-6">
        <div className="max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
              Analytics Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Track your job search performance and get AI-powered insights to improve your applications
            </p>
          </div>

          <Tabs defaultValue="performance" className="space-y-6">
            <div className="border-b border-gray-200">
              <TabsList className="w-full justify-start bg-transparent p-0 h-auto">
                <TabsTrigger 
                  value="performance" 
                  className="flex items-center space-x-2 pb-3 px-0 pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                >
                  <Target className="h-4 w-4" />
                  <span>Performance</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="resume" 
                  className="flex items-center space-x-2 pb-3 px-0 pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Resume Analytics</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="insights" 
                  className="flex items-center space-x-2 pb-3 px-0 pr-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                >
                  <Brain className="h-4 w-4" />
                  <span>AI Insights</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="performance" className="space-y-6">
              <PerformanceAnalytics />
            </TabsContent>
            
            <TabsContent value="resume" className="space-y-6">
              <ResumeAnalytics />
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-6">
              <AIInsights />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Sidebar>
  )
}