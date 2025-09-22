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
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Get user data for personalized insights
    const [profile, applications, jobs, structuredResume] = await Promise.all([
      // User profile
      prisma.profile.findUnique({
        where: { userId },
        select: {
          jobTitlePrefs: true,
          skills: {
            select: { name: true, proficiency: true }
          },
          salaryMin: true,
          salaryMax: true,
          yearsExperience: true,
          preferredLocations: true
        }
      }),

      // Recent applications
      prisma.application.findMany({
        where: { 
          userId,
          appliedAt: { gte: ninetyDaysAgo }
        },
        select: {
          status: true,
          jobTitle: true,
          company: true,
          location: true,
          salaryRange: true,
          appliedAt: true,
          responseAt: true,
          matchScore: true,
          employmentType: true,
          source: true
        }
      }),

      // Available jobs for market analysis (recent jobs from all sources)
      prisma.job.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          title: true,
          company: true,
          location: true,
          salaryRange: true,
          employmentType: true,
          source: true,
          appliedTo: true,
          createdAt: true,
          description: true
        },
        take: 1000
      }),

      // Resume data
      prisma.structuredResume.findUnique({
        where: { userId },
        select: {
          skills: true,
          experience: true,
          templateRegion: true
        }
      })
    ])

    // Market Analysis
    const jobMarketInsights = analyzeJobMarket(jobs, applications, profile)
    
    // Personal Performance Insights
    const performanceInsights = analyzePersonalPerformance(applications, profile)
    
    // Skill Gap Analysis
    const skillGapInsights = analyzeSkillGaps(jobs, profile, structuredResume)
    
    // Timing and Strategy Insights
    const strategyInsights = analyzeStrategy(applications, jobs)
    
    // Salary Insights
    const salaryInsights = analyzeSalaryTrends(jobs, applications, profile)
    
    // Generate weekly goals and recommendations
    const weeklyGoals = generateWeeklyGoals(applications, jobs, profile, performanceInsights)

    return NextResponse.json({
      summary: {
        totalInsights: jobMarketInsights.length + performanceInsights.length + skillGapInsights.length + strategyInsights.length,
        marketTrend: determineMarketTrend(jobs),
        personalTrend: determinePersonalTrend(applications),
        urgentActions: getUrgentActions(applications, jobs, profile),
        weeklyScore: calculateWeeklyScore(applications, jobs)
      },
      insights: {
        market: jobMarketInsights,
        performance: performanceInsights,
        skills: skillGapInsights,
        strategy: strategyInsights,
        salary: salaryInsights
      },
      weeklyGoals,
      trends: {
        applicationVolume: calculateApplicationTrend(applications),
        responseRate: calculateResponseTrend(applications),
        marketActivity: calculateMarketActivityTrend(jobs),
        salaryTrends: calculateSalaryTrends(jobs)
      },
      recommendations: generatePersonalizedRecommendations(applications, jobs, profile, structuredResume)
    })

  } catch (error) {
    console.error('AI Insights error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI insights' },
      { status: 500 }
    )
  }
}

