import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if OpenAI API key is configured
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key'

    return NextResponse.json({
      status: 'OK',
      openai: {
        configured: hasOpenAIKey,
        keyLength: process.env.OPENAI_API_KEY?.length || 0,
        masked: process.env.OPENAI_API_KEY ? 
          process.env.OPENAI_API_KEY.substring(0, 8) + '...' : 
          'Not set'
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('AI test error:', error)
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    )
  }
}