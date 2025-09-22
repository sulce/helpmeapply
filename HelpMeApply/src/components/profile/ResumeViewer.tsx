'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Download, Eye, Trash2 } from 'lucide-react'

interface ResumeViewerProps {
  resumeUrl: string
  fileName?: string
  onDelete?: () => void
  className?: string
}

export function ResumeViewer({ 
  resumeUrl, 
  fileName = 'Resume', 
  onDelete,
  className 
}: ResumeViewerProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = resumeUrl
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleView = () => {
    window.open(resumeUrl, '_blank')
  }

  const handleDelete = async () => {
    if (!onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete()
    } catch (error) {
      console.error('Error deleting resume:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getFileType = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf':
        return 'PDF'
      case 'doc':
      case 'docx':
        return 'Word Document'
      case 'txt':
        return 'Text File'
      default:
        return 'Document'
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{fileName}</p>
            <p className="text-xs text-gray-500">{getFileType(resumeUrl)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleView}
            className="flex items-center space-x-1"
          >
            <Eye className="w-4 h-4" />
            <span>View</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </Button>
          
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}