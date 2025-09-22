'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  FileText, 
  RefreshCw, 
  TrendingUp, 
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  Edit,
  Globe,
  Camera,
  BarChart3,
  Lightbulb
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ResumeAnalyticsData {
  hasResume: boolean
  overview: {
    completenessScore: number
    atsScore: number
    lastUpdated: string
    templateRegion: string
    totalApplications: number
    responseRate: number
    interviewRate: number
  }
  sectionScores: {
    contactInfo: number
    summary: number
    experience: number
    education: number
    skills: number
    certifications: number
    projects: number
    languages: number
  }
  templatePerformance: {
    region: string
    includesPhoto: boolean
    applicationsWithResume: number
    averageMatchScore: number
  }
  platformPerformance: Array<{
    platform: string
    applications: number
    averageMatchScore: number | null
  }>
  recommendations: string[]
  recentActivity: {
    applicationsLast30Days: number
    averageMatchScore: number
    topPerformingPlatforms: Array<{
      platform: string
      applications: number
      averageMatchScore: number | null
    }>
  }
}

export function ResumeAnalytics() {
  const [data, setData] = useState<ResumeAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/analytics/resume')
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      } else {
        setError('Failed to load resume analytics')
      }
    } catch (err) {
      setError('Error fetching resume analytics')
      console.error('Resume analytics fetch error:', err)
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
        <div className="bg-gray-200 rounded-lg h-48"></div>
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

  if (!data.hasResume) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Resume Found</h3>
        <p className="text-gray-600 mb-6">Create a structured resume to see detailed performance analytics</p>
        <Button onClick={() => router.push('/resume-builder')}>
          Create Resume
        </Button>
      </Card>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />
    return <AlertCircle className="h-5 w-5 text-yellow-600" />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resume Performance</h2>
          <p className="text-gray-600">Track how your resume performs with employers</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={() => router.push('/resume-builder')} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Resume
          </Button>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {data.overview.completenessScore}%
              </div>
              <div className="text-sm text-gray-600">Completeness Score</div>
            </div>
            <div className="flex items-center">
              {getScoreIcon(data.overview.completenessScore)}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500">
              Based on resume sections and content depth
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {data.overview.atsScore}%
              </div>
              <div className="text-sm text-gray-600">ATS Compatibility</div>
            </div>
            <div className="flex items-center">
              <Zap className={`h-5 w-5 ${getScoreColor(data.overview.atsScore)}`} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500">
              Applicant Tracking System optimization
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {data.overview.responseRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Response Rate</div>
            </div>
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500">
              {data.overview.totalApplications} applications sent
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section Scores */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Section Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(data.sectionScores).map(([section, score]) => {
              const sectionName = section.charAt(0).toUpperCase() + section.slice(1).replace(/([A-Z])/g, ' $1')
              const percentage = typeof score === 'number' ? score : 0
              
              return (
                <div key={section} className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">{sectionName}</div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          percentage >= 80 ? 'bg-green-500' : 
                          percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      ></div>
                    </div>
                    <div className={`text-sm font-medium ${getScoreColor(percentage)}`}>
                      {percentage}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Template Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Template Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Region</span>
              </div>
              <Badge variant="secondary">
                {data.templatePerformance.region} Template
              </Badge>
            </div>
            
            {data.templatePerformance.includesPhoto && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Photo</span>
                </div>
                <Badge variant="secondary">Included</Badge>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Applications Sent</div>
              <div className="text-sm font-medium text-gray-900">
                {data.templatePerformance.applicationsWithResume}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Avg Match Score</div>
              <div className="text-sm font-medium text-gray-900">
                {Math.round(data.templatePerformance.averageMatchScore * 100)}%
              </div>
            </div>
          </div>
        </Card>

        {/* Platform Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Platform Performance</h3>
          <div className="space-y-3">
            {data.platformPerformance.length > 0 ? (
              data.platformPerformance.map((platform) => (
                <div key={platform.platform} className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">{platform.platform}</div>
                  <div className="flex items-center space-x-3">
                    <div className="text-xs text-gray-500">
                      {platform.applications} apps
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {platform.averageMatchScore ? `${platform.averageMatchScore}%` : '--'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">
                Apply to jobs to see platform performance
              </div>
            )}
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
            Recommendations
          </h3>
          <div className="space-y-3">
            {data.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="text-sm text-gray-700 leading-relaxed">
                  {recommendation}
                </div>
              </div>
            ))}
            {data.recommendations.length === 0 && (
              <div className="text-sm text-gray-500 italic">
                Your resume looks great! Keep applying to generate insights.
              </div>
            )}
          </div>
          
          {data.recommendations.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Button 
                onClick={() => router.push('/resume-builder')} 
                size="sm" 
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Improve Resume
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Recent Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.recentActivity.applicationsLast30Days}
            </div>
            <div className="text-sm text-gray-600">Applications (30 days)</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.recentActivity.averageMatchScore}%
            </div>
            <div className="text-sm text-gray-600">Average Match Score</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {data.recentActivity.topPerformingPlatforms.length}
            </div>
            <div className="text-sm text-gray-600">Active Platforms</div>
          </div>
        </div>
      </Card>
    </div>
  )
}