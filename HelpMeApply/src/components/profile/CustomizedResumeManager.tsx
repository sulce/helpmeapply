'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CustomizedResumeViewer } from './CustomizedResumeViewer'
import { 
  FileText, 
  Search, 
  Filter,
  Calendar,
  Building,
  Star,
  Download,
  Trash2,
  Plus
} from 'lucide-react'

interface CustomizedResume {
  id: string
  jobTitle: string
  company: string
  customizedContent: string
  customizationNotes: string[]
  keywordMatches: string[]
  suggestedImprovements: string[]
  matchScore?: number
  originalResumeUrl: string
  customizedResumeUrl?: string
  createdAt: string
  applicationId?: string
}

interface CustomizedResumeManagerProps {
  userId: string
  onCreateNew?: () => void
}

export function CustomizedResumeManager({ userId, onCreateNew }: CustomizedResumeManagerProps) {
  const [resumes, setResumes] = useState<CustomizedResume[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedResume, setSelectedResume] = useState<CustomizedResume | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'company'>('date')
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'high-score'>('all')

  useEffect(() => {
    fetchCustomizedResumes()
  }, [userId])

  const fetchCustomizedResumes = async () => {
    try {
      const response = await fetch(`/api/resume/customized?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setResumes(data.resumes || [])
      }
    } catch (error) {
      console.error('Error fetching customized resumes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this customized resume?')) {
      return
    }

    try {
      const response = await fetch(`/api/resume/customized/${resumeId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setResumes(resumes.filter(r => r.id !== resumeId))
        if (selectedResume?.id === resumeId) {
          setSelectedResume(null)
        }
      }
    } catch (error) {
      console.error('Error deleting resume:', error)
    }
  }

  const handleDownloadResume = async (resume: CustomizedResume) => {
    // In a real implementation, this would download the PDF
    const blob = new Blob([resume.customizedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resume.company}_${resume.jobTitle}_Resume.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRegenerateResume = async (resume: CustomizedResume) => {
    // This would trigger the resume customization API again
    console.log('Regenerating resume for:', resume.jobTitle, 'at', resume.company)
  }

  // Filter and sort resumes
  const filteredAndSortedResumes = resumes
    .filter(resume => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          resume.jobTitle.toLowerCase().includes(query) ||
          resume.company.toLowerCase().includes(query) ||
          resume.keywordMatches.some(keyword => keyword.toLowerCase().includes(query))
        )
      }
      return true
    })
    .filter(resume => {
      if (filterBy === 'recent') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return new Date(resume.createdAt) > weekAgo
      }
      if (filterBy === 'high-score') {
        return resume.matchScore && resume.matchScore >= 0.8
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (sortBy === 'score') {
        return (b.matchScore || 0) - (a.matchScore || 0)
      }
      if (sortBy === 'company') {
        return a.company.localeCompare(b.company)
      }
      return 0
    })

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (selectedResume) {
    return (
      <div>
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setSelectedResume(null)}
          >
            ← Back to All Resumes
          </Button>
        </div>
        <CustomizedResumeViewer
          customizedResume={selectedResume}
          onDownload={() => handleDownloadResume(selectedResume)}
          onRegenerateResume={() => handleRegenerateResume(selectedResume)}
          showComparison={true}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customized Resumes</h2>
          <p className="text-gray-600">
            Manage your AI-customized resumes for different job applications
          </p>
        </div>
        
        {onCreateNew && (
          <Button onClick={onCreateNew} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by job title, company, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date">Sort by Date</option>
            <option value="score">Sort by Match Score</option>
            <option value="company">Sort by Company</option>
          </select>

          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Resumes</option>
            <option value="recent">Recent (7 days)</option>
            <option value="high-score">High Score (80%+)</option>
          </select>
        </div>
      </Card>

      {/* Resume List */}
      {filteredAndSortedResumes.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {resumes.length === 0 ? 'No Customized Resumes Yet' : 'No Results Found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {resumes.length === 0 
              ? 'Start applying to jobs and AI will create customized resumes for each application.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          {onCreateNew && resumes.length === 0 && (
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Resume
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAndSortedResumes.map((resume) => (
            <Card key={resume.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {resume.jobTitle}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Building className="h-4 w-4 mr-1" />
                    {resume.company}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(resume.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {resume.matchScore && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className={`text-sm font-medium ${getMatchScoreColor(resume.matchScore)}`}>
                      {Math.round(resume.matchScore * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-600">{resume.keywordMatches.length}</p>
                  <p className="text-xs text-gray-500">Keywords</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600">{resume.customizationNotes.length}</p>
                  <p className="text-xs text-gray-500">Changes</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-yellow-600">{resume.suggestedImprovements.length}</p>
                  <p className="text-xs text-gray-500">Tips</p>
                </div>
              </div>

              {/* Keywords Preview */}
              {resume.keywordMatches.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {resume.keywordMatches.slice(0, 6).map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                    {resume.keywordMatches.length > 6 && (
                      <span className="text-xs text-gray-500">
                        +{resume.keywordMatches.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  onClick={() => setSelectedResume(resume)}
                >
                  View Details
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadResume(resume)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteResume(resume.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {resumes.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{resumes.length}</p>
              <p className="text-sm text-gray-600">Total Resumes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {resumes.filter(r => r.matchScore && r.matchScore >= 0.8).length}
              </p>
              <p className="text-sm text-gray-600">High Match (80%+)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {Math.round(resumes.reduce((sum, r) => sum + (r.matchScore || 0), 0) / resumes.length * 100)}%
              </p>
              <p className="text-sm text-gray-600">Avg Match Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {new Set(resumes.map(r => r.company)).size}
              </p>
              <p className="text-sm text-gray-600">Unique Companies</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}