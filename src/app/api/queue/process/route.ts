import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { jobScanner } from '@/lib/jobScanner'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Processing pending queue jobs...')

    // Get pending job scan jobs
    const pendingJobs = await prisma.jobQueue.findMany({
      where: {
        status: 'PENDING',
        type: 'user_job_scan'
      },
      orderBy: { createdAt: 'asc' },
      take: 5 // Process up to 5 jobs at once
    })

    if (pendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending jobs to process',
        processed: 0
      })
    }

    console.log(`📋 Found ${pendingJobs.length} pending job scan jobs`)

    let processedCount = 0
    const results = []

    for (const job of pendingJobs) {
      try {
        console.log(`🔄 Processing job: ${job.id}`)
        
        // Mark as processing
        await prisma.jobQueue.update({
          where: { id: job.id },
          data: {
            status: 'PROCESSING',
            processedAt: new Date(),
            attemptCount: job.attemptCount + 1
          }
        })

        const payload = JSON.parse(job.payload)
        const userId = payload.userId

        console.log(`👤 Processing job scan for user: ${userId}`)

        // Call the actual job scanner (this will call JSEARCH API)
        const scanResult = await jobScanner.scanAndProcessJobs(userId)

        // Mark as completed
        await prisma.jobQueue.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date()
          }
        })

        processedCount++
        results.push({
          jobId: job.id,
          userId,
          processed: scanResult.processed,
          applied: scanResult.applied,
          status: 'completed'
        })

        console.log(`✅ Job ${job.id} completed: ${scanResult.processed} jobs processed`)

      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error)
        
        // Mark as failed
        await prisma.jobQueue.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        })

        results.push({
          jobId: job.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ Queue processing complete: ${processedCount}/${pendingJobs.length} jobs processed`)

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} queue jobs`,
      processed: processedCount,
      total: pendingJobs.length,
      results
    })

  } catch (error) {
    console.error('Queue processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process queue jobs' },
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

    // Get queue status
    const queueStats = await prisma.jobQueue.groupBy({
      by: ['status', 'type'],
      _count: { status: true }
    })

    const stats: Record<string, Record<string, number>> = {}
    queueStats.forEach(stat => {
      if (!stats[stat.type]) stats[stat.type] = {}
      stats[stat.type][stat.status] = stat._count.status
    })

    return NextResponse.json({
      success: true,
      queueStats: stats
    })

  } catch (error) {
    console.error('Queue status error:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}