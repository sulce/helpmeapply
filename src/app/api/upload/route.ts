import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadFile, deleteFile, validateFileType, validateFileSize, getServiceStatus } from '@/lib/fileUpload'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type and size
    if (!validateFileType(file)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.' },
        { status: 400 }
      )
    }

    if (!validateFileSize(file)) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Check if user already has a resume and delete it
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { resumeUrl: true }
    })

    if (existingProfile?.resumeUrl) {
      try {
        await deleteFile(existingProfile.resumeUrl)
      } catch (error) {
        console.warn('Failed to delete existing resume:', error)
      }
    }

    // Upload using new service (Cloudinary first, S3 fallback)
    const uploadResult = await uploadFile({
      buffer,
      fileName: file.name,
      contentType: file.type,
      userId: session.user.id
    })

    // Update user profile with resume URL only
    // Job title will be extracted during resume import process for better accuracy
    console.log(`💾 [VALIDATION] Storing resume URL, job title will be extracted during import process`)
    
    await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: { 
        resumeUrl: uploadResult.fileUrl
      },
      create: {
        userId: session.user.id,
        fullName: session.user.name || '',
        email: session.user.email || '',
        jobTitlePrefs: JSON.stringify([]),
        preferredLocations: JSON.stringify([]),
        employmentTypes: JSON.stringify([]),
        resumeUrl: uploadResult.fileUrl,
        preferencesSource: 'RESUME'
      },
    })

    return NextResponse.json({
      message: `File uploaded successfully using ${uploadResult.provider}`,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      provider: uploadResult.provider,
      note: 'Job title will be extracted during resume import process'
    })

  } catch (error) {
    console.error('Upload error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload file'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('JSON')) {
        errorMessage = 'File upload processing error. Please try again.'
        statusCode = 422
      } else if (error.message.includes('Cloudinary') || error.message.includes('S3')) {
        errorMessage = 'File storage error. Please try again in a moment.'
        statusCode = 503
      } else if (error.message.includes('Invalid') || error.message.includes('validation')) {
        errorMessage = error.message
        statusCode = 400
      } else {
        errorMessage = 'Upload failed: ' + error.message
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: statusCode }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { resumeUrl: true }
    })

    if (!profile?.resumeUrl) {
      return NextResponse.json(
        { error: 'No resume found' },
        { status: 404 }
      )
    }

    // Delete using new service (handles both Cloudinary and S3)
    await deleteFile(profile.resumeUrl)

    // Update profile to remove resume URL
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: { resumeUrl: null },
    })

    return NextResponse.json({
      message: 'Resume deleted successfully',
    })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}