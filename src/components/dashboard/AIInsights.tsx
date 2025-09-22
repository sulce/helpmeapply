'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Brain, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  BarChart3,
  Clock,
  DollarSign,
  Users,
  Calendar,
  BookOpen,
  Award,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

interface AIInsightsData {
  summary: {
    totalInsights: number
    marketTrend: 'up' | 'down' | 'stable'
    personalTrend: 'improving' | 'declining' | 'stable'
    urgentActions: string[]
    weeklyScore: number
  }
  insights: {
    market: string[]
    performance: string[]
    skills: string[]
    strategy: string[]
    salary: string[]
  }
  weeklyGoals: {
    apply: number
    follow_up: number
    networking: number
    skill_development: number
  }
  trends: {
    applicationVolume: { direction: string; change: number }
    responseRate: { direction: string; change: number }
    marketActivity: { direction: string; change: number }
    salaryTrends: { trend: string; averageChange: number }
  }
  recommendations: string[]
}

export function AIInsights() {
  const [data, setData] = useState<AIInsightsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/analytics/insights')
      if (response.ok) {
        const insightsData = await response.json()
        setData(insightsData)
      } else {
        setError('Failed to load AI insights')
      }
    } catch (err) {
      setError('Error fetching AI insights')
      console.error('AI Insights fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
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
        <div className="text-red-600 mb-4">⚠️ {error || 'No insights available'}</div>
        <Button onClick={fetchInsights} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up' || trend === 'improving') return <ArrowUp className="h-4 w-4 text-green-600" />
    if (trend === 'down' || trend === 'declining') return <ArrowDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getTrendColor = (trend: string) => {
    if (trend === 'up' || trend === 'improving') return 'text-green-600'
    if (trend === 'down' || trend === 'declining') return 'text-red-600'
    return 'text-gray-600'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="h-6 w-6 text-purple-600 mr-3" />
            AI Job Search Insights
          </h2>
          <p className="text-gray-600">Personalized recommendations powered by AI</p>
        </div>
        <Button onClick={fetchInsights} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.weeklyScore}
              </div>
              <div className="text-sm text-gray-600">Weekly Score</div>
            </div>
            <div className="flex items-center">
              <Target className={`h-5 w-5 ${getScoreColor(data.summary.weeklyScore)}`} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-gray-900 flex items-center">
                Market
                {getTrendIcon(data.summary.marketTrend)}
              </div>
              <div className={`text-sm ${getTrendColor(data.summary.marketTrend)}`}>
                {data.summary.marketTrend.charAt(0).toUpperCase() + data.summary.marketTrend.slice(1)}
              </div>
            </div>
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-gray-900 flex items-center">
                Personal
                {getTrendIcon(data.summary.personalTrend)}
              </div>
              <div className={`text-sm ${getTrendColor(data.summary.personalTrend)}`}>
                {data.summary.personalTrend.charAt(0).toUpperCase() + data.summary.personalTrend.slice(1)}
              </div>
            </div>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.urgentActions.length}
              </div>
              <div className="text-sm text-gray-600">Urgent Actions</div>
            </div>
            <div className="flex items-center">
              <AlertTriangle className={`h-5 w-5 ${data.summary.urgentActions.length > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Weekly Goals */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          This Week&apos;s Goals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {data.weeklyGoals.apply}
            </div>
            <div className="text-sm text-gray-600 mb-2">Applications to Send</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {data.weeklyGoals.follow_up}
            </div>
            <div className="text-sm text-gray-600 mb-2">Follow-ups</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {data.weeklyGoals.networking}
            </div>
            <div className="text-sm text-gray-600 mb-2">Networking Contacts</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {data.weeklyGoals.skill_development}
            </div>
            <div className="text-sm text-gray-600 mb-2">Skills to Learn</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Market Insights */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
            Market Intelligence
          </h3>
          <div className="space-y-4">
            {data.insights.market.length > 0 ? (
              data.insights.market.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {insight}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">
                Enable job scanning to unlock market insights
              </div>
            )}
          </div>
        </Card>

        {/* Performance Insights */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Target className="h-5 w-5 text-green-600 mr-2" />
            Performance Analysis
          </h3>
          <div className="space-y-4">
            {data.insights.performance.length > 0 ? (
              data.insights.performance.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {insight}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">
                Apply to jobs to see performance insights
              </div>
            )}
          </div>
        </Card>

        {/* Skills Gap Analysis */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <BookOpen className="h-5 w-5 text-purple-600 mr-2" />
            Skills Gap Analysis
          </h3>
          <div className="space-y-4">
            {data.insights.skills.length > 0 ? (
              data.insights.skills.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {insight}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">
                Complete your profile to see skill recommendations
              </div>
            )}
          </div>
        </Card>

        {/* Strategy Recommendations */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Zap className="h-5 w-5 text-yellow-600 mr-2" />
            Strategy Insights
          </h3>
          <div className="space-y-4">
            {data.insights.strategy.length > 0 ? (
              data.insights.strategy.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {insight}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">
                More application data needed for strategy insights
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Urgent Actions */}
      {data.summary.urgentActions.length > 0 && (
        <Card className="p-6 border-l-4 border-red-500 bg-red-50">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Urgent Actions Required
          </h3>
          <div className="space-y-3">
            {data.summary.urgentActions.map((action, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{action}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Salary Insights */}
      {data.insights.salary.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
            Salary Market Analysis
          </h3>
          <div className="space-y-4">
            {data.insights.salary.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {insight}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center">
          <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
          AI Recommendations
        </h3>
        <div className="space-y-4">
          {data.recommendations.length > 0 ? (
            data.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Brain className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                <div className="text-sm text-blue-900 leading-relaxed">
                  {recommendation}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 italic">
              Continue using the platform to unlock personalized AI recommendations
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}