'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  ExternalLink, 
  Building, 
  MapPin, 
  DollarSign, 
  Star,
  Clock,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertTriangle,
  Zap,
  FileText,
  Send,
  Bot,
  Edit
} from 'lucide-react'
import { JobApplicationModal } from '@/components/jobs/JobApplicationModal'
import { SmartApplyModal } from '@/components/jobs/SmartApplyModal'
import { getJobSourceInfo } from '@/lib/jobSourceDetector'

interface Job {
  id: string
  title: string
  company: string
  description?: string
  url?: string
  location?: string
  salaryRange?: string
  employmentType?: string
  source: string
  sourceInfo?: any
  matchScore?: number
  isProcessed: boolean
  appliedTo: boolean
  createdAt: string
  canAutoApply?: boolean
}

interface ScanStatus {
  isScanning: boolean
  lastScan?: string
  pendingJobs: number
  processingJobs: number
  failedJobs: number
}

export function JobsViewer() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, hasMore: false, totalCount: 0 })
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    isScanning: false,
    pendingJobs: 0,
    processingJobs: 0,
    failedJobs: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'available' | 'applied'>('new')
  const [isManualScanning, setIsManualScanning] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedSmartApplyJob, setSelectedSmartApplyJob] = useState<Job | null>(null)
  const [userResumeData, setUserResumeData] = useState<any>(null)

  useEffect(() => {
    // Add a small delay to ensure session is ready
    const timer = setTimeout(() => {
      fetchJobs()
      fetchScanStatus()
      loadUserResumeData()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Refetch jobs when filter changes
  useEffect(() => {
    fetchJobs(1) // Reset to page 1 when filter changes
  }, [filter])

  const fetchJobs = async (page = 1) => {
    try {
      const response = await fetch(`/api/jobs?page=${page}&limit=20&filter=${filter}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setJobs(data.data?.jobs || [])
        setPagination(data.data?.pagination || { currentPage: 1, totalPages: 0, hasMore: false, totalCount: 0 })
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchScanStatus = async () => {
    try {
      const response = await fetch('/api/jobs/queue/status')
      if (response.ok) {
        const data = await response.json()
        setScanStatus(data.data || {
          isScanning: false,
          pendingJobs: 0,
          processingJobs: 0,
          failedJobs: 0
        })
      }
    } catch (error) {
      console.error('Error fetching scan status:', error)
    }
  }

  const loadUserResumeData = async () => {
    try {
      // Try to load user's structured resume data
      const response = await fetch('/api/resume/structured', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setUserResumeData(data.resumeData)
      } else {
        // No structured resume exists - user needs to use resume builder
        console.log('No structured resume found - user should use resume builder')
        setUserResumeData(null)
      }
    } catch (error) {
      console.error('Error loading resume data:', error)
    }
  }

  const startManualScan = async () => {
    setIsManualScanning(true)
    try {
      const response = await fetch('/api/jobs/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        // Refresh jobs and status after scan
        setTimeout(() => {
          fetchJobs()
          fetchScanStatus()
        }, 1000)
        
        alert(`Scan completed! ${data.data.message}`)
      } else {
        const errorData = await response.json()
        alert(`Scan failed: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error starting manual scan:', error)
      alert('Failed to start job scan')
    } finally {
      setIsManualScanning(false)
    }
  }

  // Removed old applyToJob function - now using JobApplicationModal

  // No client-side filtering needed - filtering happens at API level
  const filteredJobs = jobs

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getMatchScoreBadge = (score?: number) => {
    if (!score) return 'outline'
    if (score >= 0.8) return 'default'
    if (score >= 0.6) return 'secondary'
    return 'outline'
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with scan controls */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Job Opportunities</h2>
            <p className="text-sm text-gray-600">AI-found jobs matching your profile</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={startManualScan}
              isLoading={isManualScanning}
              size="sm"
              className="flex items-center"
            >
              <Search className="h-4 w-4 mr-2" />
              {isManualScanning ? 'Scanning...' : 'Scan Now'}
            </Button>
            
            <Button
              onClick={() => fetchJobs()}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Scan Status */}
        {(scanStatus.pendingJobs > 0 || scanStatus.processingJobs > 0) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Job scanning in progress: {scanStatus.processingJobs} processing, {scanStatus.pendingJobs} queued
              </span>
            </div>
          </div>
        )}

        {scanStatus.failedJobs > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {scanStatus.failedJobs} job scans failed. Check your API configuration.
              </span>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'new', label: 'New (24h)' },
            { key: 'available', label: 'Available' },
            { key: 'applied', label: 'Applied' },
            { key: 'all', label: 'All' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                filter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} {filter === tab.key && pagination.totalCount > 0 && `(${pagination.totalCount})`}
            </button>
          ))}
        </div>
      </Card>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="mx-auto h-8 w-8 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'new' ? 'No New Jobs Found' : 
             filter === 'available' ? 'No Available Jobs' :
             filter === 'applied' ? 'No Applications Yet' : 'No Jobs Available'}
          </h3>
          <p className="text-gray-600 mb-4">
            {filter === 'new' ? 
              'No jobs found in the last 24 hours. Try running a manual scan.' :
              filter === 'available' ?
              'All jobs have been applied to. Run a scan to find new opportunities.' :
              'Complete your profile and enable auto-apply to start finding opportunities.'}
          </p>
          {(filter === 'new' || filter === 'available') && (
            <Button onClick={startManualScan} isLoading={isManualScanning}>
              <Search className="h-4 w-4 mr-2" />
              Find Jobs Now
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map(job => (
            <Card key={job.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    {job.matchScore && (
                      <Badge variant={getMatchScoreBadge(job.matchScore)}>
                        <Star className="h-3 w-3 mr-1" />
                        {Math.round(job.matchScore * 100)}% Match
                      </Badge>
                    )}
                    {job.appliedTo && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Applied
                      </Badge>
                    )}
                    {(() => {
                      // Get source info for this job
                      const sourceInfo = job.sourceInfo || getJobSourceInfo(job.url || '')
                      
                      // Don't show badges for backup/mock jobs
                      if (job.source === 'backup' || job.source === 'mock') {
                        return null
                      }
                      
                      return (
                        <Badge variant="outline" className={sourceInfo.badge.color}>
                          <span className="mr-1">{sourceInfo.icon}</span>
                          {sourceInfo.badge.text}
                        </Badge>
                      )
                    })()}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-1" />
                      {job.company}
                    </div>
                    {job.location && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {job.location}
                      </div>
                    )}
                    {job.salaryRange && (
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {job.salaryRange}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {job.description && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                      {job.description.substring(0, 200)}...
                    </p>
                  )}

                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{job.employmentType}</Badge>
                    <Badge variant="outline">{job.source}</Badge>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-6">
                  {job.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(job.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Job
                    </Button>
                  )}
                  
                  {!job.appliedTo && (
                    <Button
                      size="sm"
                      onClick={() => {
                        console.log('=== JOB BUTTON CLICK DEBUG ===')
                        console.log('job.canAutoApply:', job.canAutoApply)
                        console.log('job.sourceInfo:', job.sourceInfo)
                        console.log('job.automationType:', job.automationType)
                        
                        // Route based on the job's automation capabilities
                        if (job.canAutoApply && job.automationType === 'on_site_form') {
                          // Greenhouse/Lever style automation
                          setSelectedSmartApplyJob(job)
                        } else if (job.canAutoApply && job.automationType === 'direct') {
                          // Indeed style automation - need to implement this modal
                          console.log('Direct automation job - routing to JobApplicationModal')
                          setSelectedJob(job)
                        } else {
                          // Manual application required
                          setSelectedJob(job)
                        }
                      }}
                      className="whitespace-nowrap"
                    >
                      {(() => {
                        const sourceInfo = job.sourceInfo || getJobSourceInfo(job.url || '')
                        
                        switch (sourceInfo.source) {
                          case 'INDEED':
                            return (
                              <>
                                <Bot className="h-4 w-4 mr-2" />
                                Smart Apply
                              </>
                            )
                          case 'GREENHOUSE':
                          case 'LEVER':
                            return (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                Smart Apply
                              </>
                            )
                          default:
                            return (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Apply Now
                              </>
                            )
                        }
                      })()}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} total jobs)
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchJobs(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchJobs(pagination.currentPage + 1)}
                disabled={!pagination.hasMore}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Job Application Modal */}
      <JobApplicationModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        userResumeData={userResumeData}
      />

      {/* Smart Apply Modal for Greenhouse/Lever */}
      <SmartApplyModal
        job={selectedSmartApplyJob}
        isOpen={!!selectedSmartApplyJob}
        onClose={() => setSelectedSmartApplyJob(null)}
        userProfile={userResumeData}
      />
    </div>
  )
}