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

    // Get resume information and performance data
    const [structuredResume, applications, resumeAnalytics] = await Promise.all([
      // Get structured resume details
      prisma.structuredResume.findUnique({
        where: { userId },
        select: {
          templateRegion: true,
          includePhoto: true,
          isComplete: true,
          lastPdfUrl: true,
          updatedAt: true,
          contactInfo: true,
          summary: true,
          experience: true,
          education: true,
          skills: true,
          certifications: true,
          projects: true,
          languages: true
        }
      }),

      // Get applications for resume performance correlation
      prisma.application.findMany({
        where: { 
          userId,
          appliedAt: { 
            gte: new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
          }
        },
        select: {
          id: true,
          status: true,
          appliedAt: true,
          responseAt: true,
          matchScore: true,
          source: true,
          jobTitle: true,
          company: true
        },
        orderBy: { appliedAt: 'desc' }
      }),

      // Get any custom resume versions (future feature)
      prisma.application.groupBy({
        by: ['source'],
        where: { 
          userId,
          appliedAt: { 
            gte: new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000) 
          }
        },
        _count: { source: true },
        _avg: { matchScore: true }
      })
    ])

    if (!structuredResume) {
      return NextResponse.json({
        hasResume: false,
        message: 'No structured resume found. Create one to see performance analytics.'
      })
    }

    // Calculate resume completeness score
    const contactInfo = JSON.parse(structuredResume.contactInfo || '{}')
    const experience = JSON.parse(structuredResume.experience || '[]')
    const education = JSON.parse(structuredResume.education || '[]')
    const skills = JSON.parse(structuredResume.skills || '[]')
    const certifications = JSON.parse(structuredResume.certifications || '[]')
    const projects = JSON.parse(structuredResume.projects || '[]')
    const languages = JSON.parse(structuredResume.languages || '[]')

    const completenessScore = {
      contactInfo: (contactInfo.fullName && contactInfo.email && contactInfo.phone) ? 100 : 50,
      summary: structuredResume.summary && structuredResume.summary.trim().length > 50 ? 100 : 0,
      experience: Math.min(experience.length * 33, 100), // Up to 3 experiences = 100%
      education: Math.min(education.length * 50, 100), // Up to 2 educations = 100%
      skills: Math.min(skills.length * 10, 100), // Up to 10 skills = 100%
      certifications: Math.min(certifications.length * 25, 100), // Up to 4 = 100%
      projects: Math.min(projects.length * 33, 100), // Up to 3 = 100%
      languages: Math.min(languages.length * 20, 100) // Up to 5 = 100%
    }

    const overallCompleteness = Math.round(
      (completenessScore.contactInfo + 
       completenessScore.summary + 
       completenessScore.experience + 
       completenessScore.education + 
       completenessScore.skills) / 5
    )

    // Analyze template performance
    const templatePerformance = {
      region: structuredResume.templateRegion || 'US',
      includesPhoto: structuredResume.includePhoto || false,
      lastUpdated: structuredResume.updatedAt,
      applicationsWithResume: applications.length,
      averageMatchScore: applications.length > 0 
        ? applications.reduce((sum, app) => sum + (app.matchScore || 0), 0) / applications.length
        : 0
    }

    // Performance by job source/platform
    const platformPerformance = resumeAnalytics.map(platform => ({
      platform: platform.source || 'Direct',
      applications: platform._count.source,
      averageMatchScore: platform._avg.matchScore ? Math.round(platform._avg.matchScore * 100) : null
    }))

    // Response rate analysis
    const responsesReceived = applications.filter(app => app.responseAt).length
    const responseRate = applications.length > 0 ? (responsesReceived / applications.length * 100) : 0

    // Interview rate analysis
    const interviews = applications.filter(app => 
      ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED'].includes(app.status)
    ).length
    const interviewRate = applications.length > 0 ? (interviews / applications.length * 100) : 0

    // ATS Score estimation (based on structure and keywords)
    const atsScore = calculateATSScore({
      hasStructuredExperience: experience.length > 0,
      hasSkillsSection: skills.length > 0,
      hasEducationSection: education.length > 0,
      hasContactInfo: Boolean(contactInfo.fullName && contactInfo.email),
      hasSummary: Boolean(structuredResume.summary),
      templateRegion: structuredResume.templateRegion
    })

    // Generate recommendations
    const recommendations = generateResumeRecommendations({
      completenessScore,
      overallCompleteness,
      responseRate,
      interviewRate,
      templateRegion: structuredResume.templateRegion,
      applicationCount: applications.length,
      atsScore
    })

    return NextResponse.json({
      hasResume: true,
      overview: {
        completenessScore: overallCompleteness,
        atsScore: Math.round(atsScore),
        lastUpdated: structuredResume.updatedAt,
        templateRegion: structuredResume.templateRegion,
        totalApplications: applications.length,
        responseRate: Math.round(responseRate * 10) / 10,
        interviewRate: Math.round(interviewRate * 10) / 10
      },
      sectionScores: completenessScore,
      templatePerformance,
      platformPerformance,
      recommendations,
      recentActivity: {
        applicationsLast30Days: applications.filter(app => 
          new Date(app.appliedAt) > new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        averageMatchScore: Math.round(templatePerformance.averageMatchScore * 100),
        topPerformingPlatforms: platformPerformance
          .sort((a, b) => (b.averageMatchScore || 0) - (a.averageMatchScore || 0))
          .slice(0, 3)
      }
    })

  } catch (error) {
    console.error('Resume analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resume analytics' },
      { status: 500 }
    )
  }
}

