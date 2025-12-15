import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { structuredResumeCustomizer } from '@/lib/structuredResumeCustomizer'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { jobId, jobTitle, jobCompany, jobDescription, resumeData } = await req.json()

    if (!jobTitle || !resumeData) {
      return NextResponse.json(
        { error: 'Missing job title or resume data' },
        { status: 400 }
      )
    }

    console.log('=== PREVIEW CUSTOMIZATION API ===')
    console.log('Job title:', jobTitle)
    console.log('Job company:', jobCompany)
    console.log('Job description length:', jobDescription?.length || 0)
    console.log('Resume data keys:', Object.keys(resumeData))
    console.log('Resume has lastPdfUrl:', !!resumeData.lastPdfUrl)
    
    // Remove any existing PDF URL to force fresh generation
    const cleanResumeData = { ...resumeData }
    delete cleanResumeData.lastPdfUrl
    console.log('Using clean resume data without lastPdfUrl')

    // Generate customized resume using the structured customizer
    const customizationResult = await structuredResumeCustomizer.customizeResumeForJob(
      cleanResumeData,
      {
        id: jobId || 'preview',
        title: jobTitle,
        company: jobCompany || 'Company',
        description: jobDescription || '',
        requirements: []
      },
      session.user.id
    )

    console.log('Customization completed, PDF URL:', customizationResult.customizedPdfUrl)

    return NextResponse.json({
      success: true,
      customizedPdfUrl: customizationResult.customizedPdfUrl,
      customizationNotes: customizationResult.customizationNotes,
      keywordMatches: customizationResult.keywordMatches,
      matchScore: customizationResult.matchScore
    })

  } catch (error) {
    console.error('Preview customization error:', error)
    return NextResponse.json(
      { error: 'Failed to customize resume for preview' },
      { status: 500 }
    )
  }
}