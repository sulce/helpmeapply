import { NextRequest, NextResponse } from 'next/server'
import { withSubscription } from '@/lib/billing'
import { structuredResumeCustomizer } from '@/lib/structuredResumeCustomizer'

export const POST = withSubscription(async (req: NextRequest, { user }) => {
  try {
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
      user.id
    )

    console.log('Customization completed, PDF URL:', customizationResult.customizedPdfUrl)

    // Save the customized materials for future reference (critical for manual application workflow)
    if (jobId && jobId !== 'preview') {
      try {
        const { prisma } = await import('@/lib/db')
        
        console.log('Saving customized materials for future manual application...')
        
        // Save to CustomizedResume table for easy retrieval
        await prisma.customizedResume.create({
          data: {
            userId: user.id,
            jobId: jobId,
            jobTitle: jobTitle,
            company: jobCompany || 'Company',
            originalResumeUrl: customizationResult.customizedPdfUrl, // Same as customized for preview
            customizedResumeUrl: customizationResult.customizedPdfUrl,
            customizedContent: JSON.stringify(cleanResumeData),
            customizationData: JSON.stringify({
              customizationNotes: customizationResult.customizationNotes,
              keywordMatches: customizationResult.keywordMatches,
              matchScore: customizationResult.matchScore,
              customizedAt: new Date().toISOString()
            }),
            keywordMatches: JSON.stringify(customizationResult.keywordMatches),
            matchScore: customizationResult.matchScore
          }
        })
        
        console.log('Customized materials saved successfully for job:', jobId)
      } catch (saveError) {
        console.error('Failed to save customized materials (non-critical):', saveError)
        // Don't fail the response if saving fails - customization still worked
      }
    }

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
})