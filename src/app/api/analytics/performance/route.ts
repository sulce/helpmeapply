import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
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

    const userId = session.user.id

    // Get date ranges for analytics
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Application Performance Funnel
    const [applications, recentApplications, statusBreakdown, industryPerformance, responseTimeAnalysis] = await Promise.all([
      // Total applications
      prisma.application.count({
        where: { userId }
      }),

      // Recent applications (last 30 days)
      prisma.application.findMany({
        where: {
          userId,
          appliedAt: { gte: thirtyDaysAgo }
        },
        select: {
          id: true,
          status: true,
          appliedAt: true,
          responseAt: true,
          company: true,
          jobTitle: true,
          location: true,
          matchScore: true,
          salaryRange: true
        },
        orderBy: { appliedAt: 'desc' }
      }),

      // Status breakdown with counts
      prisma.application.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true }
      }),

      // Performance by company/industry (simplified - we'll use company for now)
      prisma.application.groupBy({
        by: ['company'],
        where: { 
          userId,
          appliedAt: { gte: thirtyDaysAgo }
        },
        _count: { company: true },
        _avg: { matchScore: true }
      }),

      // Response time analysis
      prisma.application.findMany({
        where: {
          userId,
          responseAt: { not: null },
          appliedAt: { gte: thirtyDaysAgo }
        },
        select: {
          appliedAt: true,
          responseAt: true,
          status: true
        }
      })
    ])

    // Calculate conversion rates
    const totalApps = applications
    const appliedCount = statusBreakdown.find((s: any) => s.status === 'APPLIED')?._count.status || 0
    const reviewingCount = statusBreakdown.find((s: any) => s.status === 'REVIEWING')?._count.status || 0
    const interviewScheduledCount = statusBreakdown.find((s: any) => s.status === 'INTERVIEW_SCHEDULED')?._count.status || 0
    const interviewedCount = statusBreakdown.find((s: any) => s.status === 'INTERVIEWED')?._count.status || 0
    const offerCount = statusBreakdown.find((s: any) => s.status === 'OFFER_RECEIVED')?._count.status || 0
    const rejectedCount = statusBreakdown.find((s: any) => s.status === 'REJECTED')?._count.status || 0

    const conversionFunnel = {
      applied: appliedCount + reviewingCount + interviewScheduledCount + interviewedCount + offerCount,
      reviewing: reviewingCount + interviewScheduledCount + interviewedCount + offerCount,
      interviewed: interviewScheduledCount + interviewedCount + offerCount,
      offers: offerCount
    }

    // Calculate response times
    const responseTimes = responseTimeAnalysis.map((app: any) => {
      if (!app.responseAt) return null
      const responseTime = new Date(app.responseAt).getTime() - new Date(app.appliedAt).getTime()
      return {
        days: Math.floor(responseTime / (1000 * 60 * 60 * 24)),
        status: app.status
      }
    }).filter(Boolean)

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum: any, rt: any) => sum + (rt?.days || 0), 0) / responseTimes.length 
      : null

    // Weekly application trend
    const weeklyTrend = Array.from({ length: 4 }, (_, weekIndex) => {
      const weekStart = new Date(now.getTime() - (weekIndex + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - weekIndex * 7 * 24 * 60 * 60 * 1000)
      
      const weekApplications = recentApplications.filter((app: any) => 
        new Date(app.appliedAt) >= weekStart && new Date(app.appliedAt) < weekEnd
      )

      return {
        week: `Week ${4 - weekIndex}`,
        applications: weekApplications.length,
        responses: weekApplications.filter((app: any) => app.responseAt).length
      }
    }).reverse()

    // Success rate by match score
    const matchScoreAnalysis = [
      { range: '90-100%', applications: 0, interviews: 0, offers: 0 },
      { range: '80-89%', applications: 0, interviews: 0, offers: 0 },
      { range: '70-79%', applications: 0, interviews: 0, offers: 0 },
      { range: '60-69%', applications: 0, interviews: 0, offers: 0 },
      { range: '<60%', applications: 0, interviews: 0, offers: 0 }
    ]

    recentApplications.forEach((app: any) => {
      if (!app.matchScore) return
      
      const score = app.matchScore * 100
      let rangeIndex = 4 // default to <60%
      
      if (score >= 90) rangeIndex = 0
      else if (score >= 80) rangeIndex = 1
      else if (score >= 70) rangeIndex = 2
      else if (score >= 60) rangeIndex = 3

      matchScoreAnalysis[rangeIndex].applications++
      
      if (['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED'].includes(app.status)) {
        matchScoreAnalysis[rangeIndex].interviews++
      }
      
      if (app.status === 'OFFER_RECEIVED') {
        matchScoreAnalysis[rangeIndex].offers++
      }
    })

    // Calculate rates
    const applicationToInterviewRate = conversionFunnel.applied > 0 
      ? (conversionFunnel.interviewed / conversionFunnel.applied * 100) 
      : 0
    
    const interviewToOfferRate = conversionFunnel.interviewed > 0 
      ? (conversionFunnel.offers / conversionFunnel.interviewed * 100) 
      : 0

    const overallSuccessRate = conversionFunnel.applied > 0 
      ? (conversionFunnel.offers / conversionFunnel.applied * 100) 
      : 0

    return NextResponse.json({
      summary: {
        totalApplications: totalApps,
        recentApplications: recentApplications.length,
        applicationToInterviewRate: Math.round(applicationToInterviewRate * 10) / 10,
        interviewToOfferRate: Math.round(interviewToOfferRate * 10) / 10,
        overallSuccessRate: Math.round(overallSuccessRate * 10) / 10,
        averageResponseTime: averageResponseTime ? Math.round(averageResponseTime * 10) / 10 : null
      },
      conversionFunnel,
      statusBreakdown: statusBreakdown.map((s: any) => ({
        status: s.status,
        count: s._count.status,
        percentage: totalApps > 0 ? Math.round((s._count.status / totalApps * 100) * 10) / 10 : 0
      })),
      weeklyTrend,
      matchScoreAnalysis,
      industryPerformance: industryPerformance.map((ip: any) => ({
        company: ip.company,
        applications: ip._count.company,
        averageMatchScore: ip._avg.matchScore ? Math.round(ip._avg.matchScore * 100) : null
      })).slice(0, 10), // Top 10 companies
      insights: generateInsights(conversionFunnel, applicationToInterviewRate, interviewToOfferRate, averageResponseTime, recentApplications.length)
    })

  } catch (error) {
    console.error('Performance analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance analytics' },
      { status: 500 }
    )
  }
}

