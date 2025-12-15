import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ResumeCustomizationService } from '@/lib/resumeCustomizationService'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { notificationId } = await req.json()

    // Get the notification and associated job and profile
    const notification = await prisma.jobNotification.findUnique({
      where: { id: notificationId },
      include: {
        job: true,
        user: {
          include: {
            profile: {
              include: {
                skills: true
              }
            }
          }
        }
      }
    })

    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Notification not found or not authorized' },
        { status: 404 }
      )
    }

    const profile = notification.user.profile
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Regenerate customized resume with new system
    const customizationService = ResumeCustomizationService.getInstance()
    
    const customizationResult = await customizationService.customizeResume({
      originalResume: {
        url: profile.resumeUrl || undefined
      },
      job: {
        title: notification.job.title,
        company: notification.job.company,
        description: notification.job.description || '',
        requirements: []
      },
      profile: {
        fullName: profile.fullName || 'User',
        skills: profile.skills?.map(s => ({
          name: s.name,
          proficiency: s.proficiency,
          yearsUsed: s.yearsUsed || 0
        })) || [],
        jobTitlePrefs: JSON.parse(profile.jobTitlePrefs || '[]'),
        yearsExperience: profile.yearsExperience || 0
      }
    }, session.user.id)

    // Update the notification with new customized resume
    await prisma.jobNotification.update({
      where: { id: notificationId },
      data: {
        customizedResume: customizationResult.customizedPdfUrl
      }
    })

    return NextResponse.json({
      success: true,
      customizedPdfUrl: customizationResult.customizedPdfUrl,
      message: 'Resume regenerated successfully'
    })

  } catch (error) {
    console.error('Regenerate resume error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate resume' },
      { status: 500 }
    )
  }
}