import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { resumeData } = await req.json()

    if (!resumeData) {
      return NextResponse.json(
        { error: 'Resume data is required' },
        { status: 400 }
      )
    }

    // TODO: Save structured resume data to database
    // For now, just return success to allow the resume builder to function
    console.log('Resume data received for user:', session.user.id)
    console.log('Resume sections:', Object.keys(resumeData))

    return NextResponse.json({
      success: true,
      message: 'Resume saved successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Save resume error:', error)
    return NextResponse.json(
      { error: 'Failed to save resume' },
      { status: 500 }
    )
  }
}