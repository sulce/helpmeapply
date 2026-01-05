'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ApplicationMaterialsModal } from '@/components/applications/ApplicationMaterialsModal'
import { 
  ExternalLink, 
  Calendar, 
  Building, 
  MapPin, 
  DollarSign, 
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  MessageSquare,
  Play,
  Mic
} from 'lucide-react'

interface CustomizedResumeInfo {
  id: string
  customizedResumeUrl?: string
  matchScore?: number
  createdAt: string
}

interface Application {
  id: string
  jobTitle: string
  company: string
  location?: string
  salaryRange?: string
  status: 'APPLIED' | 'REVIEWING' | 'INTERVIEW_SCHEDULED' | 'INTERVIEWED' | 'OFFER_RECEIVED' | 'REJECTED' | 'WITHDRAWN'
  appliedAt: string
  matchScore?: number
  jobUrl?: string
  source?: string
  notes?: string
  coverLetter?: string
  customizedResumeUrl?: string
  resumeCustomizationData?: string
  customizedResumes?: CustomizedResumeInfo[]
}

interface ApplicationsData {
  applications: Application[]
  total: number
  stats: Record<string, number>
}

const statusConfig = {
  APPLIED: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Applied' },
  REVIEWING: { icon: Eye, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Under Review' },
  INTERVIEW_SCHEDULED: { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Interview Scheduled' },
  INTERVIEWED: { icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Interviewed' },
  OFFER_RECEIVED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Offer Received' },
  REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
  WITHDRAWN: { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Withdrawn' },
}

export function ApplicationsList() {
  const router = useRouter()
  const [applications, setApplications] = useState<ApplicationsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showCoverLetter, setShowCoverLetter] = useState<string | null>(null)
  const [startingInterview, setStartingInterview] = useState<string | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [selectedStatus])

  const fetchApplications = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus)
      }
      params.append('limit', '20')

      const response = await fetch(`/api/applications?${params}`)
      if (response.ok) {
        const data = await response.json()
        setApplications(data)
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchApplications() // Refresh the list
      }
    } catch (error) {
      console.error('Error updating application:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const startInterviewSession = async (applicationId: string) => {
    try {
      setStartingInterview(applicationId)
      
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to start interview session')
      }

      const data = await response.json()
      
      // Redirect to interview page
      router.push(`/interview/${data.data.sessionId}`)
      
    } catch (error) {
      console.error('Error starting interview:', error)
      alert('Failed to start interview session. Please try again.')
    } finally {
      setStartingInterview(null)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!applications || applications.applications.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Your Applications
        </h3>
        <div className="text-center py-8">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No applications yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            The AI assistant hasn&apos;t applied to any jobs yet. Test the system at the AI Test page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Your Applications ({applications.total})
          </h3>
          
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="all">All Applications</option>
            <option value="APPLIED">Applied</option>
            <option value="REVIEWING">Under Review</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="INTERVIEWED">Interviewed</option>
            <option value="OFFER_RECEIVED">Offers</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {applications.applications.map((app) => {
            const StatusIcon = statusConfig[app.status].icon
            const statusClass = statusConfig[app.status]
            
            return (
              <div key={app.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{app.jobTitle}</h4>
                      {app.matchScore && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span className={`text-sm font-medium ${getMatchScoreColor(app.matchScore)}`}>
                            {Math.round(app.matchScore * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Building className="h-4 w-4" />
                        <span>{app.company}</span>
                      </div>
                      {app.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{app.location}</span>
                        </div>
                      )}
                      {app.salaryRange && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{app.salaryRange}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Applied {formatDate(app.appliedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass.bg} ${statusClass.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusClass.label}
                      </div>
                      
                      {(app.resumeCustomizationData || (app.customizedResumes && app.customizedResumes.length > 0)) && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          Custom Resume
                        </span>
                      )}
                      
                      {app.coverLetter && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Cover Letter
                        </span>
                      )}
                      
                      {app.source && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          via {app.source}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {/* Practice Interview Button - Only show for applied jobs */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startInterviewSession(app.id)}
                      disabled={startingInterview === app.id}
                      className="text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300"
                    >
                      {startingInterview === app.id ? (
                        <Play className="h-4 w-4 mr-1 animate-pulse" />
                      ) : (
                        <Mic className="h-4 w-4 mr-1" />
                      )}
                      {startingInterview === app.id ? 'Starting...' : 'Practice Interview'}
                    </Button>
                    
                    {(app.resumeCustomizationData || app.customizedResumeUrl || (app.customizedResumes && app.customizedResumes.length > 0) || app.coverLetter) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedApplication(app)}
                        className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Materials
                      </Button>
                    )}
                    
                    {app.jobUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(app.jobUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}

                    <select
                      value={app.status}
                      onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                      className="text-xs rounded border-gray-300"
                    >
                      <option value="APPLIED">Applied</option>
                      <option value="REVIEWING">Under Review</option>
                      <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                      <option value="INTERVIEWED">Interviewed</option>
                      <option value="OFFER_RECEIVED">Offer Received</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="WITHDRAWN">Withdrawn</option>
                    </select>
                  </div>
                </div>


                {/* Notes */}
                {app.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Notes:</span> {app.notes}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {applications.total > applications.applications.length && (
          <div className="mt-6 text-center">
            <Button variant="outline">
              Load More Applications
            </Button>
          </div>
        )}

        {/* Application Materials Modal */}
        <ApplicationMaterialsModal
          application={selectedApplication}
          isOpen={!!selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />
      </div>
    </div>
  )
}