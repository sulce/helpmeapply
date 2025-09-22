'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'

interface MatchResult {
  matchScore: number
  reasons: string[]
  concerns: string[]
  recommendation: string
}

interface ApplicationResult {
  matchResult: MatchResult
  coverLetter: string
  shouldApply: boolean
  applied: boolean
  application: any
  analysis: {
    passedThreshold: boolean
    threshold: number
    autoApplyEnabled: boolean
  }
}

export function JobMatchTester() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ApplicationResult | null>(null)
  const [error, setError] = useState('')
  
  const [jobData, setJobData] = useState({
    title: 'Senior Frontend Developer',
    company: 'TechCorp Inc',
    description: 'We are looking for a Senior Frontend Developer to join our team. You will be responsible for building modern web applications using React, TypeScript, and other cutting-edge technologies.',
    requirements: ['React', 'TypeScript', '5+ years experience', 'Node.js'],
    location: 'San Francisco, CA',
    salaryRange: '$120,000 - $150,000',
    employmentType: 'FULL_TIME',
    jobUrl: 'https://example.com/job/123',
    source: 'linkedin',
    sourceJobId: 'linkedin-123',
  })
  
  const [settings, setSettings] = useState({
    autoApply: false,
    minMatchScore: 0.7,
  })

  const handleAnalyze = async () => {
    setIsLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/ai/apply-to-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: jobData,
          autoApply: settings.autoApply,
          minMatchScore: settings.minMatchScore,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">AI Job Matching Tester</h2>
        
        {/* Job Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={jobData.title}
                onChange={(e) => setJobData({ ...jobData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={jobData.company}
                onChange={(e) => setJobData({ ...jobData, company: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Job Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={jobData.description}
              onChange={(e) => setJobData({ ...jobData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={jobData.location}
                onChange={(e) => setJobData({ ...jobData, location: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="salary">Salary Range</Label>
              <Input
                id="salary"
                value={jobData.salaryRange}
                onChange={(e) => setJobData({ ...jobData, salaryRange: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="employmentType">Employment Type</Label>
              <Select
                id="employmentType"
                value={jobData.employmentType}
                onChange={(e) => setJobData({ ...jobData, employmentType: e.target.value })}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="FREELANCE">Freelance</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="REMOTE">Remote</option>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="requirements">Requirements (comma-separated)</Label>
            <Input
              id="requirements"
              value={jobData.requirements.join(', ')}
              onChange={(e) => setJobData({ 
                ...jobData, 
                requirements: e.target.value.split(',').map(r => r.trim()).filter(r => r) 
              })}
            />
          </div>

          {/* AI Settings */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">AI Application Settings</h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoApply}
                  onChange={(e) => setSettings({ ...settings, autoApply: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Auto-apply if match score is high enough</span>
              </label>
              <div className="flex items-center space-x-2">
                <Label htmlFor="threshold" className="text-sm">Min Score:</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.minMatchScore}
                  onChange={(e) => setSettings({ ...settings, minMatchScore: parseFloat(e.target.value) })}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="mt-6">
          <Button onClick={handleAnalyze} isLoading={isLoading}>
            Analyze Job Match & Generate Application
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
          
          {/* Match Score */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Match Score</span>
              <span className={`text-lg font-bold ${
                result.matchResult.matchScore >= 0.8 ? 'text-green-600' :
                result.matchResult.matchScore >= 0.6 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.round(result.matchResult.matchScore * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  result.matchResult.matchScore >= 0.8 ? 'bg-green-500' :
                  result.matchResult.matchScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${result.matchResult.matchScore * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Recommendation: <span className="font-medium">{result.matchResult.recommendation}</span>
            </p>
          </div>

          {/* Application Status */}
          <div className="mb-6 p-4 rounded-lg bg-gray-50">
            <h4 className="font-medium mb-2">Application Status</h4>
            <div className="space-y-1 text-sm">
              <p>Auto-apply enabled: <span className="font-medium">{result.analysis.autoApplyEnabled ? 'Yes' : 'No'}</span></p>
              <p>Passed threshold ({result.analysis.threshold}): <span className="font-medium">{result.analysis.passedThreshold ? 'Yes' : 'No'}</span></p>
              <p>Should apply: <span className="font-medium">{result.shouldApply ? 'Yes' : 'No'}</span></p>
              <p>Actually applied: <span className={`font-medium ${result.applied ? 'text-green-600' : 'text-gray-600'}`}>
                {result.applied ? 'Yes' : 'No'}
              </span></p>
            </div>
          </div>

          {/* Reasons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-medium text-green-700 mb-2">Match Reasons</h4>
              <ul className="space-y-1">
                {result.matchResult.reasons.map((reason, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-orange-700 mb-2">Concerns</h4>
              <ul className="space-y-1">
                {result.matchResult.concerns.map((concern, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="text-orange-500 mr-2">⚠</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Cover Letter */}
          <div>
            <h4 className="font-medium mb-2">Generated Cover Letter</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                {result.coverLetter}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}