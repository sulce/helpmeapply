'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  Clock, 
  Play, 
  CheckCircle, 
  XCircle, 
  Pause,
  Eye,
  Trash2,
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface InterviewSession {
  id: string
  jobTitle: string
  company: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
  currentQuestion: number
  totalQuestions: number
  overallScore?: number
  createdAt: string
  completedAt?: string
}

interface InterviewHistoryProps {
  applicationId?: string // If provided, show only sessions for this application
}

export function InterviewHistory({ applicationId }: InterviewHistoryProps) {
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingSession, setDeletingSession] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchInterviewSessions()
  }, [applicationId])

  const fetchInterviewSessions = async () => {
    try {
      const url = applicationId 
        ? `/api/interview/sessions?applicationId=${applicationId}`
        : '/api/interview/sessions'
      
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setSessions(data.data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching interview sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this interview session? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingSession(sessionId)
      
      const response = await fetch(`/api/interview/session/${sessionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSessions(prev => prev.filter(session => session.id !== sessionId))
      } else {
        throw new Error('Failed to delete session')
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete interview session. Please try again.')
    } finally {
      setDeletingSession(null)
    }
  }

  const resumeSession = (sessionId: string) => {
    router.push(`/interview/${sessionId}`)
  }

  const viewSession = (sessionId: string) => {
    router.push(`/interview/${sessionId}?view=true`)
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed' }
      case 'IN_PROGRESS':
        return { icon: Play, color: 'text-blue-600', bg: 'bg-blue-50', label: 'In Progress' }
      case 'PAUSED':
        return { icon: Pause, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Paused' }
      case 'CANCELLED':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Cancelled' }
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Unknown' }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getProgress = (session: InterviewSession) => {
    return Math.round((session.currentQuestion / session.totalQuestions) * 100)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Interview Practice Sessions</h3>
        <div className="text-center py-8">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No interview sessions yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            {applicationId 
              ? 'Start practicing for this specific job application.'
              : 'Start practicing interviews for your job applications.'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Interview Practice Sessions ({sessions.length})
        </h3>

        <div className="space-y-4">
          {sessions.map((session) => {
            const statusConfig = getStatusConfig(session.status)
            const StatusIcon = statusConfig.icon
            const progress = getProgress(session)
            
            return (
              <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {session.jobTitle}
                      </h4>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </div>
                      {session.overallScore && (
                        <div className="flex items-center space-x-1">
                          <BarChart3 className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-600">
                            {Math.round(session.overallScore * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-2">{session.company}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Started {formatDate(session.createdAt)}</span>
                      </div>
                      {session.completedAt && (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4" />
                          <span>Completed {formatDate(session.completedAt)}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {session.currentQuestion} of {session.totalQuestions} questions
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            session.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {session.status === 'IN_PROGRESS' || session.status === 'PAUSED' ? (
                      <Button
                        size="sm"
                        onClick={() => resumeSession(session.id)}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {session.status === 'PAUSED' ? 'Resume' : 'Continue'}
                      </Button>
                    ) : session.status === 'COMPLETED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewSession(session.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSession(session.id)}
                      disabled={deletingSession === session.id}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}