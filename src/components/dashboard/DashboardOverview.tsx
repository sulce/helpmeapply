'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Search, 
  FileText, 
  Settings, 
  Zap, 
  RefreshCw,
  Target,
  TrendingUp,
  Award,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  Building,
  MapPin,
  Calendar,
  ExternalLink
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DashboardOverviewProps {
  profile: any
  jobStats: any
  applications: any
  autoApplySettings: any
  isScanning: boolean
  startJobScan: () => void
}

export function DashboardOverview({ 
  profile, 
  jobStats, 
  applications, 
  autoApplySettings,
  isScanning,
  startJobScan
}: DashboardOverviewProps) {
  const router = useRouter()
  const [performanceSummary, setPerformanceSummary] = useState<any>(null)
  const [resumeSummary, setResumeSummary] = useState<any>(null)
  const [aiSummary, setAISummary] = useState<any>(null)
  const [recentApplications, setRecentApplications] = useState<any[]>([])

  // Fetch key metrics summaries
  const fetchSummaries = useCallback(async () => {
    try {
      const [performanceRes, resumeRes, aiRes, applicationsRes] = await Promise.all([
        fetch('/api/analytics/performance').catch(() => Response.json({ error: 'Failed' }, { status: 500 })),
        fetch('/api/analytics/resume').catch(() => Response.json({ error: 'Failed' }, { status: 500 })),
        fetch('/api/analytics/insights').catch(() => Response.json({ error: 'Failed' }, { status: 500 })),
        fetch('/api/applications?limit=5').catch(() => Response.json({ error: 'Failed' }, { status: 500 }))
      ])

      if (performanceRes.ok) {
        const data = await performanceRes.json()
        setPerformanceSummary(data.summary)
      }

      if (resumeRes.ok) {
        const data = await resumeRes.json()
        setResumeSummary(data.hasResume ? data.overview : null)
      }

      if (aiRes.ok) {
        const data = await aiRes.json()
        console.log('AI Insights Data:', data) // Debug log
        setAISummary(data.summary)
      } else {
        console.error('AI Insights API failed:', aiRes.status, aiRes.statusText)
      }

      if (applicationsRes.ok) {
        const data = await applicationsRes.json()
        setRecentApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Error fetching summaries:', error)
    }
  }, [])

  useEffect(() => {
    fetchSummaries()
  }, [fetchSummaries])

  const getTrendIcon = (trend: string | undefined) => {
    if (trend === 'up' || trend === 'improving') return <ArrowUp className="h-4 w-4 text-green-600" />
    if (trend === 'down' || trend === 'declining') return <ArrowDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  return (
    <div className="space-y-8">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Job Matches */}
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {jobStats ? jobStats.newJobs : '--'}
              </div>
              <div className="text-sm text-gray-600">New Jobs</div>
              <div className="text-xs text-gray-500 mt-1">Last 24 hours</div>
            </div>
          </div>
          <div className="mt-4">
            <Button 
              size="sm" 
              onClick={() => router.push('/jobs')}
              className="w-full"
            >
              View All Jobs
            </Button>
          </div>
        </Card>

        {/* Applications */}
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {applications?.total || 0}
              </div>
              <div className="text-sm text-gray-600">Applications</div>
            </div>
          </div>
          <div className="mt-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => router.push('/applications')}
              className="w-full"
            >
              View All
            </Button>
          </div>
        </Card>

        {/* Performance Score */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {performanceSummary?.applicationToInterviewRate?.toFixed(0) || '--'}%
                </div>
                <div className="text-sm text-gray-600">Interview Rate</div>
              </div>
            </div>
            {aiSummary?.personalTrend && getTrendIcon(aiSummary.personalTrend)}
          </div>
        </Card>

        {/* Weekly Score */}
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Award className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {aiSummary?.weeklyScore !== undefined ? aiSummary.weeklyScore : '--'}
              </div>
              <div className="text-sm text-gray-600">Weekly Score</div>
              <div className="text-xs text-gray-500 mt-1">
                {aiSummary?.weeklyScore !== undefined ? 
                  'Activity + Responses + Opportunities' : 
                  'Apply to jobs to generate score'
                }
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Key Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Search Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button 
              onClick={startJobScan}
              isLoading={isScanning}
              disabled={isScanning}
              className="w-full justify-start"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isScanning ? 'Scanning Jobs...' : 'Scan for New Jobs'}
            </Button>
            
            <Button 
              onClick={() => router.push('/resume-builder')}
              variant="outline"
              className="w-full justify-start"
            >
              <FileText className="h-4 w-4 mr-2" />
              Edit Resume
            </Button>
            
            <Button 
              onClick={() => router.push('/profile')}
              variant="outline"
              className="w-full justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              Update Profile
            </Button>
          </div>
        </Card>

        {/* Recent Performance */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Performance Snapshot</h3>
            <Button 
              onClick={fetchSummaries}
              variant="ghost" 
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {/* Interview Rate */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Interview Rate</div>
              <div className="text-sm font-medium">
                {performanceSummary?.applicationToInterviewRate?.toFixed(1) || '--'}%
              </div>
            </div>
            
            {/* Offer Rate */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Offer Rate</div>
              <div className="text-sm font-medium">
                {performanceSummary?.interviewToOfferRate?.toFixed(1) || '--'}%
              </div>
            </div>
            
            {/* Resume Score */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Resume Score</div>
              <div className="text-sm font-medium">
                {resumeSummary?.completenessScore || '--'}%
              </div>
            </div>
            
            {/* Response Time */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Avg Response Time</div>
              <div className="text-sm font-medium">
                {performanceSummary?.averageResponseTime ? 
                  `${performanceSummary.averageResponseTime.toFixed(0)} days` : 
                  '--'
                }
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Insights Preview */}
      {aiSummary?.urgentActions && aiSummary.urgentActions.length > 0 && (
        <Card className="p-6 border-l-4 border-orange-500 bg-orange-50">
          <h3 className="text-lg font-semibold mb-3 text-orange-800">Action Items</h3>
          <div className="space-y-2">
            {aiSummary.urgentActions.slice(0, 2).map((action: string, index: number) => (
              <div key={index} className="flex items-center text-sm text-orange-700">
                <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 flex-shrink-0"></div>
                {action}
              </div>
            ))}
          </div>
          {aiSummary.urgentActions.length > 2 && (
            <div className="text-sm text-orange-600 mt-3">
              +{aiSummary.urgentActions.length - 2} more actions
            </div>
          )}
        </Card>
      )}

      {/* Recent Applications */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Applications</h3>
          <Button 
            onClick={() => router.push('/applications')}
            variant="outline" 
            size="sm"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>
        
        {recentApplications.length > 0 ? (
          <div className="space-y-3">
            {recentApplications.map((app: any, index: number) => (
              <div key={app.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{app.jobTitle}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{app.company}</span>
                    {app.location && (
                      <>
                        <MapPin className="h-3 w-3" />
                        <span>{app.location}</span>
                      </>
                    )}
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(app.appliedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div>
                  <Badge 
                    variant={app.status === 'APPLIED' ? 'secondary' : 
                            app.status === 'INTERVIEW_SCHEDULED' ? 'default' :
                            app.status === 'OFFER_RECEIVED' ? 'default' : 'secondary'}
                    className={app.status === 'OFFER_RECEIVED' ? 'bg-green-100 text-green-800' :
                              app.status === 'INTERVIEW_SCHEDULED' ? 'bg-blue-100 text-blue-800' : ''}
                  >
                    {app.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No applications yet</p>
            <p className="text-xs text-gray-400 mt-1">Start applying to jobs to see them here</p>
          </div>
        )}
      </Card>

      {/* Auto-Apply Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">AI Auto-Apply</h3>
            <p className="text-sm text-gray-600 mt-1">
              {autoApplySettings?.isEnabled ? 
                `Automatically applying to jobs with ${Math.round((autoApplySettings?.minMatchScore || 0.75) * 100)}%+ match score` :
                'Automated job applications are currently disabled'
              }
            </p>
            {autoApplySettings?.isEnabled && autoApplySettings?.applicationsToday && (
              <p className="text-xs text-blue-600 mt-1">
                {autoApplySettings.applicationsToday} applications sent today
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={autoApplySettings?.isEnabled ? "default" : "secondary"}>
              {autoApplySettings?.isEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button 
            onClick={() => router.push('/profile#auto-apply')}
            variant="outline" 
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Settings
          </Button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Enable Auto-Apply</span>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/auto-apply/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      isEnabled: !autoApplySettings?.isEnabled 
                    })
                  })
                  if (response.ok) {
                    // Refresh the page to get updated settings
                    window.location.reload()
                  } else {
                    const error = await response.json()
                    alert(`Error: ${error.message || 'Failed to update settings'}`)
                  }
                } catch (error) {
                  console.error('Error toggling auto-apply:', error)
                  alert('Failed to update auto-apply settings')
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                autoApplySettings?.isEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoApplySettings?.isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}