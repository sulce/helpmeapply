'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Award, 
  RefreshCw,
  BarChart3,
  Users,
  Zap,
  Lightbulb
} from 'lucide-react'

interface PerformanceData {
  summary: {
    totalApplications: number
    recentApplications: number
    applicationToInterviewRate: number
    interviewToOfferRate: number
    overallSuccessRate: number
    averageResponseTime: number | null
  }
  conversionFunnel: {
    applied: number
    reviewing: number
    interviewed: number
    offers: number
  }
  statusBreakdown: Array<{
    status: string
    count: number
    percentage: number
  }>
  weeklyTrend: Array<{
    week: string
    applications: number
    responses: number
  }>
  matchScoreAnalysis: Array<{
    range: string
    applications: number
    interviews: number
    offers: number
  }>
  industryPerformance: Array<{
    company: string
    applications: number
    averageMatchScore: number | null
  }>
  insights: string[]
}

export function PerformanceAnalytics() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/analytics/performance')
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      } else {
        setError('Failed to load analytics')
      }
    } catch (err) {
      setError('Error fetching analytics')
      console.error('Analytics fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-200 rounded-lg h-64"></div>
          <div className="bg-gray-200 rounded-lg h-64"></div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">⚠️ {error || 'No data available'}</div>
        <Button onClick={fetchAnalytics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  return (
    <div className="space-y-8">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
          <p className="text-gray-600">Track your job search success metrics</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.applicationToInterviewRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Interview Rate</div>
              <div className="text-xs text-gray-500">
                {data.conversionFunnel.interviewed} / {data.conversionFunnel.applied} applications
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Award className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.interviewToOfferRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Offer Rate</div>
              <div className="text-xs text-gray-500">
                {data.conversionFunnel.offers} / {data.conversionFunnel.interviewed} interviews
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.overallSuccessRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-xs text-gray-500">End-to-end conversion</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.averageResponseTime?.toFixed(0) || '--'}
              </div>
              <div className="text-sm text-gray-600">Avg Response</div>
              <div className="text-xs text-gray-500">Days to hear back</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Conversion Funnel */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Application Funnel</h3>
          <div className="space-y-4">
            {[
              { stage: 'Applied', count: data.conversionFunnel.applied, color: 'bg-blue-500' },
              { stage: 'Under Review', count: data.conversionFunnel.reviewing, color: 'bg-yellow-500' },
              { stage: 'Interviewed', count: data.conversionFunnel.interviewed, color: 'bg-purple-500' },
              { stage: 'Offers Received', count: data.conversionFunnel.offers, color: 'bg-green-500' }
            ].map((stage, index) => {
              const percentage = data.conversionFunnel.applied > 0 
                ? (stage.count / data.conversionFunnel.applied * 100) 
                : 0
              
              return (
                <div key={stage.stage} className="flex items-center space-x-3">
                  <div className="w-24 text-sm text-gray-600">{stage.stage}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div 
                      className={`${stage.color} h-6 rounded-full flex items-center justify-end pr-2 text-white text-sm font-medium`}
                      style={{ width: `${Math.max(percentage, 8)}%` }}
                    >
                      {stage.count > 0 && percentage > 15 && `${stage.count}`}
                    </div>
                  </div>
                  <div className="w-16 text-sm text-gray-900 font-medium">
                    {stage.count} ({percentage.toFixed(0)}%)
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Weekly Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Weekly Activity</h3>
          <div className="space-y-4">
            {data.weeklyTrend.map((week) => (
              <div key={week.week} className="flex items-center justify-between">
                <div className="text-sm text-gray-600">{week.week}</div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm">
                    <span className="font-medium text-blue-600">{week.applications}</span>
                    <span className="text-gray-500 ml-1">applied</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-green-600">{week.responses}</span>
                    <span className="text-gray-500 ml-1">responses</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Match Score Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Performance by Match Score</h3>
          <div className="space-y-3">
            {data.matchScoreAnalysis.map((range) => {
              const interviewRate = range.applications > 0 
                ? (range.interviews / range.applications * 100) 
                : 0
              
              return (
                <div key={range.range} className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 w-16">{range.range}</div>
                  <div className="flex-1 mx-4">
                    <div className="text-xs text-gray-500">
                      {range.applications} apps → {range.interviews} interviews → {range.offers} offers
                    </div>
                  </div>
                  <div className="text-sm font-medium text-purple-600">
                    {interviewRate.toFixed(0)}%
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* AI Insights */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
            AI Insights
          </h3>
          <div className="space-y-3">
            {data.insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="text-sm text-gray-700 leading-relaxed">
                  {insight}
                </div>
              </div>
            ))}
            {data.insights.length === 0 && (
              <div className="text-sm text-gray-500 italic">
                Apply to more jobs to unlock personalized insights
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Application Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.statusBreakdown.map((status) => (
            <div key={status.status} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{status.count}</div>
              <div className="text-sm text-gray-600">{formatStatus(status.status)}</div>
              <div className="text-xs text-gray-500">{status.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}