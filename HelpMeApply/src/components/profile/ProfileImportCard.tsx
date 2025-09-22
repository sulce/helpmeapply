'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Linkedin, Briefcase, Download, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportOptions {
  linkedin: boolean
  indeed: boolean
}

export function ProfileImportCard() {
  const [availableImports, setAvailableImports] = useState<ImportOptions>({ linkedin: false, indeed: false })
  const [isLoading, setIsLoading] = useState<{ linkedin: boolean; indeed: boolean }>({ linkedin: false, indeed: false })
  const [importStatus, setImportStatus] = useState<{ linkedin?: string; indeed?: string }>({})
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkAvailableImports()
  }, [])

  const checkAvailableImports = async () => {
    try {
      const response = await fetch('/api/profile/import')
      if (response.ok) {
        const data = await response.json()
        setAvailableImports(data.availableImports)
      }
    } catch (error) {
      console.error('Error checking available imports:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleImport = async (source: 'linkedin' | 'indeed') => {
    setIsLoading(prev => ({ ...prev, [source]: true }))
    setImportStatus(prev => ({ ...prev, [source]: undefined }))

    try {
      const response = await fetch('/api/profile/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source }),
      })

      const data = await response.json()

      if (response.ok) {
        setImportStatus(prev => ({ 
          ...prev, 
          [source]: `Successfully imported profile from ${source}` 
        }))
        // Refresh the page to show updated profile data
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setImportStatus(prev => ({ 
          ...prev, 
          [source]: data.error || `Failed to import from ${source}` 
        }))
      }
    } catch (error) {
      setImportStatus(prev => ({ 
        ...prev, 
        [source]: `Error importing from ${source}` 
      }))
    } finally {
      setIsLoading(prev => ({ ...prev, [source]: false }))
    }
  }

  if (isChecking) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </Card>
    )
  }

  if (!availableImports.linkedin && !availableImports.indeed) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Download className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">Import Profile Data</h3>
          <p className="text-sm text-gray-500 mb-4">
            Connect your LinkedIn or Indeed account to import your profile information automatically.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/auth/signin'}>
              <Linkedin className="mr-2 h-4 w-4" />
              Connect LinkedIn
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/auth/signin'}>
              <Briefcase className="mr-2 h-4 w-4" />
              Connect Indeed
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Import Profile Data</h3>
          <p className="text-sm text-gray-500">
            Automatically fill your profile with data from connected accounts
          </p>
        </div>
        <Download className="h-5 w-5 text-blue-600" />
      </div>

      <div className="space-y-3">
        {availableImports.linkedin && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Linkedin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">LinkedIn</p>
                <p className="text-xs text-gray-500">Import name, headline, and location</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {importStatus.linkedin && (
                <div className="flex items-center space-x-1">
                  {importStatus.linkedin.includes('Success') ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-xs ${
                    importStatus.linkedin.includes('Success') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {importStatus.linkedin}
                  </span>
                </div>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleImport('linkedin')}
                isLoading={isLoading.linkedin}
                disabled={isLoading.linkedin || importStatus.linkedin?.includes('Success')}
              >
                {importStatus.linkedin?.includes('Success') ? 'Imported' : 'Import'}
              </Button>
            </div>
          </div>
        )}

        {availableImports.indeed && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Briefcase className="h-5 w-5 text-blue-800" />
              <div>
                <p className="text-sm font-medium text-gray-900">Indeed</p>
                <p className="text-xs text-gray-500">Import basic profile information</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {importStatus.indeed && (
                <div className="flex items-center space-x-1">
                  {importStatus.indeed.includes('Success') ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-xs ${
                    importStatus.indeed.includes('Success') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {importStatus.indeed}
                  </span>
                </div>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleImport('indeed')}
                isLoading={isLoading.indeed}
                disabled={isLoading.indeed || importStatus.indeed?.includes('Success')}
              >
                {importStatus.indeed?.includes('Success') ? 'Imported' : 'Import'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {(availableImports.linkedin || availableImports.indeed) && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 Imported data will merge with your existing profile without overwriting manual entries.
          </p>
        </div>
      )}
    </Card>
  )
}