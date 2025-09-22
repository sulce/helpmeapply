import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.JSEARCH_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'JSEARCH_API_KEY not found in environment',
        troubleshooting: [
          'Add JSEARCH_API_KEY=your_key to .env.local file',
          'Restart the development server with npm run dev',
          'Check that .env.local is not in .gitignore'
        ]
      }, { status: 500 })
    }

    // Test API call to JSearch
    const testUrl = 'https://jsearch.p.rapidapi.com/search?query=software%20engineer&page=1&num_pages=1'
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      })

      const responseText = await response.text()
      
      if (!response.ok) {
        return NextResponse.json({
          error: `JSearch API test failed: ${response.status} ${response.statusText}`,
          details: responseText,
          apiKeyLength: apiKey.length,
          troubleshooting: [
            'Verify API key is correct in RapidAPI dashboard',
            'Check if you have an active JSearch subscription',
            'Ensure API key has proper permissions'
          ]
        }, { status: 400 })
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch {
        data = responseText
      }

      return NextResponse.json({
        success: true,
        message: 'JSearch API is working correctly!',
        apiKeyLength: apiKey.length,
        testResponse: {
          status: response.status,
          dataLength: Array.isArray(data?.data) ? data.data.length : 'unknown',
          sampleJob: data?.data?.[0]?.job_title || 'No jobs returned'
        }
      })

    } catch (fetchError) {
      return NextResponse.json({
        error: 'Network error calling JSearch API',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        troubleshooting: [
          'Check internet connection',
          'Verify RapidAPI is accessible',
          'Check if corporate firewall is blocking requests'
        ]
      }, { status: 500 })
    }

  } catch (error) {
    console.error('JSearch test error:', error)
    return NextResponse.json(
      { error: 'Failed to test JSearch API' },
      { status: 500 }
    )
  }
}