import { PrismaClient } from '@prisma/client'
import { analyzeJobMatch, generateCoverLetter } from './openai'
import { createJobSearchService, JobSearchParams, NormalizedJob } from './jobAPIs'
import { ResumeCustomizationService } from './resumeCustomizationService'

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
    let applied = 0

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          autoApplySettings: true,
          skills: true,
        },
      })

      if (!profile?.autoApplySettings) {
        return { processed: 0, applied: 0 }
      }

      const settings = profile.autoApplySettings
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const applicationsToday = await prisma.application.count({
        where: {
          userId,
          createdAt: {
            gte: today,
          },
        },
      })

      const maxDaily = settings.maxApplicationsPerDay || 10
      if (applicationsToday >= maxDaily) {
        console.log(`Daily application limit reached: ${applicationsToday}/${maxDaily}`)
        return { processed: 0, applied: 0 }
      }

      const jobListings = await this.fetchJobsFromSources(profile, settings)
      
      for (const job of jobListings) {
        if (applied >= (maxDaily - applicationsToday)) {
          break
        }

        if (await this.shouldSkipJob(job, settings, userId)) {
          continue
        }

        const savedJob = await this.saveJobListing(job)
        processed++

        if (settings.isEnabled) {
          const matchResult = await this.evaluateJobMatch(savedJob, profile, settings)
          
          // Check if job meets auto-apply threshold
          const meetsAutoApplyThreshold = matchResult.matchScore >= settings.minMatchScore
          // Check if job meets notification threshold  
          const meetsNotifyThreshold = matchResult.matchScore >= settings.notifyMinScore
          
          console.log(`Job match analysis: ${savedJob.title} at ${savedJob.company}`)
          console.log(`  Match Score: ${Math.round(matchResult.matchScore * 100)}%`)
          console.log(`  Auto-apply threshold (${Math.round(settings.minMatchScore * 100)}%): ${meetsAutoApplyThreshold}`)
          console.log(`  Notification threshold (${Math.round(settings.notifyMinScore * 100)}%): ${meetsNotifyThreshold}`)
          
          // ONLY process jobs that meet at least the notification threshold
          if (meetsNotifyThreshold) {
            if (meetsAutoApplyThreshold) {
              // High scoring job - check if we should auto-apply or need approval
              if (settings.requireApproval) {
                // Create notification for user review instead of auto-applying
                if (settings.notifyOnMatch) {
                  await this.createJobNotification(savedJob, profile, matchResult.matchScore, matchResult.coverLetter)
                }
              } else if (settings.autoApplyEnabled) {
                // Only auto-apply if explicitly enabled AND approval not required
                await this.autoApplyToJob(savedJob, profile, matchResult.matchScore, matchResult.coverLetter)
                applied++
              } else {
                // Auto-apply disabled - create notification if enabled
                if (settings.notifyOnMatch) {
                  await this.createJobNotification(savedJob, profile, matchResult.matchScore, matchResult.coverLetter)
                }
              }
            } else {
              // Medium scoring job (above notify threshold but below auto-apply threshold)
              if (settings.notifyOnMatch) {
                await this.createJobNotification(savedJob, profile, matchResult.matchScore, matchResult.coverLetter)
              }
            }
          } else {
            console.log(`  Skipping job - below notification threshold`)
            // Remove the job from database if it doesn't meet minimum threshold
            await prisma.job.delete({ where: { id: savedJob.id } })
            processed-- // Don't count this as processed
          }
        }
      }

      return { processed, applied }
    } catch (error) {
      console.error('Job scanning error:', error)
      throw error
    } finally {
      this.isScanning = false
    }
  }

  private async fetchJobsFromSources(profile: any, settings: any): Promise<JobListing[]> {
    const allJobs: JobListing[] = []
    
    try {
      // Use job search service with automatic fallback
      const jsearchApiKey = process.env.JSEARCH_API_KEY
      console.log('JobScanner - API Key check:', jsearchApiKey ? `✓ Found (${jsearchApiKey.length} chars)` : '✗ Missing')
      const jobAPI = createJobSearchService(jsearchApiKey)
      const jobTitlePrefs = JSON.parse(profile.jobTitlePrefs || '[]')
      const preferredLocations = JSON.parse(profile.preferredLocations || '[]')
      const employmentTypes = JSON.parse(profile.employmentTypes || '[]')
      
      console.log('JobScanner - Profile data:')
      console.log('  Job titles:', jobTitlePrefs)
      console.log('  Locations:', preferredLocations)
      console.log('  Employment types:', employmentTypes)

      // Search for each job title preference
      for (const jobTitle of jobTitlePrefs.slice(0, 3)) { // Limit to first 3 to manage API calls
        // If no preferred locations, don't search - user must specify locations
        if (preferredLocations.length === 0) {
          console.log(`JobScanner - Skipping job search for "${jobTitle}" - no preferred locations specified`)
          continue
        }

        for (const location of preferredLocations.slice(0, 2)) { // Limit to first 2 locations
          // Format location for JSearch API
          let formattedLocation = location === 'Remote' ? undefined : location
          if (formattedLocation && formattedLocation.toLowerCase() === 'toronto') {
            formattedLocation = 'Toronto, ON, Canada'
          }
          
          // Format query according to JSearch API docs: include location in query
          const queryWithLocation = formattedLocation 
            ? `${jobTitle} jobs in ${formattedLocation.replace(', ON, Canada', '').replace(', Ontario', '').replace('Toronto, ON, Canada', 'Toronto')}`
            : `${jobTitle} jobs`
          
          const searchParams: JobSearchParams = {
            query: queryWithLocation,
            country: 'Ca', // Canada country code for JSearch API
            datePosted: 'week',
            employmentTypes: employmentTypes.length > 0 ? employmentTypes : undefined,
            page: 1,
            numPages: 1
          }

          try {
            console.log(`JobScanner - Searching: "${jobTitle}" in "${formattedLocation || 'Remote'}"`)
            const response = await jobAPI.searchJobs(searchParams)
            const normalizedJobs = response.jobs.map(job => this.normalizeJobToListing(job))
            console.log(`JobScanner - Found ${normalizedJobs.length} jobs for ${jobTitle} in ${location}`)
            
            // Additional location filtering to ensure jobs match user preferences
            const locationFilteredJobs = normalizedJobs.filter(job => {
              console.log(`DEBUG - Job location: "${job.location}", User location: "${location}"`)
              
              if (!job.location) return formattedLocation === undefined // If no job location and we searched remote
              
              const jobLocation = job.location.toLowerCase()
              const userLocation = location.toLowerCase()
              
              console.log(`DEBUG - Comparing: "${jobLocation}" vs "${userLocation}"`)
              
              // Check if job location matches user preference
              if (location === 'Remote') {
                return jobLocation.includes('remote') || jobLocation.includes('anywhere')
              }
              
              // If job location is just country code "CA" and user is looking for Canadian locations
              if (jobLocation === 'ca' && (userLocation.includes('canada') || userLocation.includes('toronto') || userLocation.includes('ontario'))) {
                console.log(`DEBUG - Match result: true (Canadian job for Canadian location)`)
                return true
              }
              
              // For specific locations, check if job location contains user location
              const match = jobLocation.includes(userLocation) || 
                           jobLocation.includes(userLocation.split(',')[0]) // Check city name only
              
              console.log(`DEBUG - Match result: ${match}`)
              return match
            })
            
            console.log(`JobScanner - After location filtering: ${locationFilteredJobs.length}/${normalizedJobs.length} jobs for ${jobTitle} in ${location}`)
            allJobs.push(...locationFilteredJobs)

            // Add delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (error) {
            console.error(`Error searching jobs for ${jobTitle} in ${location}:`, error)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching jobs from APIs:', error)
      // The service already includes fallback, so if we get here it's a critical error
      return []
    }

    return this.deduplicateJobs(allJobs)
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
        salaryRange: '$80,000 - $120,000',
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
        salaryRange: '$70,000 - $100,000',
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

      // Generate cover letter for high-scoring jobs (above min threshold)
      let coverLetter = ''
      if (matchAnalysis.matchScore >= settings.notifyMinScore) {
        try {
          coverLetter = await generateCoverLetter({
            profile: {
              fullName: profile.fullName,
              jobTitlePrefs: JSON.parse(profile.jobTitlePrefs || '[]'),
              yearsExperience: profile.yearsExperience || 0,
              skills: profile.skills || [],
            },
            job: {
              title: job.title,
              company: job.company,
              description: job.description || '',
              requirements: [],
            },
          })
        } catch (error) {
          console.error('Error generating cover letter:', error)
        }
      }

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

  private async createJobNotification(job: any, profile: any, matchScore: number, coverLetter: string) {
    try {
      // Set expiration time based on reviewTimeoutHours setting
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + (profile.autoApplySettings?.reviewTimeoutHours || 24))

      // Generate proper customized resume if enabled
      let customizedResumeUrl = null
      if (profile.autoApplySettings?.customizeResume && profile.resumeUrl) {
        try {
          const customizationService = ResumeCustomizationService.getInstance()
          const customizationResult = await customizationService.customizeResume({
            originalResume: {
              url: profile.resumeUrl,
              filename: `${profile.fullName}_resume.pdf`
            },
            job: {
              title: job.title,
              company: job.company,
              description: job.description || '',
              requirements: []
            },
            profile: {
              fullName: profile.fullName,
              skills: profile.skills || [],
              jobTitlePrefs: JSON.parse(profile.jobTitlePrefs || '[]'),
              yearsExperience: profile.yearsExperience || 0
            }
          }, profile.userId)
          
          customizedResumeUrl = customizationResult.customizedPdfUrl || profile.resumeUrl
          console.log(`Resume customized successfully for: ${job.title} at ${job.company}`)
        } catch (error) {
          console.error('Error customizing resume:', error)
          // Fall back to original resume
          customizedResumeUrl = profile.resumeUrl
        }
      }

      // Generate proper cover letter if not provided
      let finalCoverLetter = coverLetter
      if (!finalCoverLetter || finalCoverLetter.trim().length === 0) {
        try {
          finalCoverLetter = await generateCoverLetter({
            profile: {
              fullName: profile.fullName,
              skills: profile.skills || [],
              jobTitlePrefs: JSON.parse(profile.jobTitlePrefs || '[]'),
              yearsExperience: profile.yearsExperience || 0
            },
            job: {
              title: job.title,
              company: job.company,
              description: job.description || '',
              requirements: []
            }
          })
          console.log(`Cover letter generated for: ${job.title} at ${job.company}`)
        } catch (error) {
          console.error('Error generating cover letter:', error)
          finalCoverLetter = '' // Leave empty if generation fails
        }
      }

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
          status: 'APPLIED',
          coverLetter,
          matchScore,
          source: job.source,
          sourceJobId: job.sourceJobId,
          notes: 'Auto-applied by AI assistant',
        },
      })

      await prisma.job.update({
        where: { id: job.id },
        data: { appliedTo: true },
      })

      console.log(`Auto-applied to ${job.title} at ${job.company} (Match: ${Math.round(matchScore * 100)}%)`)
    } catch (error) {
      console.error('Error auto-applying to job:', error)
      throw error
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
        jobId: `scan_${Date.now()}`,
        userId,
        status: 'PENDING',
        priority: 1,
      },
    })
  }
}

export const jobScanner = JobScanner.getInstance()