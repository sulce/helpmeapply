import { PrismaClient } from '@prisma/client'
import { analyzeJobMatch, generateCoverLetter } from './openai'
import { createJobSearchService } from './jobAPIs'

const prisma = new PrismaClient()

export interface JobMatchResult {
  jobId: string
  matchScore: number
  recommendation: string
  reasons: string[]
  concerns: string[]
  customizedResume?: string
  coverLetter: string
  applicationAnswers?: Record<string, any>
}

export class JobNotificationService {
  private static instance: JobNotificationService

  static getInstance(): JobNotificationService {
    if (!JobNotificationService.instance) {
      JobNotificationService.instance = new JobNotificationService()
    }
    return JobNotificationService.instance
  }

  async processJobMatches(userId: string): Promise<{ processed: number; notified: number; autoApplied: number }> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        autoApplySettings: true,
        skills: true,
      },
    })

    if (!profile?.autoApplySettings) {
      return { processed: 0, notified: 0, autoApplied: 0 }
    }

    const settings = profile.autoApplySettings
    let processed = 0
    let notified = 0
    let autoApplied = 0

    // Get unprocessed jobs from recent scans
    const unprocessedJobs = await prisma.job.findMany({
      where: {
        isProcessed: false,
        appliedTo: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      take: 50, // Process in batches
    })

    for (const job of unprocessedJobs) {
      try {
        const matchResult = await this.analyzeJobMatch(job, profile, settings)
        processed++

        // Mark job as processed
        await prisma.job.update({
          where: { id: job.id },
          data: {
            matchScore: matchResult.matchScore,
            isProcessed: true,
          },
        })

        // Check if it meets notification criteria
        if (matchResult.matchScore >= (settings.notifyMinScore || 0.6) && (settings.notifyOnMatch ?? true)) {
          const shouldAutoApply = this.shouldAutoApply(matchResult, settings)
          
          if (shouldAutoApply && (settings.autoApplyEnabled ?? false) && !(settings.requireApproval ?? true)) {
            // Auto-apply immediately
            await this.autoApplyToJob(userId, job, matchResult)
            autoApplied++
          } else {
            // Create notification for user review
            await this.createJobNotification(userId, job, matchResult, settings)
            notified++
          }
        }
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error)
      }
    }

    return { processed, notified, autoApplied }
  }

  private async analyzeJobMatch(job: any, profile: any, settings: any): Promise<JobMatchResult> {
    const matchAnalysis = await analyzeJobMatch({
      profile: {
        fullName: profile.fullName,
        jobTitlePrefs: JSON.parse(profile.jobTitlePrefs || '[]'),
        yearsExperience: profile.yearsExperience || 0,
        skills: profile.skills.map((s: any) => ({
          name: s.name,
          proficiency: s.proficiency,
          yearsUsed: s.yearsUsed,
        })),
        preferredLocations: JSON.parse(profile.preferredLocations || '[]'),
        employmentTypes: JSON.parse(profile.employmentTypes || '[]'),
        resumeContent: await this.getResumeContent(profile.resumeUrl),
      },
      jobDescription: {
        title: job.title,
        company: job.company,
        description: job.description || '',
        requirements: [],
        location: job.location || '',
        salaryRange: job.salaryRange || '',
        employmentType: job.employmentType || 'FULL_TIME',
      },
    })

    // Generate cover letter for high-scoring matches
    let coverLetter = ''
    let customizedResume = null
    
    if (matchAnalysis.matchScore >= settings.minMatchScore) {
      coverLetter = await generateCoverLetter({
        profile: {
          fullName: profile.fullName,
          jobTitlePrefs: JSON.parse(profile.jobTitlePrefs || '[]'),
          yearsExperience: profile.yearsExperience || 0,
          skills: profile.skills,
        },
        job: {
          title: job.title,
          company: job.company,
          description: job.description || '',
          requirements: [],
        },
      })

      // If resume customization is enabled, customize it for this specific job
      if (settings.customizeResume && profile.resumeUrl) {
        customizedResume = await this.customizeResumeForJob(profile, job, matchAnalysis) || undefined
      }
    }

    return {
      jobId: job.id,
      matchScore: matchAnalysis.matchScore,
      recommendation: matchAnalysis.recommendation,
      reasons: matchAnalysis.reasons,
      concerns: matchAnalysis.concerns,
      customizedResume: customizedResume || undefined,
      coverLetter,
      applicationAnswers: await this.generateApplicationAnswers(job, profile),
    }
  }

  private shouldAutoApply(matchResult: JobMatchResult, settings: any): boolean {
    return (
      matchResult.matchScore >= settings.minMatchScore &&
      settings.autoApplyEnabled &&
      matchResult.recommendation === 'highly_recommended'
    )
  }

  private async createJobNotification(
    userId: string,
    job: any,
    matchResult: JobMatchResult,
    settings: any
  ): Promise<void> {
    const expiresAt = (settings.requireApproval ?? true)
      ? new Date(Date.now() + (settings.reviewTimeoutHours || 24) * 60 * 60 * 1000)
      : null

    const message = this.generateNotificationMessage(job, matchResult)

    await prisma.jobNotification.create({
      data: {
        userId,
        jobId: job.id,
        matchScore: matchResult.matchScore,
        message,
        customizedResume: matchResult.customizedResume,
        coverLetter: matchResult.coverLetter,
        applicationData: JSON.stringify(matchResult.applicationAnswers),
        expiresAt,
      },
    })

    // If user has approval enabled, also create an application review
    if (settings.requireApproval ?? true) {
      await this.createApplicationReview(userId, job, matchResult, settings)
    }
  }

  private async createApplicationReview(
    userId: string,
    job: any,
    matchResult: JobMatchResult,
    settings: any
  ): Promise<void> {
    const notification = await prisma.jobNotification.findFirst({
      where: {
        userId,
        jobId: job.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (notification) {
      await prisma.applicationReview.create({
        data: {
          userId,
          jobId: job.id,
          notificationId: notification.id,
          matchScore: matchResult.matchScore,
          aiRecommendation: `${Math.round(matchResult.matchScore * 100)}% match - ${matchResult.recommendation}`,
          customizedResume: matchResult.customizedResume,
          coverLetter: matchResult.coverLetter,
          applicationAnswers: JSON.stringify(matchResult.applicationAnswers),
          expiresAt: new Date(Date.now() + (settings.reviewTimeoutHours || 24) * 60 * 60 * 1000),
        },
      })
    }
  }

  private async autoApplyToJob(userId: string, job: any, matchResult: JobMatchResult): Promise<void> {
    try {
      // Create application record
      await prisma.application.create({
        data: {
          userId,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
          jobUrl: job.url,
          location: job.location,
          salaryRange: job.salaryRange,
          employmentType: job.employmentType,
          status: 'APPLIED',
          coverLetter: matchResult.coverLetter,
          matchScore: matchResult.matchScore,
          source: job.source,
          sourceJobId: job.sourceJobId,
          notes: `Auto-applied by AI (${Math.round(matchResult.matchScore * 100)}% match)`,
        },
      })

      // Mark job as applied
      await prisma.job.update({
        where: { id: job.id },
        data: { appliedTo: true },
      })

      // Create notification about the auto-application
      await prisma.jobNotification.create({
        data: {
          userId,
          jobId: job.id,
          matchScore: matchResult.matchScore,
          status: 'APPLIED',
          message: `🎉 I automatically applied to ${job.title} at ${job.company}! Match score: ${Math.round(matchResult.matchScore * 100)}%`,
          coverLetter: matchResult.coverLetter,
          customizedResume: matchResult.customizedResume,
        },
      })

      console.log(`Auto-applied to ${job.title} at ${job.company} (${Math.round(matchResult.matchScore * 100)}% match)`)
    } catch (error) {
      console.error('Error auto-applying to job:', error)
      throw error
    }
  }

  private generateNotificationMessage(job: any, matchResult: JobMatchResult): string {
    const score = Math.round(matchResult.matchScore * 100)
    const emoji = score >= 90 ? '🎯' : score >= 80 ? '⭐' : score >= 70 ? '👍' : '🤔'
    
    return `${emoji} Found a ${score}% match: ${job.title} at ${job.company}. ${matchResult.reasons.slice(0, 2).join('. ')}. Ready to apply?`
  }

  private async customizeResumeForJob(profile: any, job: any, matchAnalysis: any): Promise<string | null> {
    // This would implement resume customization logic
    // For now, return a placeholder indicating customization is ready
    return `Resume customized for ${job.title} at ${job.company} (${Math.round(matchAnalysis.matchScore * 100)}% match)`
  }

  private async generateApplicationAnswers(job: any, profile: any): Promise<Record<string, any>> {
    // Generate common application form answers based on job and profile
    return {
      yearsOfExperience: profile.yearsExperience || 0,
      availability: 'Immediately',
      salaryExpectation: profile.salaryMax || 'Negotiable',
      coverLetter: 'Generated by AI assistant',
      whyInterested: `I'm excited about the ${job.title} position at ${job.company} because it aligns perfectly with my career goals and experience.`,
      relocate: profile.preferredLocations?.includes(job.location) ? 'Yes' : 'No',
      authorized: 'Yes',
    }
  }

  private async getResumeContent(resumeUrl?: string): Promise<string | undefined> {
    // This would extract text content from the resume file
    // For now, return undefined
    return undefined
  }

  async getNotifications(userId: string, limit = 20, offset = 0) {
    return await prisma.jobNotification.findMany({
      where: { userId },
      include: {
        job: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async markNotificationAsViewed(notificationId: string, userId: string) {
    return await prisma.jobNotification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        status: 'VIEWED',
        viewedAt: new Date(),
      },
    })
  }

  async getPendingReviews(userId: string) {
    return await prisma.applicationReview.findMany({
      where: {
        userId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        job: true,
        notification: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async approveApplication(reviewId: string, userId: string, userNotes?: string) {
    const review = await prisma.applicationReview.findFirst({
      where: {
        id: reviewId,
        userId,
        status: 'PENDING',
      },
      include: {
        job: true,
        notification: true,
      },
    })

    if (!review) {
      throw new Error('Review not found or already processed')
    }

    // Update review status
    await prisma.applicationReview.update({
      where: { id: reviewId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        userNotes,
      },
    })

    // Submit the application
    await this.submitApplication(userId, review)

    return review
  }

  async rejectApplication(reviewId: string, userId: string, userNotes?: string) {
    return await prisma.applicationReview.update({
      where: {
        id: reviewId,
        userId,
      },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        userNotes,
      },
    })
  }

  private async submitApplication(userId: string, review: any): Promise<void> {
    // Create application record
    await prisma.application.create({
      data: {
        userId,
        jobTitle: review.job.title,
        company: review.job.company,
        jobDescription: review.job.description,
        jobUrl: review.job.url,
        location: review.job.location,
        salaryRange: review.job.salaryRange,
        employmentType: review.job.employmentType,
        status: 'APPLIED',
        coverLetter: review.coverLetter,
        matchScore: review.matchScore,
        source: review.job.source,
        sourceJobId: review.job.sourceJobId,
        notes: review.userNotes ? `User approved: ${review.userNotes}` : 'User approved application',
      },
    })

    // Mark job as applied
    await prisma.job.update({
      where: { id: review.jobId },
      data: { appliedTo: true },
    })

    // Update notification status
    await prisma.jobNotification.update({
      where: { id: review.notificationId },
      data: {
        status: 'APPLIED',
        respondedAt: new Date(),
      },
    })

    // Update review status
    await prisma.applicationReview.update({
      where: { id: review.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })
  }

  async processExpiredReviews(): Promise<number> {
    const expiredReviews = await prisma.applicationReview.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: new Date(),
        },
      },
      include: {
        notification: true,
      },
    })

    let processed = 0
    for (const review of expiredReviews) {
      await prisma.applicationReview.update({
        where: { id: review.id },
        data: { status: 'EXPIRED' },
      })

      await prisma.jobNotification.update({
        where: { id: review.notificationId },
        data: { status: 'EXPIRED' },
      })

      processed++
    }

    return processed
  }
}

export const jobNotificationService = JobNotificationService.getInstance()