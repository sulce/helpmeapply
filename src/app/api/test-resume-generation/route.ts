import { NextRequest, NextResponse } from 'next/server'
import { ResumeCustomizationService } from '@/lib/resumeCustomizationService'

export async function POST(req: NextRequest) {
  try {
    console.log('Testing resume generation...')
    
    // Test with hardcoded data to bypass authentication issues
    const customizationService = ResumeCustomizationService.getInstance()
    
    const testRequest = {
      originalResume: {
        content: 'Test resume content'
      },
      job: {
        title: 'Lead Frontend Engineer',
        company: 'Venn',
        description: 'We are looking for a Lead Frontend Engineer to join our team.',
        requirements: ['React', 'TypeScript', 'Frontend Development']
      },
      profile: {
        fullName: 'John Ammier',
        skills: [
          { name: 'React', proficiency: 'EXPERT', yearsUsed: 5 },
          { name: 'TypeScript', proficiency: 'ADVANCED', yearsUsed: 3 },
          { name: 'JavaScript', proficiency: 'EXPERT', yearsUsed: 8 }
        ],
        jobTitlePrefs: ['Frontend Developer', 'React Developer'],
        yearsExperience: 8
      }
    }

    console.log('Starting resume customization...')
    const result = await customizationService.customizeResume(testRequest, 'test-user')
    console.log('Resume customization completed:', result.customizedPdfUrl ? 'PDF generated' : 'No PDF')
    
    return NextResponse.json({
      success: true,
      customizedPdfUrl: result.customizedPdfUrl,
      customizedContent: result.customizedContent,
      message: 'Test resume generated successfully'
    })

  } catch (error) {
    console.error('Test resume generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate test resume' },
      { status: 500 }
    )
  }
}