// Market Analysis Functions
function analyzeJobMarket(jobs: any[], applications: any[], profile: any): string[] {
  const insights: string[] = []
  
  if (jobs.length === 0) {
    insights.push("📊 No recent job data available. Enable job scanning to get market insights.")
    return insights
  }

  // Job volume trends
  const recentJobs = jobs.filter(job => 
    new Date(job.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )
  
  if (recentJobs.length > jobs.length * 0.4) {
    insights.push("📈 Job market is very active this week - great time to apply!")
  } else if (recentJobs.length < jobs.length * 0.1) {
    insights.push("📉 Fewer jobs posted recently - focus on quality applications")
  }

  // Competition analysis
  const averageMatchingJobs = jobs.filter(job => !job.appliedTo).length
  if (averageMatchingJobs > 50) {
    insights.push("🎯 Many opportunities available in your field - increase application volume")
  } else if (averageMatchingJobs < 10) {
    insights.push("⚡ Limited opportunities - consider expanding your search criteria")
  }

  // Employment type trends
  const remoteJobs = jobs.filter(job => 
    job.employmentType === 'REMOTE' || job.location?.toLowerCase().includes('remote')
  ).length
  
  if (remoteJobs > jobs.length * 0.3) {
    insights.push("🏠 High remote work availability - 30%+ of jobs offer remote options")
  }

  return insights
}

function analyzePersonalPerformance(applications: any[], profile: any): string[] {
  const insights: string[] = []
  
  if (applications.length === 0) {
    insights.push("🚀 Ready to start your job search! Apply to 5-10 positions this week.")
    return insights
  }

  // Response rate analysis
  const responses = applications.filter(app => app.responseAt).length
  const responseRate = (responses / applications.length) * 100
  
  if (responseRate > 20) {
    insights.push("⭐ Excellent response rate! Your applications are highly effective.")
  } else if (responseRate < 5 && applications.length > 10) {
    insights.push("🔧 Low response rate - consider updating your resume or targeting strategy")
  }

  // Application velocity
  const recentApps = applications.filter(app => 
    new Date(app.appliedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length
  
  if (recentApps === 0 && applications.length > 0) {
    insights.push("⏰ No applications this week - aim for 3-5 quality applications weekly")
  } else if (recentApps > 10) {
    insights.push("🔥 High application volume! Make sure to follow up on responses.")
  }

  return insights
}

function analyzeSkillGaps(jobs: any[], profile: any, resume: any): string[] {
  const insights: string[] = []
  
  if (!jobs.length || !profile) return insights

  // Extract common requirements from job descriptions
  const commonSkills = extractCommonSkills(jobs)
  const userSkills = profile.skills?.map((skill: any) => skill.name.toLowerCase()) || []
  
  // Find skill gaps
  const missingSkills = commonSkills.filter(skill => 
    !userSkills.some((userSkill: string) => userSkill.includes(skill.toLowerCase()))
  )
  
  if (missingSkills.length > 0) {
    insights.push(`📚 Consider learning: ${missingSkills.slice(0, 3).join(', ')} - high demand in your field`)
  }
  
  // Skill strength analysis
  const strongSkills = profile.skills?.filter((s: any) => 
    s.proficiency === 'Expert' || s.proficiency === 'Advanced'
  ) || []
  
  if (strongSkills.length < 3) {
    insights.push("💪 Develop 2-3 expert-level skills to stand out from competition")
  }

  return insights
}

function analyzeStrategy(applications: any[], jobs: any[]): string[] {
  const insights: string[] = []
  
  if (!applications.length) return insights

  // Best performing times
  const applicationsByDay = applications.reduce((acc: any, app: any) => {
    const day = new Date(app.appliedAt).getDay()
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {})
  
  const bestDay = Object.entries(applicationsByDay).sort(([,a], [,b]) => (b as number) - (a as number))[0]
  if (bestDay) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    insights.push(`📅 You're most active on ${dayNames[parseInt(bestDay[0])]} - consider this for timing`)
  }

  // Platform effectiveness
  const platformPerformance = applications.reduce((acc: any, app: any) => {
    if (app.source) {
      if (!acc[app.source]) acc[app.source] = { apps: 0, responses: 0 }
      acc[app.source].apps++
      if (app.responseAt) acc[app.source].responses++
    }
    return acc
  }, {})

  const bestPlatform = Object.entries(platformPerformance).sort(([,a], [,b]) => 
    (b as any).responses / (b as any).apps - (a as any).responses / (a as any).apps
  )[0]

  if (bestPlatform && (bestPlatform[1] as any).responses > 0) {
    insights.push(`🎯 ${bestPlatform[0]} has your best response rate - focus efforts there`)
  }

  return insights
}

function analyzeSalaryTrends(jobs: any[], applications: any[], profile: any): string[] {
  const insights: string[] = []
  
  if (!jobs.length) return insights

  // Calculate salary ranges from string format (e.g. "$50,000 - $70,000")
  const salariesWithRanges = jobs.filter(job => job.salaryRange).map(job => {
    const match = job.salaryRange?.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K)?\s*-?\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K)?/)
    if (match) {
      let min = parseFloat(match[1].replace(/,/g, ''))
      let max = parseFloat(match[2].replace(/,/g, ''))
      
      // Handle 'k' suffix (thousands)
      if (job.salaryRange?.toLowerCase().includes('k')) {
        min *= 1000
        max *= 1000
      }
      
      return { ...job, salaryMin: min, salaryMax: max }
    }
    return null
  }).filter(Boolean)
  
  if (salariesWithRanges.length > 0) {
    const avgMin = salariesWithRanges.reduce((sum, job) => sum + job.salaryMin, 0) / salariesWithRanges.length
    const avgMax = salariesWithRanges.reduce((sum, job) => sum + job.salaryMax, 0) / salariesWithRanges.length
    
    // Use user's salary expectations from profile
    const userSalaryMin = profile?.salaryMin
    const userSalaryMax = profile?.salaryMax
    
    if (userSalaryMin && userSalaryMin < avgMin * 0.8) {
      insights.push(`💰 Market average is higher than your expectation - consider raising targets`)
    } else if (userSalaryMax && userSalaryMax > avgMax * 1.2) {
      insights.push(`💡 Your salary expectation is above market - ensure skills justify premium`)
    }
    
    insights.push(`📊 Market range: $${Math.round(avgMin/1000)}K - $${Math.round(avgMax/1000)}K annually`)
  }

  return insights
}

