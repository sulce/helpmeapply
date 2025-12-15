import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateStructuredResumePDF } from '@/lib/structuredPdfGenerator'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { resumeData, userId, forceRegenerate } = await req.json()

    console.log('PDF Generation Request:', {
      hasResumeData: !!resumeData,
      userId,
      forceRegenerate,
      resumeDataKeys: resumeData ? Object.keys(resumeData) : 'none',
      contactInfo: resumeData?.contactInfo,
      hasExistingPdfUrl: !!resumeData?.lastPdfUrl
    })

    if (!resumeData) {
      return NextResponse.json(
        { error: 'Resume data is required' },
        { status: 400 }
      )
    }

    if (!resumeData.contactInfo || !resumeData.contactInfo.fullName) {
      return NextResponse.json(
        { error: 'Contact information with full name is required' },
        { status: 400 }
      )
    }

    // Ensure we don't use any cached/existing PDF URLs when force regenerating
    const cleanResumeData = forceRegenerate ? 
      { ...resumeData, lastPdfUrl: undefined } : 
      resumeData

    console.log('Generating PDF with clean data:', {
      forceRegenerate,
      removedLastPdfUrl: forceRegenerate && !!resumeData.lastPdfUrl
    })

    // Generate PDF from structured data
    const pdfUrl = await generateStructuredResumePDF(cleanResumeData, session.user.id)

    return NextResponse.json({
      success: true,
      pdfUrl,
      message: 'PDF generated successfully'
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}