function calculateATSScore(factors: {
  hasStructuredExperience: boolean
  hasSkillsSection: boolean
  hasEducationSection: boolean
  hasContactInfo: boolean
  hasSummary: boolean
  templateRegion?: string
}): number {
  let score = 0
  
  // Core ATS factors
  if (factors.hasContactInfo) score += 20
  if (factors.hasStructuredExperience) score += 25
  if (factors.hasSkillsSection) score += 20
  if (factors.hasEducationSection) score += 15
  if (factors.hasSummary) score += 10
  
  // Template factors
  if (factors.templateRegion === 'US') score += 10 // US templates are most ATS-friendly
  else if (factors.templateRegion === 'CA') score += 8
  else if (factors.templateRegion === 'UK') score += 6
  else score += 4 // EU and Academic templates less ATS-optimized
  
  return Math.min(score, 100)
}

function generateResumeRecommendations(data: {
  completenessScore: any
  overallCompleteness: number
  responseRate: number
  interviewRate: number
  templateRegion?: string
  applicationCount: number
  atsScore: number
}): string[] {
  const recommendations: string[] = []
  
  // Completeness recommendations
  if (data.overallCompleteness < 80) {
    recommendations.push("🔧 Complete your resume sections - aim for 80%+ completeness")
  }
  
  if (data.completenessScore.summary < 100) {
    recommendations.push("📝 Add a compelling professional summary (50+ words)")
  }
  
  if (data.completenessScore.experience < 100) {
    recommendations.push("💼 Add more work experience entries with detailed descriptions")
  }
  
  if (data.completenessScore.skills < 80) {
    recommendations.push("⚡ Add more relevant skills (target 8-10 key competencies)")
  }
  
  // ATS recommendations
  if (data.atsScore < 75) {
    recommendations.push("🤖 Improve ATS compatibility - use standard section headers and formats")
  }
  
  // Performance recommendations
  if (data.applicationCount > 10 && data.responseRate < 10) {
    recommendations.push("📧 Low response rate detected - consider updating your resume content")
  }
  
  if (data.applicationCount > 5 && data.interviewRate < 15) {
    recommendations.push("🎯 Optimize your resume for better interview conversion")
  }
  
  // Template recommendations
  if (data.templateRegion !== 'US' && data.atsScore < 70) {
    recommendations.push("🇺🇸 Consider switching to US template for better ATS compatibility")
  }
  
  // Default recommendations
  if (recommendations.length === 0) {
    if (data.overallCompleteness > 90 && data.atsScore > 80) {
      recommendations.push("✨ Great resume! Continue applying to see performance trends")
    } else {
      recommendations.push("📊 Keep applying to jobs to unlock detailed performance insights")
    }
  }
  
  return recommendations.slice(0, 4) // Limit to top 4 recommendations
}