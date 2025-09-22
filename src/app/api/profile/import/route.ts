import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { profileImportService } from '@/lib/profileImportService'
import { z } from 'zod'

const importSchema = z.object({
  source: z.enum(['linkedin', 'indeed']),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { source } = importSchema.parse(body)

    let importedData = null
    let success = false

    if (source === 'linkedin') {
      importedData = await profileImportService.importFromLinkedIn(session.user.id)
    } else if (source === 'indeed') {
      importedData = await profileImportService.importFromIndeed(session.user.id)
    }

    if (importedData) {
      success = await profileImportService.updateProfileWithImportedData(
        session.user.id,
        importedData,
        source
      )
    }

    if (!success) {
      return NextResponse.json(
        { 
          error: `Failed to import profile from ${source}`,
          details: importedData ? 'Data retrieved but profile update failed' : 'No data retrieved from provider'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      source,
      data: importedData,
      message: `Successfully imported profile data from ${source}`
    })

  } catch (error) {
    console.error('Profile import error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to import profile data' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const availableImports = await profileImportService.getAvailableImports(session.user.id)

    return NextResponse.json({
      success: true,
      availableImports
    })

  } catch (error) {
    console.error('Get available imports error:', error)
    return NextResponse.json(
      { error: 'Failed to check available imports' },
      { status: 500 }
    )
  }
}