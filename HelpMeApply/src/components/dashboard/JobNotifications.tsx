'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Eye, 
  MapPin, 
  DollarSign, 
  Building2, 
  Clock,
  Star,
  FileText
} from 'lucide-react'

interface JobNotification {
  id: string
  jobId: string
  matchScore: number
  status: 'PENDING' | 'VIEWED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'APPLIED'
  message: string
  customizedResume?: string
  coverLetter?: string
  applicationData?: string
  expiresAt?: string
  viewedAt?: string
  respondedAt?: string
  createdAt: string
  job: {
    id: string
    title: string
    company: string
    location?: string
    salaryRange?: string
    employmentType?: string
    url?: string
  }
}

interface ApplicationReview {
  id: string
  jobId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'EXPIRED'
  matchScore: number
  aiRecommendation: string
  customizedResume?: string
  coverLetter: string
  expiresAt: string
  createdAt: string
  job: {
    id: string
    title: string
    company: string
    location?: string
    salaryRange?: string
    description?: string
    url?: string
  }
}

export function JobNotifications() {
  const [notifications, setNotifications] = useState<JobNotification[]>([])
  const [reviews, setReviews] = useState<ApplicationReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'notifications' | 'reviews'>('reviews')

  useEffect(() => {
    fetchNotifications()
    fetchReviews()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews')
      if (response.ok) {
        const data = await response.json()
        setReviews(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsViewed = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'mark_viewed' }),
      })

      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notificationId 
            ? { ...n, status: 'VIEWED' as const, viewedAt: new Date().toISOString() }
            : n
        ))
      }
    } catch (error) {
      console.error('Error marking notification as viewed:', error)
    }
  }

  const approveApplication = async (reviewId: string, userNotes?: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userNotes }),
      })

      if (response.ok) {
        await fetchReviews()
        await fetchNotifications()
      }
    } catch (error) {
      console.error('Error approving application:', error)
    }
  }

  const rejectApplication = async (reviewId: string, userNotes?: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userNotes }),
      })

      if (response.ok) {
        await fetchReviews()
      }
    } catch (error) {
      console.error('Error rejecting application:', error)
    }
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800'
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-blue-100 text-blue-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'APPLIED':
        return 'bg-purple-100 text-purple-800'
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffMs = expires.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Expired'
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24)
      return `${days}d ${diffHours % 24}h remaining`
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m remaining`
    } else {
      return `${diffMinutes}m remaining`
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Job Notifications</h2>
        
        <div className="flex space-x-2">
          <Button
            variant={selectedTab === 'reviews' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('reviews')}
            className="text-sm"
          >
            <Check className="h-4 w-4 mr-2" />
            Pending Reviews ({reviews.filter(r => r.status === 'PENDING').length})
          </Button>
          <Button
            variant={selectedTab === 'notifications' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('notifications')}
            className="text-sm"
          >
            <Bell className="h-4 w-4 mr-2" />
            All Notifications ({notifications.length})
          </Button>
        </div>
      </div>

      {selectedTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <Card className="p-8 text-center">
              <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Reviews</h3>
              <p className="text-gray-600">
                You don&apos;t have any job applications waiting for your review.
              </p>
            </Card>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {review.job.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-gray-600 mt-1">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1" />
                          {review.job.company}
                        </div>
                        {review.job.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {review.job.location}
                          </div>
                        )}
                        {review.job.salaryRange && (
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {review.job.salaryRange}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={getMatchScoreColor(review.matchScore)}>
                        <Star className="h-3 w-3 mr-1" />
                        {Math.round(review.matchScore * 100)}% match
                      </Badge>
                      <Badge className={getStatusColor(review.status)}>
                        {review.status}
                      </Badge>
                    </div>
                  </div>

                  {/* AI Recommendation */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">AI Recommendation</h4>
                    <p className="text-blue-800">{review.aiRecommendation}</p>
                  </div>

                  {/* Job Description Preview */}
                  {review.job.description && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Job Description</h4>
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {review.job.description.substring(0, 200)}...
                      </p>
                    </div>
                  )}

                  {/* Cover Letter Preview */}
                  {review.coverLetter && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Generated Cover Letter</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
                        {review.coverLetter}
                      </div>
                    </div>
                  )}

                  {/* Customized Resume */}
                  {review.customizedResume && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Customized Resume</h4>
                      <div className="flex items-center text-sm text-blue-600">
                        <FileText className="h-4 w-4 mr-1" />
                        Resume tailored for this position
                      </div>
                    </div>
                  )}

                  {/* Time Remaining */}
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatTimeRemaining(review.expiresAt)}
                  </div>

                  {/* Actions */}
                  {review.status === 'PENDING' && (
                    <div className="flex items-center space-x-3 pt-4 border-t">
                      <Button
                        onClick={() => approveApplication(review.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve & Apply
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => rejectApplication(review.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      {review.job.url && (
                        <Button
                          variant="ghost"
                          onClick={() => window.open(review.job.url, '_blank')}
                        >
                          View Job
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {selectedTab === 'notifications' && (
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card className="p-8 text-center">
              <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
              <p className="text-gray-600">
                You don&apos;t have any job notifications yet.
              </p>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`p-6 ${notification.status === 'PENDING' ? 'border-blue-200 bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getMatchScoreColor(notification.matchScore)}>
                        {Math.round(notification.matchScore * 100)}% match
                      </Badge>
                      <Badge className={getStatusColor(notification.status)}>
                        {notification.status}
                      </Badge>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {notification.job.title} at {notification.job.company}
                    </h3>
                    
                    <p className="text-gray-600 mb-3">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {notification.job.location && (
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {notification.job.location}
                        </span>
                      )}
                      {notification.job.salaryRange && (
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {notification.job.salaryRange}
                        </span>
                      )}
                      <span>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {notification.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsViewed(notification.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}