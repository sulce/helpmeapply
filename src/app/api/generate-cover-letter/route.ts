import { NextRequest, NextResponse } from 'next/server'
import { withSubscription } from '@/lib/billing'
import { generateCoverLetter } from '@/lib/openai'

export const POST = withSubscription(async (req: NextRequest, { user }) => {
  try {
    const { job, resumeData } = await req.json()

    if (!job || !resumeData) {
      return NextResponse.json(
        { error: 'Missing job or resume data' },
        { status: 400 }
      )
    }

    console.log('Generating cover letter for job:', job.title, 'at', job.company, 'jobId:', job.id)

    const coverLetter = await generateCoverLetter({
      profile: {
        fullName: resumeData.contactInfo?.fullName || 'User',
        skills: resumeData.skills?.map((skill: any) => ({
          name: skill.name,
          proficiency: skill.proficiency || 'Intermediate'
        })) || [],
        jobTitlePrefs: resumeData.experience?.map((exp: any) => exp.jobTitle) || ['Software Developer'],
        yearsExperience: resumeData.experience?.length || 0
      },
      job: {
        title: job.title,
        company: job.company,
        description: job.description || '',
        requirements: []
      }
    })

    // Save cover letter to existing customized resume record if available
    if (job.id && job.id !== 'preview') {
      try {
        const { prisma } = await import('@/lib/db')
        
        console.log('Saving cover letter to existing customized resume record...')
        
        // Update existing customized resume record with cover letter
        const existingRecord = await prisma.customizedResume.findFirst({
          where: {
            userId: user.id,
            jobId: job.id
          },
          orderBy: { createdAt: 'desc' }
        })
        
        if (existingRecord) {
          // Parse existing customization data and add cover letter
          let customizationData = {}
          try {
            customizationData = JSON.parse(existingRecord.customizationData || '{}')
          } catch (e) {
            console.log('Could not parse existing customization data, creating new object')
          }
          
          await prisma.customizedResume.update({
            where: { id: existingRecord.id },
            data: {
              customizationData: JSON.stringify({
                ...customizationData,
                coverLetter: coverLetter,
                coverLetterGeneratedAt: new Date().toISOString()
              })
            }
          })
          
          console.log('Cover letter saved to existing customized resume record:', existingRecord.id)
        } else {
          console.log('No existing customized resume record found for job:', job.id)
        }
      } catch (saveError) {
        console.error('Failed to save cover letter (non-critical):', saveError)
      }
    }

    return NextResponse.json({
      success: true,
      coverLetter
    })

  } catch (error) {
    console.error('Cover letter generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate cover letter' },
      { status: 500 }
    )
  }
})