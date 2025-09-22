import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceStatus } from '@/lib/fileUpload'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const status = getServiceStatus()
    
    return NextResponse.json({
      message: 'File upload service status',
      services: status,
      priority: 'Cloudinary first, S3 fallback'
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check service status' },
      { status: 500 }
    )
  }
}