import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    console.log('🧪 Testing database connection...')
    
    // Simple database query
    const userCount = await prisma.user.count()
    console.log('✅ Database query successful, user count:', userCount)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection working',
      userCount 
    })
  } catch (error) {
    console.error('❌ Database test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }, { status: 500 })
  }
}