// Helper functions
function extractCommonSkills(jobs: any[]): string[] {
  const skillCounts: { [key: string]: number } = {}
  
  jobs.forEach(job => {
    if (job.requirements) {
      const skills = extractSkillsFromText(job.requirements)
      skills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1
      })
    }
  })
  
  return Object.entries(skillCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([skill]) => skill)
}

function extractSkillsFromText(text: string): string[] {
  const commonTechSkills = [
    'javascript', 'python', 'react', 'node', 'sql', 'aws', 'docker', 
    'kubernetes', 'typescript', 'java', 'c++', 'git', 'agile', 'scrum'
  ]
  
  return commonTechSkills.filter(skill => 
    text.toLowerCase().includes(skill)
  )
}

function determineMarketTrend(jobs: any[]): 'up' | 'down' | 'stable' {
  if (jobs.length === 0) return 'stable'
  
  const recentJobs = jobs.filter(job => 
    new Date(job.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length
  
  const ratio = recentJobs / jobs.length
  
  if (ratio > 0.3) return 'up'
  if (ratio < 0.1) return 'down'
  return 'stable'
}

function determinePersonalTrend(applications: any[]): 'improving' | 'declining' | 'stable' {
  if (applications.length < 5) return 'stable'
  
  const recentApps = applications.filter(app =>
    new Date(app.appliedAt) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  )
  
  const recentResponses = recentApps.filter(app => app.responseAt).length
  const recentResponseRate = recentApps.length > 0 ? recentResponses / recentApps.length : 0
  
  const olderApps = applications.filter(app =>
    new Date(app.appliedAt) <= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  )
  
  const olderResponses = olderApps.filter(app => app.responseAt).length
  const olderResponseRate = olderApps.length > 0 ? olderResponses / olderApps.length : 0
  
  if (recentResponseRate > olderResponseRate * 1.2) return 'improving'
  if (recentResponseRate < olderResponseRate * 0.8) return 'declining'
  return 'stable'
}

function getUrgentActions(applications: any[], jobs: any[], profile: any): string[] {
  const actions: string[] = []
  
  // No applications recently
  const recentApps = applications.filter(app =>
    new Date(app.appliedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )
  
  if (recentApps.length === 0 && jobs.length > 0) {
    actions.push("Apply to 3-5 jobs this week")
  }
  
  // Pending follow-ups
  const pendingFollowUps = applications.filter(app => 
    app.status === 'APPLIED' && 
    new Date(app.appliedAt) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
    !app.responseAt
  )
  
  if (pendingFollowUps.length > 5) {
    actions.push("Follow up on old applications")
  }
  
  return actions
}

function calculateWeeklyScore(applications: any[], jobs: any[]): number {
  let score = 0
  
  const recentApps = applications.filter(app =>
    new Date(app.appliedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )
  
  // Application activity (max 40 points)
  score += Math.min(recentApps.length * 8, 40)
  
  // Response activity (max 30 points)
  const recentResponses = recentApps.filter(app => app.responseAt)
  score += recentResponses.length * 15
  
  // Job opportunities (max 30 points)
  const availableJobs = jobs.filter(job => !job.appliedTo).length
  score += Math.min(availableJobs * 2, 30)
  
  return Math.min(score, 100)
}

function generateWeeklyGoals(applications: any[], jobs: any[], profile: any, performanceInsights: any[]): any {
  const availableJobs = jobs.filter(job => !job.appliedTo).length
  const recentApps = applications.filter(app =>
    new Date(app.appliedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length

  return {
    apply: Math.max(3, Math.min(availableJobs, 7) - recentApps),
    follow_up: Math.min(applications.filter(app => 
      app.status === 'APPLIED' && !app.responseAt &&
      new Date(app.appliedAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length, 3),
    networking: recentApps < 3 ? 2 : 1,
    skill_development: performanceInsights.some(insight => insight.includes('skill')) ? 1 : 0
  }
}

function calculateApplicationTrend(applications: any[]): any {
  // Implementation for application trend calculation
  return { direction: 'stable', change: 0 }
}

function calculateResponseTrend(applications: any[]): any {
  // Implementation for response trend calculation
  return { direction: 'stable', change: 0 }
}

function calculateMarketActivityTrend(jobs: any[]): any {
  // Implementation for market activity trend
  return { direction: 'stable', change: 0 }
}

function calculateSalaryTrends(jobs: any[]): any {
  // Implementation for salary trend calculation
  return { trend: 'stable', averageChange: 0 }
}

function generatePersonalizedRecommendations(applications: any[], jobs: any[], profile: any, resume: any): string[] {
  const recommendations: string[] = []
  
  if (applications.length === 0) {
    recommendations.push("Start your job search by applying to 5 positions this week")
  }
  
  if (jobs.length > 20 && applications.length < 5) {
    recommendations.push("Many opportunities available - increase your application rate")
  }
  
  return recommendations
}