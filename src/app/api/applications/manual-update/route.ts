import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface ManualApplicationUpdate {
  jobId: string
  status: 'applied' | 'need_followup' | 'not_applied'
  applicationDate?: string
  notes?: string
  referenceNumber?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Check if an application already exists for this job and user
    let existingApplication = await prisma.application.findFirst({
      where: {
        userId: session.user.id,
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

    const applicationData = {
      userId: session.user.id,
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

    console.log('Application status updated successfully:', application.id)

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        appliedAt: application.appliedAt,
        notes: application.notes,
        referenceNumber: application.referenceNumber
      }
    })

  } catch (error) {
    console.error('Error updating manual application:', error)
    return NextResponse.json({
      error: 'Failed to update application status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}