import { NextRequest, NextResponse } from 'next/server'
import { withSubscription } from '@/lib/billing'
import { prisma } from '@/lib/db'

interface ManualApplicationUpdate {
  jobId: string
  status: 'applied' | 'need_followup' | 'not_applied'
  applicationDate?: string
  notes?: string
  referenceNumber?: string
}

export const POST = withSubscription(async (request: NextRequest, { user }) => {
  try {
    const body: ManualApplicationUpdate = await request.json()
    const { jobId, status, applicationDate, notes, referenceNumber } = body

    console.log('Manual application update:', { jobId, status, applicationDate, notes, referenceNumber })

    // Validate required fields
    if (!jobId || !status) {
      return NextResponse.json({ 
        error: 'Missing required fields: jobId and status' 
      }, { status: 400 })
    }

    // Find the job to make sure it exists
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found' 
      }, { status: 404 })
    }

    // Look for existing customized materials for this job/user combination
    console.log('Looking for existing customized materials for job:', jobId, 'user:', user.id)
    
    const [existingCustomizedResume, existingJobNotification] = await Promise.all([
      // Check CustomizedResume table for materials
      prisma.customizedResume.findFirst({
        where: {
          userId: user.id,
          jobId: jobId
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Check JobNotification table which might have customized materials
      prisma.jobNotification.findFirst({
        where: {
          userId: user.id,
          jobId: jobId
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    console.log('Found customized materials:', {
      customizedResume: existingCustomizedResume?.id || 'none',
      customizedResumeUrl: existingCustomizedResume?.customizedResumeUrl || 'none',
      jobNotification: existingJobNotification?.id || 'none',
      jobNotificationCustomizedResume: existingJobNotification?.customizedResume || 'none'
    })

    // Check if an application already exists for this job and user
    let existingApplication = await prisma.application.findFirst({
      where: {
        userId: user.id,
        jobTitle: job.title,
        company: job.company
      }
    })

    // Map status to application status enum
    let applicationStatus: 'APPLIED' | 'REVIEWING' | 'WITHDRAWN'
    switch (status) {
      case 'applied':
        applicationStatus = 'APPLIED'
        break
      case 'need_followup':
        applicationStatus = 'REVIEWING'
        break
      case 'not_applied':
        applicationStatus = 'WITHDRAWN'
        break
      default:
        applicationStatus = 'APPLIED'
    }

    // Include customized materials if available
    let customizedResumeUrl: string | null = null
    let coverLetter: string | null = null
    let resumeCustomizationData: string | null = null
    let matchScore: number | null = null

    // Priority: CustomizedResume table first, then JobNotification
    if (existingCustomizedResume) {
      customizedResumeUrl = existingCustomizedResume.customizedResumeUrl
      matchScore = existingCustomizedResume.matchScore
      
      // Try to parse customization data for cover letter and notes
      try {
        const customizationData = JSON.parse(existingCustomizedResume.customizationData || '{}')
        resumeCustomizationData = existingCustomizedResume.customizationData
        // Cover letter might be in the customization data
        if (customizationData.coverLetter) {
          coverLetter = customizationData.coverLetter
          console.log('Found cover letter in customization data')
        }
      } catch (e) {
        console.log('Could not parse customization data:', e)
      }
    } else if (existingJobNotification?.customizedResume) {
      // Parse the customized resume data from JobNotification
      try {
        const notificationData = JSON.parse(existingJobNotification.customizedResume)
        customizedResumeUrl = notificationData.customizedPdfUrl || notificationData.customizedResumeUrl
        coverLetter = notificationData.coverLetter
        matchScore = notificationData.matchScore || existingJobNotification.matchScore
        
        // Create customization data summary
        resumeCustomizationData = JSON.stringify({
          customizationNotes: notificationData.customizationNotes || [],
          keywordMatches: notificationData.keywordMatches || [],
          matchScore: matchScore,
          customizedAt: existingJobNotification.createdAt.toISOString(),
          source: 'jobNotification'
        })
      } catch (e) {
        console.log('Could not parse job notification customized resume data:', e)
      }
    }

    console.log('Customized materials to include in application:', {
      customizedResumeUrl: customizedResumeUrl ? 'found' : 'none',
      hasCoverLetter: !!coverLetter,
      hasCustomizationData: !!resumeCustomizationData,
      matchScore
    })

    const applicationData = {
      userId: user.id,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
      jobUrl: job.url,
      location: job.location,
      salaryRange: job.salaryRange,
      employmentType: job.employmentType,
      status: applicationStatus,
      appliedAt: status === 'applied' && applicationDate ? new Date(applicationDate) : new Date(),
      source: 'manual',
      notes: notes || null,
      // Include customized materials
      customizedResumeUrl: customizedResumeUrl,
      coverLetter: coverLetter,
      resumeCustomizationData: resumeCustomizationData,
      matchScore: matchScore,
      ...(referenceNumber && { sourceJobId: referenceNumber })
    }

    let application
    if (existingApplication) {
      // Update existing application
      application = await prisma.application.update({
        where: { id: existingApplication.id },
        data: applicationData
      })
    } else {
      // Create new application record
      application = await prisma.application.create({
        data: applicationData
      })
    }

    // Update the job's appliedTo status if successfully applied
    if (status === 'applied') {
      await prisma.job.update({
        where: { id: jobId },
        data: { 
          appliedTo: true,
          updatedAt: new Date()
        }
      })
    }

    console.log('Application status updated successfully:', application.id, 'with customized materials:', {
      hasCustomizedResume: !!application.customizedResumeUrl,
      hasCoverLetter: !!application.coverLetter,
      matchScore: application.matchScore
    })

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        appliedAt: application.appliedAt,
        notes: application.notes,
        customizedResumeUrl: application.customizedResumeUrl,
        coverLetter: !!application.coverLetter,
        matchScore: application.matchScore,
        hasCustomizedMaterials: !!(application.customizedResumeUrl || application.coverLetter)
      }
    })

  } catch (error) {
    console.error('Error updating manual application:', error)
    return NextResponse.json({
      error: 'Failed to update application status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})