function generateInsights(
  funnel: any, 
  appToInterview: number, 
  interviewToOffer: number, 
  avgResponseTime: number | null,
  recentApps: number
): string[] {
  const insights: string[] = []

  // Application volume insights
  if (recentApps === 0) {
    insights.push("📈 Start applying to jobs to see your performance metrics")
  } else if (recentApps < 5) {
    insights.push("📊 Apply to more positions to get meaningful analytics (5+ recommended)")
  } else if (recentApps > 20) {
    insights.push("🚀 Great application volume! You're staying active in the job market")
  }

  // Conversion rate insights
  if (appToInterview > 15) {
    insights.push("⭐ Excellent application-to-interview rate! Your resume is working well")
  } else if (appToInterview < 5 && recentApps > 10) {
    insights.push("🔧 Consider optimizing your resume - interview rate could improve")
  }

  if (interviewToOffer > 25) {
    insights.push("💪 Strong interview performance! You're converting interviews well")
  } else if (interviewToOffer < 10 && funnel.interviewed > 3) {
    insights.push("📚 Consider interview preparation - practice common questions")
  }

  // Response time insights
  if (avgResponseTime && avgResponseTime < 7) {
    insights.push("⚡ Companies are responding quickly - your applications are compelling")
  } else if (avgResponseTime && avgResponseTime > 21) {
    insights.push("⏳ Longer response times suggest highly competitive roles")
  }

  // Default insight if no specific conditions met
  if (insights.length === 0 && recentApps > 0) {
    insights.push("📊 Keep tracking your progress - patterns will emerge over time")
  }

  return insights
}