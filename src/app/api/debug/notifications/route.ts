import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    console.log('Debug - Session user ID:', session.user.id)

    // Get all notifications for debugging
    const notifications = await prisma.jobNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        job: {
          select: { id: true, title: true, company: true }
        }
      }
    })

    console.log('Debug - All notifications:')
    notifications.forEach((notif: any) => {
      console.log(`  - ID: ${notif.id}, UserId: ${notif.userId}, JobId: ${notif.jobId}, Job: ${notif.job?.title}`)
    })

    // Get notifications for this specific user
    const userNotifications = await prisma.jobNotification.findMany({
      where: { userId: session.user.id },
      include: {
        job: {
          select: { id: true, title: true, company: true }
        }
      }
    })

    console.log('Debug - User notifications count:', userNotifications.length)

    return NextResponse.json({
      success: true,
      data: {
        sessionUserId: session.user.id,
        allNotifications: notifications,
        userNotifications: userNotifications,
        userNotificationsCount: userNotifications.length
      }
    })

  } catch (error) {
    console.error('Debug notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    )
  }
}