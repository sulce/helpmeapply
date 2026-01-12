import { PrismaClient } from '@prisma/client'
import { analyzeJobMatch, generateCoverLetter } from './openai'
import { createJobSearchService, JobSearchParams, NormalizedJob } from './jobAPIs'
import { ResumeCustomizationService } from './resumeCustomizationService'
import { queueManager } from './queue/QueueManager' // New abstracted queue interface

const prisma = new PrismaClient()

interface JobListing {
  title: string
  company: string
  description?: string
  url?: string
  location?: string
  salaryRange?: string
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP' | 'REMOTE'
  source: string
  sourceJobId?: string
  canAutoApply?: boolean
}

export class JobScanner {
  private static instance: JobScanner
  private isScanning = false

  static getInstance(): JobScanner {
    if (!JobScanner.instance) {
      JobScanner.instance = new JobScanner()
    }
    return JobScanner.instance
  }

  async scanAndProcessJobs(userId: string): Promise<{ processed: number; applied: number }> {
    if (this.isScanning) {
      throw new Error('Job scanning already in progress')
    }

    this.isScanning = true
    let processed = 0

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          autoApplySettings: true,
          skills: true,
        },
      })

      if (!profile) {
        return { processed: 0, applied: 0 }
      }

      console.log('🏗️ STAGE 1: Fetching and filtering jobs (non-AI)')
      
      // STAGE 1: Synchronous non-AI filtering - get jobs immediately
      const jobListings = await this.fetchJobsFromSources(profile, profile.autoApplySettings || {})
      
      console.log(`📦 Found ${jobListings.length} jobs from sources`)
      
      // Process jobs with non-AI filtering only
      for (const job of jobListings) {
        if (await this.shouldSkipJob(job, profile.autoApplySettings || {}, userId)) {
          continue
        }

        const savedJob = await this.saveJobListing(job)
        processed++

        // Always create a scan record so jobs appear immediately in frontend
        await this.createUserJobScan(profile.userId, savedJob.id)
        
        // STAGE 2: Queue job for background AI analysis (if AI is enabled)
        if (profile.autoApplySettings?.isEnabled) {
          await this.queueJobForAIAnalysis(savedJob.id, userId)
        }
      }

      console.log(`✅ STAGE 1 COMPLETE: ${processed} jobs processed and available immediately`)
      console.log(`🔄 STAGE 2: Queued ${processed} jobs for background AI analysis`)

      return { processed, applied: 0 } // AI analysis happens in background
    } catch (error) {
      console.error('Job scanning error:', error)
      throw error
    } finally {
      this.isScanning = false
    }
  }

  private async queueJobForAIAnalysis(jobId: string, userId: string): Promise<void> {
    try {
      // STAGE 2: Queue job for background AI analysis using abstracted interface
      // Business logic doesn't know if this uses Database/Redis/SQS queue
      await queueManager.enqueueAIAnalysis(jobId, userId)
      console.log(`🔄 Queued job ${jobId} for AI analysis`)
    } catch (error) {
      console.error(`Failed to queue job ${jobId} for AI analysis:`, error)
      // Don't throw - allow job scanning to continue even if queuing fails
    }
  }

  private async fetchJobsFromSources(profile: any, settings: any): Promise<JobListing[]> {
    const allJobs: JobListing[] = []
    
    try {
      // Import preference resolver
      const { resolveJobPreferences } = await import('./preferenceResolver')
      
      // Use job search service with automatic fallback
      const jsearchApiKey = process.env.JSEARCH_API_KEY
      console.log('JobScanner - API Key check:', jsearchApiKey ? `✓ Found (${jsearchApiKey.length} chars)` : '✗ Missing')
      const jobAPI = createJobSearchService(jsearchApiKey)
      
      // Use preference resolver instead of direct field access
      const preferences = await resolveJobPreferences(profile.userId)
      
      console.log('JobScanner - Resolved preferences:')
      console.log(`  Query: "${preferences.query}"`)
      console.log(`  Location: "${preferences.location || 'Any'}"`)
      console.log(`  Employment types: [${preferences.employmentTypes.join(', ')}]`)
      console.log(`  Source: ${preferences.source}`)

      // Parse job titles from preferences - handle both single titles and OR combinations
      const rawJobTitles = preferences.query.includes(' OR ') 
        ? preferences.query.split(' OR ').map(t => t.trim())
        : [preferences.query]
      
      // Filter out generic titles and get up to 3 specific job titles
      const jobTitles = rawJobTitles
        .filter(title => title && title !== 'software engineer' && title.length > 2)
        .slice(0, 3) // Limit to 3 job titles to avoid rate limiting
      
      if (jobTitles.length === 0) {
        console.log('JobScanner - No specific job titles found, skipping automated search')
        return allJobs
      }

      const location = preferences.location
      
      // Format location for JSearch API
      let formattedLocation = location === 'Remote' ? undefined : location
      if (formattedLocation && formattedLocation.toLowerCase() === 'toronto') {
        formattedLocation = 'Toronto, ON, Canada'
      }
      
      console.log(`JobScanner - Will search for ${jobTitles.length} job titles: [${jobTitles.join(', ')}]`)
      
      // Search for each job title separately to get more diverse results
      for (const jobTitle of jobTitles) {
        try {
          // Format query according to JSearch API docs: include location in query
          const queryWithLocation = formattedLocation 
            ? `${jobTitle} jobs in ${formattedLocation.replace(', ON, Canada', '').replace(', Ontario', '').replace('Toronto, ON, Canada', 'Toronto')}`
            : `${jobTitle} jobs`
          
          const searchParams: JobSearchParams = {
            query: queryWithLocation,
            location: formattedLocation,
            datePosted: 'week',
            employmentTypes: preferences.employmentTypes.length > 0 ? preferences.employmentTypes : undefined,
            page: 1,
            numPages: 2  // Fetch 2 pages per job title (2 * 3 titles = up to 6 pages total)
          }

          console.log(`JobScanner - Searching: "${jobTitle}" in "${formattedLocation || 'Any location'}"`)
          const response = await jobAPI.searchJobs(searchParams)
          const normalizedJobs = response.jobs.map(job => this.normalizeJobToListing(job))
          console.log(`JobScanner - Found ${normalizedJobs.length} jobs for "${jobTitle}"`)
          
          allJobs.push(...normalizedJobs)

          // Small delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          console.error(`Error searching jobs for ${jobTitle}:`, error)
        }
      }
    } catch (error) {
      console.error('Error fetching jobs from APIs:', error)
      // The service already includes fallback, so if we get here it's a critical error
      return []
    }

    const deduplicatedJobs = this.deduplicateJobs(allJobs)
    console.log(`JobScanner - Total unique jobs after deduplication: ${deduplicatedJobs.length}`)
    return deduplicatedJobs
  }

  private normalizeJobToListing(job: NormalizedJob): JobListing {
    return {
      title: job.title,
      company: job.company,
      description: job.description,
      url: job.url,
      location: job.location,
      salaryRange: job.salaryRange,
      employmentType: this.mapEmploymentType(job.employmentType),
      source: job.source,
      sourceJobId: job.sourceJobId,
      canAutoApply: job.source === 'indeed',
    }
  }

  private mapEmploymentType(type?: string): JobListing['employmentType'] {
    if (!type) return 'FULL_TIME'
    
    const upperType = type.toUpperCase()
    if (upperType.includes('PART') || upperType.includes('PART_TIME')) return 'PART_TIME'
    if (upperType.includes('CONTRACT') || upperType.includes('CONTRACTOR')) return 'CONTRACT'
    if (upperType.includes('FREELANCE') || upperType.includes('CONSULTANT')) return 'FREELANCE'
    if (upperType.includes('INTERN')) return 'INTERNSHIP'
    if (upperType.includes('REMOTE')) return 'REMOTE'
    
    return 'FULL_TIME'
  }

  private getMockJobs(profile: any): JobListing[] {
    const jobTitlePrefs = JSON.parse(profile.jobTitlePrefs || '[]')
    const preferredLocations = JSON.parse(profile.preferredLocations || '[]')
    
    return [
      {
        title: jobTitlePrefs[0] || 'Software Engineer',
        company: 'Tech Corp',
        description: 'Looking for an experienced software engineer to join our team...',
        url: 'https://linkedin.com/job/123',
        location: preferredLocations[0] || 'Remote',
        salaryRange: '80,000 - 120,000',
        employmentType: 'FULL_TIME',
        source: 'mock',
        sourceJobId: 'mock_123',
      },
      {
        title: jobTitlePrefs[0] || 'Frontend Developer',
        company: 'Startup Inc',
        description: 'Join our growing team as a frontend developer...',
        url: 'https://indeed.com/job/456',
        location: preferredLocations[0] || 'San Francisco, CA',
        salaryRange: '70,000 - 100,000',
        employmentType: 'FULL_TIME',
        source: 'mock',
        sourceJobId: 'mock_456',
      },
    ]
  }

  private deduplicateJobs(jobs: JobListing[]): JobListing[] {
    const seen = new Map<string, JobListing>()
    
    jobs.forEach(job => {
      const key = `${job.company.toLowerCase()}-${job.title.toLowerCase()}`
      const existingJob = seen.get(key)
      
      if (!existingJob) {
        seen.set(key, job)
      } else {
        // Keep the job with more complete information
        if (job.description && job.description.length > (existingJob.description?.length || 0)) {
          seen.set(key, job)
        }
      }
    })
    
    return Array.from(seen.values())
  }

  private async shouldSkipJob(job: JobListing, settings: any, userId: string): Promise<boolean> {
    const existingJob = await prisma.job.findFirst({
      where: {
        OR: [
          { sourceJobId: job.sourceJobId },
          {
            AND: [
              { title: job.title },
              { company: job.company },
            ],
          },
        ],
      },
    })

    if (existingJob) {
      return true
    }

    const existingApplication = await prisma.application.findFirst({
      where: {
        userId,
        company: job.company,
        jobTitle: job.title,
      },
    })

    if (existingApplication) {
      return true
    }

    const excludedCompanies = JSON.parse(settings.excludedCompanies || '[]') as string[]
    if (excludedCompanies.some(company => 
      job.company.toLowerCase().includes(company.toLowerCase())
    )) {
      return true
    }

    const excludedKeywords = JSON.parse(settings.excludedKeywords || '[]') as string[]
    const jobText = `${job.title} ${job.description || ''}`.toLowerCase()
    if (excludedKeywords.some(keyword => 
      jobText.includes(keyword.toLowerCase())
    )) {
      return true
    }

    if (settings.requireSalaryRange && !job.salaryRange) {
      return true
    }

    return false
  }

  private async saveJobListing(job: JobListing) {
    return await prisma.job.create({
      data: {
        title: job.title,
        company: job.company,
        description: job.description,
        url: job.url,
        location: job.location,
        salaryRange: job.salaryRange,
        employmentType: job.employmentType,
        source: job.source,
        sourceJobId: job.sourceJobId,
        isProcessed: false,
        appliedTo: false,
      },
    })
  }

  private async evaluateJobMatch(job: any, profile: any, settings: any) {
    try {
      const matchAnalysis = await analyzeJobMatch({
        profile: {
          fullName: profile.fullName,
          jobTitlePrefs: JSON.parse(profile.jobTitlePrefs || '[]'),
          yearsExperience: profile.yearsExperience || 0,
          skills: profile.skills || [],
          preferredLocations: JSON.parse(profile.preferredLocations || '[]'),
          employmentTypes: JSON.parse(profile.employmentTypes || '[]'),
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

      // Skip cover letter generation during scanning - generate when user applies
      let coverLetter = ''
      console.log(`Skipping cover letter generation during scan for: ${job.title} at ${job.company}`)

      await prisma.job.update({
        where: { id: job.id },
        data: {
          matchScore: matchAnalysis.matchScore,
          isProcessed: true,
        },
      })

      return {
        matchScore: matchAnalysis.matchScore,
        analysis: matchAnalysis,
        coverLetter,
      }
    } catch (error) {
      console.error('Error evaluating job match:', error)
      return {
        matchScore: 0,
        analysis: null,
        coverLetter: '',
      }
    }
  }

  private async createUserJobScan(userId: string, jobId: string) {
    try {
      await prisma.userJobScan.create({
        data: {
          userId,
          jobId,
          scannedAt: new Date()
        }
      })
      console.log(`Created scan record for user ${userId} and job ${jobId}`)
    } catch (error) {
      // Ignore duplicate scan records (unique constraint)
      if (error instanceof Error && error.message.includes('duplicate key')) {
        console.log(`Scan record already exists for user ${userId} and job ${jobId}`)
      } else {
        console.error('Error creating user job scan:', error)
      }
    }
  }

  private async createJobNotification(job: any, profile: any, matchScore: number, coverLetter: string) {
    try {
      // Set expiration time based on reviewTimeoutHours setting
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + (profile.autoApplySettings?.reviewTimeoutHours || 24))

      // Don't customize resumes during job scanning - only store the flag for later
      let customizedResumeUrl = null
      if (profile.autoApplySettings?.customizeResume && profile.resumeUrl) {
        // Use original resume URL for notifications - customization happens when user applies
        customizedResumeUrl = profile.resumeUrl
        console.log(`Resume customization enabled - will customize when user applies to: ${job.title} at ${job.company}`)
      }

      // Don't generate cover letters during job scanning - generate them when user applies
      let finalCoverLetter = coverLetter || ''
      console.log(`Cover letter will be generated when user applies to: ${job.title} at ${job.company}`)

      console.log(`Creating notification with userId: ${profile.userId}, jobId: ${job.id}`)
      
      await prisma.jobNotification.create({
        data: {
          userId: profile.userId,
          jobId: job.id,
          matchScore,
          status: 'PENDING',
          message: `Found a ${Math.round(matchScore * 100)}% match: ${job.title} at ${job.company}`,
          customizedResume: customizedResumeUrl,
          coverLetter: finalCoverLetter,
          expiresAt,
        },
      })

      console.log(`Created notification for ${job.title} at ${job.company} (Match: ${Math.round(matchScore * 100)}%) - requires approval`)
    } catch (error) {
      console.error('Error creating job notification:', error)
      throw error
    }
  }

  private async autoApplyToJob(job: any, profile: any, matchScore: number, coverLetter: string) {
    try {
      const { getJobSourceInfo } = await import('./jobSourceDetector')
      const sourceInfo = getJobSourceInfo(job.url || '')
      
      // Only attempt real automation for supported platforms
      if (sourceInfo.source === 'GREENHOUSE' || sourceInfo.source === 'LEVER') {
        try {
          // Attempt real automation for Greenhouse/Lever
          const automationResult = await this.attemptRealAutomation(job, profile, coverLetter, sourceInfo)
          
          if (automationResult.success) {
            // Real automation succeeded
            await this.createApplicationRecord(job, profile, {
              status: 'APPLIED',
              notes: `Auto-applied via ${sourceInfo.displayName} application form`,
              source: `automated_${sourceInfo.source.toLowerCase()}`,
              matchScore,
              coverLetter,
              appliedTo: true
            })
            console.log(`✅ Successfully auto-applied to ${job.title} at ${job.company} via ${sourceInfo.displayName}`)
          } else {
            // Automation failed - requires manual
            await this.createApplicationRecord(job, profile, {
              status: 'REVIEWING',
              notes: `Auto-apply to ${sourceInfo.displayName} failed - manual application required. ${automationResult.error || ''}`,
              source: `manual_${sourceInfo.source.toLowerCase()}`,
              matchScore,
              coverLetter,
              appliedTo: false
            })
            console.log(`⚠️ Auto-apply failed for ${job.title} at ${job.company} - requires manual application`)
          }
        } catch (error) {
          // Automation error - requires manual
          await this.createApplicationRecord(job, profile, {
            status: 'REVIEWING',
            notes: `Auto-apply to ${sourceInfo.displayName} encountered error - manual application required`,
            source: `manual_${sourceInfo.source.toLowerCase()}`,
            matchScore,
            coverLetter,
            appliedTo: false
          })
          console.log(`❌ Auto-apply error for ${job.title} at ${job.company} - requires manual application`)
        }
      } else {
        // No automation available - create manual application record
        const platformName = sourceInfo.source === 'INDEED' ? 'Indeed website' : 
                             sourceInfo.source === 'LINKEDIN' ? 'LinkedIn' : 
                             sourceInfo.displayName || 'company website'
        
        await this.createApplicationRecord(job, profile, {
          status: 'REVIEWING',
          notes: `Manual application required - apply via ${platformName}`,
          source: `manual_${sourceInfo.source.toLowerCase()}`,
          matchScore,
          coverLetter,
          appliedTo: false
        })
        console.log(`📝 Flagged ${job.title} at ${job.company} for manual application via ${platformName}`)
      }
    } catch (error) {
      console.error('Error processing job application:', error)
      throw error
    }
  }

  private async createApplicationRecord(job: any, profile: any, options: {
    status: 'APPLIED' | 'REVIEWING',
    notes: string,
    source: string,
    matchScore: number,
    coverLetter: string,
    appliedTo: boolean
  }) {
    await prisma.application.create({
      data: {
        userId: profile.userId,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
        jobUrl: job.url,
        location: job.location,
        salaryRange: job.salaryRange,
        employmentType: job.employmentType,
        status: options.status,
        coverLetter: options.coverLetter,
        matchScore: options.matchScore,
        source: options.source,
        sourceJobId: job.sourceJobId,
        notes: options.notes,
      },
    })

    await prisma.job.update({
      where: { id: job.id },
      data: { appliedTo: options.appliedTo },
    })
  }

  private async attemptRealAutomation(job: any, profile: any, coverLetter: string, sourceInfo: any) {
    try {
      console.log(`Attempting real automation for ${job.title} at ${job.company} via ${sourceInfo.displayName}`)
      
      // Create form data for automation API
      const formData = new FormData()
      formData.append('firstName', profile.fullName?.split(' ')[0] || '')
      formData.append('lastName', profile.fullName?.split(' ').slice(1).join(' ') || '')
      formData.append('email', profile.email || '')
      formData.append('phone', profile.mobile || '')
      formData.append('jobUrl', job.url || '')
      formData.append('jobTitle', job.title)
      formData.append('company', job.company)
      formData.append('platform', sourceInfo.source)
      formData.append('coverLetter', coverLetter || '')
      
      // Add resume file if available
      if (profile.resumeUrl) {
        // Create a blob from the resume URL for upload
        const resumeResponse = await fetch(profile.resumeUrl)
        if (resumeResponse.ok) {
          const resumeBlob = await resumeResponse.blob()
          formData.append('resume', resumeBlob, 'resume.pdf')
        }
      }
      
      // Call the real automation API
      const response = await fetch('/api/auto-apply', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        console.log(`✅ Real automation succeeded: ${result.message}`)
        return {
          success: true,
          platform: sourceInfo.source,
          method: 'automated',
          details: result.details || result.message
        }
      } else {
        console.log(`❌ Real automation failed: ${result.error}`)
        return {
          success: false,
          error: result.error || 'Automation API returned failure'
        }
      }
    } catch (error) {
      console.log(`❌ Real automation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown automation error'
      }
    }
  }

  async getJobQueueStatus(userId: string) {
    const pendingJobs = await prisma.jobQueue.count({
      where: {
        userId,
        status: 'PENDING',
      },
    })

    const processingJobs = await prisma.jobQueue.count({
      where: {
        userId,
        status: 'PROCESSING',
      },
    })

    const failedJobs = await prisma.jobQueue.count({
      where: {
        userId,
        status: 'FAILED',
      },
    })

    return { pendingJobs, processingJobs, failedJobs }
  }

  async scheduleJobScan(userId: string) {
    await prisma.jobQueue.create({
      data: {
        type: 'user_job_scan',
        payload: JSON.stringify({ scanId: `scan_${Date.now()}` }),
        userId,
        status: 'PENDING',
        priority: 1,
      },
    })
  }
}

export const jobScanner = JobScanner.getInstance()