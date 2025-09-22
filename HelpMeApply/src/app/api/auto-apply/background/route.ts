import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { backgroundJobManager } from '@/lib/backgroundJobs'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await backgroundJobManager.initialize()
    
    return NextResponse.json({
      success: true,
      message: 'Background job manager initialized'
    })
  } catch (error) {
    console.error('Error initializing background jobs:', error)
    return NextResponse.json(
      { error: 'Failed to initialize background jobs' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await backgroundJobManager.getJobStats()
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting background job stats:', error)
    return NextResponse.json(
      { error: 'Failed to get job stats' },
      { status: 500 }
    )
  }
}