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


    // Update user profile with resume URL
    await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: { resumeUrl: uploadResult.fileUrl },
      create: {
        userId: session.user.id,
        fullName: session.user.name || '',
        email: session.user.email || '',
        jobTitlePrefs: JSON.stringify([]),
        preferredLocations: JSON.stringify([]),
        employmentTypes: JSON.stringify([]),
        resumeUrl: uploadResult.fileUrl,
      },
    })

    return NextResponse.json({
      message: `File uploaded successfully using ${uploadResult.provider}`,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      provider: uploadResult.provider,
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
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