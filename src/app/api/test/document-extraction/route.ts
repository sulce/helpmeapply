import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { documentExtractor } from '@/lib/documentExtractor'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's current resume URL
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { resumeUrl: true, fullName: true }
    })

    if (!profile?.resumeUrl) {
      return NextResponse.json(
        { error: 'No resume found. Please upload a resume first.' },
        { status: 404 }
      )
    }

    console.log('Testing document extraction for:', profile.resumeUrl)

    // Test document extraction
    const result = await documentExtractor.testExtraction(profile.resumeUrl)

    return NextResponse.json({
      success: true,
      message: 'Document extraction test completed successfully',
      data: {
        resumeUrl: profile.resumeUrl,
        candidateName: profile.fullName,
        extraction: {
          textLength: result.text.length,
          wordCount: result.metadata.wordCount,
          charCount: result.metadata.charCount,
          fileType: result.metadata.fileType,
          fileName: result.metadata.fileName,
          pages: result.metadata.pages,
          sectionsFound: result.sections?.length || 0,
          sectionTitles: result.sections?.map(s => s.title) || [],
        },
        extractedText: result.text.substring(0, 500) + (result.text.length > 500 ? '...' : ''), // First 500 chars
        sections: result.sections?.map(section => ({
          title: section.title,
          contentPreview: section.content.substring(0, 200) + (section.content.length > 200 ? '...' : '')
        })) || []
      }
    })

  } catch (error) {
    console.error('Document extraction test error:', error)
    return NextResponse.json(
      { 
        error: 'Document extraction test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { fileUrl } = body

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      )
    }

    console.log('Testing document extraction for custom URL:', fileUrl)

    // Test document extraction with custom URL
    const result = await documentExtractor.testExtraction(fileUrl)

    return NextResponse.json({
      success: true,
      message: 'Document extraction test completed successfully',
      data: {
        fileUrl,
        extraction: {
          textLength: result.text.length,
          wordCount: result.metadata.wordCount,
          charCount: result.metadata.charCount,
          fileType: result.metadata.fileType,
          fileName: result.metadata.fileName,
          pages: result.metadata.pages,
          sectionsFound: result.sections?.length || 0,
          sectionTitles: result.sections?.map(s => s.title) || [],
        },
        extractedText: result.text,
        sections: result.sections || []
      }
    })

  } catch (error) {
    console.error('Document extraction test error:', error)
    return NextResponse.json(
      { 
        error: 'Document extraction test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}