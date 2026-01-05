'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { CustomizedResumeViewer } from '@/components/profile/CustomizedResumeViewer'
import { FileText, Play, AlertCircle } from 'lucide-react'

export function ResumeCustomizationTester() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    jobTitle: 'Senior Software Engineer',
    company: 'TechCorp Inc',
    jobDescription: `We are looking for a Senior Software Engineer to join our team. The ideal candidate will have experience with React, Node.js, and cloud technologies. You will be responsible for building scalable web applications and working closely with cross-functional teams.

Key Requirements:
- 5+ years of software development experience
- Proficiency in JavaScript, TypeScript, React
- Experience with Node.js and Express
- Knowledge of cloud platforms (AWS, Azure, or GCP)
- Strong problem-solving skills
- Excellent communication abilities

Nice to have:
- Experience with microservices architecture
- Knowledge of Docker and Kubernetes
- Database design experience (PostgreSQL, MongoDB)
- CI/CD pipeline experience`,
    requirements: 'React, Node.js, TypeScript, JavaScript, AWS, Problem Solving, Communication',
    location: 'San Francisco, CA',
    salaryRange: '120,000 - 180,000',
  })

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/ai/customize-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription: {
            title: formData.jobTitle,
            company: formData.company,
            description: formData.jobDescription,
            requirements: formData.requirements.split(',').map(r => r.trim()).filter(Boolean),
            location: formData.location,
            salaryRange: formData.salaryRange,
          },
          saveToDatabase: false, // Just for testing
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to customize resume')
      }

      const data = await response.json()
      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    
    const blob = new Blob([result.customizedResume], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formData.company}_${formData.jobTitle}_Resume.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Resume Customization Tester</h2>
            <p className="text-gray-600">Test AI resume customization with different job descriptions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="Enter job title..."
              />
            </div>

            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Enter company name..."
              />
            </div>

            <div>
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter location..."
              />
            </div>

            <div>
              <Label htmlFor="salaryRange">Salary Range (Optional)</Label>
              <Input
                id="salaryRange"
                value={formData.salaryRange}
                onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                placeholder="Enter salary range..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                value={formData.jobDescription}
                onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                rows={8}
                placeholder="Enter the complete job description..."
                className="resize-none"
              />
            </div>

            <div>
              <Label htmlFor="requirements">Key Requirements (comma-separated)</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                rows={3}
                placeholder="React, Node.js, TypeScript, etc..."
                className="resize-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center space-y-4">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.jobTitle || !formData.company || !formData.jobDescription}
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Customizing Resume...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Customize Resume
              </>
            )}
          </Button>

          <Button
            onClick={async () => {
              setIsLoading(true)
              setError(null)
              try {
                const response = await fetch('/api/test/document-extraction')
                const data = await response.json()
                if (data.success) {
                  alert(`Document extraction test successful!\n\nFile: ${data.data.extraction.fileName}\nType: ${data.data.extraction.fileType}\nWords: ${data.data.extraction.wordCount}\nSections: ${data.data.extraction.sectionsFound}`)
                } else {
                  setError(data.error || 'Test failed')
                }
              } catch (err) {
                setError('Failed to test document extraction')
              } finally {
                setIsLoading(false)
              }
            }}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Test Resume Extraction
          </Button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}
      </Card>

      {result && (
        <CustomizedResumeViewer
          customizedResume={{
            jobTitle: formData.jobTitle,
            company: formData.company,
            customizedContent: result.customizedResume,
            customizationNotes: result.customizationNotes,
            keywordMatches: result.keywordMatches,
            suggestedImprovements: result.suggestedImprovements,
            originalResumeUrl: result.originalResumeUrl,
            customizedPdfUrl: result.customizedPdfUrl,
            originalText: result.originalText,
            extractedSections: result.extractedSections,
          }}
          onDownload={handleDownload}
          showComparison={true}
        />
      )}
    </div>
  )
}