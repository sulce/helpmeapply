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

    const { resumeData, userId } = await req.json()

    console.log('PDF Generation Request:', {
      hasResumeData: !!resumeData,
      userId,
      resumeDataKeys: resumeData ? Object.keys(resumeData) : 'none',
      contactInfo: resumeData?.contactInfo
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

    // Generate PDF from structured data
    const pdfUrl = await generateStructuredResumePDF(resumeData, session.user.id)

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