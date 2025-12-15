import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    // Test regenerate the Venn resume with improved PDF generation
    const customizationService = ResumeCustomizationService.getInstance()
    
    const testRequest = {
      originalResume: {
        url: 'https://res.cloudinary.com/drvfzwgjm/raw/upload/v1765496723/helpmeapply/resumes/693b4eef52bc2b602c3a6f94/1765496722479-Toye%27s%20CV%20-%20cloud%20backend%20dev%20-%20ON'
      },
      job: {
        title: 'Lead Frontend Engineer',
        company: 'Venn',
        description: 'We are looking for a Lead Frontend Engineer to join our team and help build the future of banking for Canadian entrepreneurs.',
        requirements: ['React', 'TypeScript', 'Frontend Development']
      },
      profile: {
        fullName: 'John Ammier',
        skills: [
          { name: 'React', proficiency: 'EXPERT', yearsUsed: 5 },
          { name: 'TypeScript', proficiency: 'ADVANCED', yearsUsed: 3 },
          { name: 'Frontend Development', proficiency: 'EXPERT', yearsUsed: 8 }
        ],
        jobTitlePrefs: ['Frontend Developer', 'React Developer'],
        yearsExperience: 8
      }
    }

    const result = await customizationService.customizeResume(testRequest, session.user.id)
    
    return NextResponse.json({
      success: true,
      customizedPdfUrl: result.customizedPdfUrl,
      message: 'Test PDF generated with improved formatting'
    })

  } catch (error) {
    console.error('Test PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate test PDF' },
      { status: 500 }
    )
  }
}