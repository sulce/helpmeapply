import { z } from 'zod'

// API Response Schemas
export const jobSearchResponseSchema = z.object({
  status: z.string(),
  request_id: z.string(),
  parameters: z.object({
    query: z.string(),
    page: z.number().optional(),
    num_pages: z.number().optional(),
    location: z.string().optional(),
    date_posted: z.string().optional(),
    job_requirements: z.string().optional(),
    employment_types: z.union([z.string(), z.array(z.string())]).optional(),
  }),
  data: z.array(z.object({
    job_id: z.string(),
    employer_name: z.string(),
    employer_logo: z.string().nullable(),
    employer_website: z.string().nullable(),
    employer_company_type: z.string().nullable().optional(),
    job_publisher: z.string(),
    job_employment_type: z.string(),
    job_title: z.string(),
    job_apply_link: z.string(),
    job_apply_is_direct: z.boolean(),
    job_apply_quality_score: z.number().optional(),
    job_description: z.string(),
    job_is_remote: z.boolean(),
    job_posted_at_timestamp: z.number().nullable(),
    job_posted_at_datetime_utc: z.string().nullable(),
    job_city: z.string().nullable(),
    job_state: z.string().nullable(),
    job_country: z.string(),
    job_latitude: z.number().nullable(),
    job_longitude: z.number().nullable(),
    job_benefits: z.array(z.string()).nullable(),
    job_google_link: z.string().nullable(),
    job_offer_expiration_datetime_utc: z.string().nullable().optional(),
    job_offer_expiration_timestamp: z.number().nullable().optional(),
    job_required_experience: z.object({
      no_experience_required: z.boolean().optional(),
      required_experience_in_months: z.number().nullable(),
      experience_mentioned: z.boolean().optional(),
      experience_preferred: z.boolean().optional(),
    }).optional(),
    job_required_skills: z.array(z.string()).nullable().optional(),
    job_required_education: z.object({
      postgraduate_degree: z.boolean().optional(),
      professional_certification: z.boolean().optional(),
      high_school: z.boolean().optional(),
      associates_degree: z.boolean().optional(),
      bachelors_degree: z.boolean().optional(),
      degree_mentioned: z.boolean().optional(),
      degree_preferred: z.boolean().optional(),
      professional_certification_mentioned: z.boolean().optional(),
    }).optional(),
    job_experience_in_place_of_education: z.boolean().optional(),
    job_min_salary: z.number().nullable(),
    job_max_salary: z.number().nullable(),
    job_salary_currency: z.string().nullable().optional(),
    job_salary_period: z.string().nullable(),
    job_highlights: z.object({
      Qualifications: z.array(z.string()).optional(),
      Responsibilities: z.array(z.string()).optional(),
      Benefits: z.array(z.string()).optional(),
    }).optional(),
    job_job_title: z.string().nullable().optional(),
    job_posting_language: z.string().optional(),
    job_onet_soc: z.string().nullable(),
    job_onet_job_zone: z.string().nullable(),
  })),
})

export const jobDetailsResponseSchema = z.object({
  status: z.string(),
  request_id: z.string(),
  parameters: z.object({
    job_id: z.string(),
  }),
  data: z.array(z.object({
    job_id: z.string(),
    employer_name: z.string(),
    employer_logo: z.string().nullable(),
    employer_website: z.string().nullable(),
    employer_company_type: z.string().nullable().optional(),
    employer_linkedin: z.string().nullable(),
    job_publisher: z.string(),
    job_employment_type: z.string(),
    job_title: z.string(),
    job_apply_link: z.string(),
    job_apply_is_direct: z.boolean(),
    job_apply_quality_score: z.number().optional(),
    apply_options: z.array(z.object({
      publisher: z.string(),
      apply_link: z.string(),
      is_direct: z.boolean(),
    })).optional(),
    job_description: z.string(),
    job_is_remote: z.boolean(),
    job_posted_at_timestamp: z.number().nullable(),
    job_posted_at_datetime_utc: z.string().nullable(),
    job_city: z.string().nullable(),
    job_state: z.string().nullable(),
    job_country: z.string(),
    job_latitude: z.number().nullable(),
    job_longitude: z.number().nullable(),
    job_benefits: z.array(z.string()).nullable(),
    job_google_link: z.string().nullable(),
    job_offer_expiration_datetime_utc: z.string().nullable().optional(),
    job_offer_expiration_timestamp: z.number().nullable().optional(),
    job_required_experience: z.object({
      no_experience_required: z.boolean().optional(),
      required_experience_in_months: z.number().nullable(),
      experience_mentioned: z.boolean().optional(),
      experience_preferred: z.boolean().optional(),
    }).optional(),
    job_required_skills: z.array(z.string()).nullable().optional(),
    job_required_education: z.object({
      postgraduate_degree: z.boolean().optional(),
      professional_certification: z.boolean().optional(),
      high_school: z.boolean().optional(),
      associates_degree: z.boolean().optional(),
      bachelors_degree: z.boolean().optional(),
      degree_mentioned: z.boolean().optional(),
      degree_preferred: z.boolean().optional(),
      professional_certification_mentioned: z.boolean().optional(),
    }).optional(),
    job_experience_in_place_of_education: z.boolean().optional(),
    job_min_salary: z.number().nullable(),
    job_max_salary: z.number().nullable(),
    job_salary_currency: z.string().nullable().optional(),
    job_salary_period: z.string().nullable(),
    job_highlights: z.object({
      Qualifications: z.array(z.string()).optional(),
      Responsibilities: z.array(z.string()).optional(),
      Benefits: z.array(z.string()).optional(),
    }).optional(),
    job_job_title: z.string().nullable().optional(),
    job_posting_language: z.string().optional(),
    job_onet_soc: z.string().nullable(),
    job_onet_job_zone: z.string().nullable(),
    estimated_salaries: z.array(z.object({
      location: z.string(),
      job_title: z.string(),
      publisher_name: z.string(),
      publisher_link: z.string(),
      min_salary: z.number(),
      max_salary: z.number(),
      median_salary: z.number(),
      salary_period: z.string(),
      salary_currency: z.string(),
    })).optional(),
    related_links: z.array(z.object({
      link: z.string(),
      text: z.string(),
    })).optional(),
  })),
})

export type JobSearchResponse = z.infer<typeof jobSearchResponseSchema>
export type JobDetailsResponse = z.infer<typeof jobDetailsResponseSchema>

// Normalized job interface for our database
export interface NormalizedJob {
  sourceJobId: string
  source: string
  originalSource?: string
  sourceInfo?: any // JobSourceInfo from jobSourceDetector
  title: string
  company: string
  description: string
  url: string
  location?: string
  salaryRange?: string
  employmentType?: string
  isRemote: boolean
  postedAt?: Date
  expiresAt?: Date
  requirements: string[]
  benefits?: string[]
  matchScore?: number
}

export interface JobSearchParams {
  query: string
  location?: string
  country?: string
  datePosted?: 'all' | 'today' | '3days' | 'week' | 'month'
  employmentTypes?: string[]
  jobRequirements?: string[]
  page?: number
  numPages?: number
}

export interface JobAPIResponse {
  jobs: NormalizedJob[]
  totalResults: number
  currentPage: number
  hasMore: boolean
}

// JSearch API implementation
export class JSearchAPI {
  private apiKey: string
  private baseUrl = 'https://jsearch.p.rapidapi.com'
  private rateLimit = {
    requestsPerMinute: 60,
    lastRequestTime: 0,
    requestCount: 0,
  }

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async rateLimitCheck(): Promise<void> {
    const now = Date.now()
    const minuteAgo = now - 60000

    if (this.rateLimit.lastRequestTime < minuteAgo) {
      this.rateLimit.requestCount = 0
    }

    if (this.rateLimit.requestCount >= this.rateLimit.requestsPerMinute) {
      const waitTime = 60000 - (now - this.rateLimit.lastRequestTime)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.rateLimit.requestCount = 0
    }

    this.rateLimit.requestCount++
    this.rateLimit.lastRequestTime = now
  }

  private async makeRequest(endpoint: string, params: Record<string, any>): Promise<any> {
    await this.rateLimitCheck()

    const url = new URL(`${this.baseUrl}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    console.log('JSearch API Request:', {
      endpoint,
      url: url.toString(),
      params
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('JSearch API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      throw new Error(`JSearch API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  async searchJobs(params: JobSearchParams): Promise<JobAPIResponse> {
    try {
      const apiParams: any = {
        query: params.query,
        page: params.page || 1,
        num_pages: params.numPages || 1,
        date_posted: params.datePosted || 'all',
      }

      if (params.country) {
        apiParams.country = params.country
      }

      if (params.employmentTypes && params.employmentTypes.length > 0) {
        // Map our employment types to JSearch format
        const jsearchTypes = params.employmentTypes.map(type => {
          switch (type.toUpperCase()) {
            case 'FULL_TIME': return 'FULLTIME'
            case 'PART_TIME': return 'PARTTIME'
            case 'CONTRACT': return 'CONTRACTOR'
            case 'FREELANCE': return 'CONTRACTOR'
            case 'INTERNSHIP': return 'INTERN'
            case 'REMOTE': return 'FULLTIME' // Remote is typically full-time
            default: return 'FULLTIME'
          }
        })
        // Remove duplicates and join
        apiParams.employment_types = [...new Set(jsearchTypes)].join(',')
      }

      if (params.jobRequirements && params.jobRequirements.length > 0) {
        apiParams.job_requirements = params.jobRequirements.join(',')
      }

      const response = await this.makeRequest('/search', apiParams)
      console.log('JSearch API Raw Response Sample:', {
        status: response.status,
        dataLength: response.data?.length,
        firstJob: response.data?.[0] ? {
          job_id: response.data[0].job_id,
          job_title: response.data[0].job_title,
          employer_name: response.data[0].employer_name,
          job_city: response.data[0].job_city,
          job_state: response.data[0].job_state,
          job_country: response.data[0].job_country,
          job_required_skills: response.data[0].job_required_skills,
          job_job_title: response.data[0].job_job_title
        } : 'No jobs'
      })
      
      // DEBUG: Log all job locations to understand what JSearch is returning
      console.log('JSearch API All Job Locations:', 
        response.data?.map((job: any, index: number) => ({
          index,
          city: job.job_city,
          state: job.job_state,
          country: job.job_country,
          formatted: job.job_city && job.job_state 
            ? `${job.job_city}, ${job.job_state}` 
            : job.job_city || job.job_state || job.job_country
        })) || []
      )
      
      const validatedResponse = jobSearchResponseSchema.parse(response)

      const normalizedJobs: NormalizedJob[] = validatedResponse.data.map(job => {
        // Use enhanced job source detection
        const { detectJobSource, getJobSourceInfo } = require('./jobSourceDetector')
        const sourceInfo = getJobSourceInfo(job.job_apply_link)
        
        return {
          sourceJobId: job.job_id,
          source: sourceInfo.source.toLowerCase(),
          originalSource: sourceInfo.source.toLowerCase(),
          sourceInfo: sourceInfo,
          title: job.job_title,
          company: job.employer_name,
          description: job.job_description,
          url: job.job_apply_link,
          location: job.job_city && job.job_state 
            ? `${job.job_city}, ${job.job_state}` 
            : job.job_city || job.job_state || job.job_country,
          salaryRange: job.job_min_salary && job.job_max_salary
            ? `$${job.job_min_salary.toLocaleString()} - $${job.job_max_salary.toLocaleString()}`
            : job.job_min_salary
            ? `From $${job.job_min_salary.toLocaleString()}`
            : job.job_max_salary
            ? `Up to $${job.job_max_salary.toLocaleString()}`
            : undefined,
          employmentType: job.job_employment_type,
          isRemote: job.job_is_remote,
          postedAt: job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc) : undefined,
          expiresAt: job.job_offer_expiration_datetime_utc ? new Date(job.job_offer_expiration_datetime_utc) : undefined,
          requirements: job.job_required_skills || [],
          benefits: job.job_benefits || [],
        }
      })

      return {
        jobs: normalizedJobs,
        totalResults: normalizedJobs.length,
        currentPage: apiParams.page,
        hasMore: normalizedJobs.length >= 10, // JSearch typically returns 10 results per page
      }
    } catch (error) {
      console.error('JSearch API error:', error)
      throw new Error('Failed to search jobs with JSearch API')
    }
  }

  async getJobDetails(jobId: string): Promise<NormalizedJob | null> {
    try {
      const response = await this.makeRequest('/job-details', { job_id: jobId })
      const validatedResponse = jobDetailsResponseSchema.parse(response)

      if (validatedResponse.data.length === 0) {
        return null
      }

      const job = validatedResponse.data[0]
      return {
        sourceJobId: job.job_id,
        source: 'jsearch',
        title: job.job_title,
        company: job.employer_name,
        description: job.job_description,
        url: job.job_apply_link,
        location: job.job_city && job.job_state 
          ? `${job.job_city}, ${job.job_state}` 
          : job.job_city || job.job_state || job.job_country,
        salaryRange: job.job_min_salary && job.job_max_salary
          ? `$${job.job_min_salary.toLocaleString()} - $${job.job_max_salary.toLocaleString()}`
          : job.job_min_salary
          ? `From $${job.job_min_salary.toLocaleString()}`
          : job.job_max_salary
          ? `Up to $${job.job_max_salary.toLocaleString()}`
          : undefined,
        employmentType: job.job_employment_type,
        isRemote: job.job_is_remote,
        postedAt: job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc) : undefined,
        expiresAt: job.job_offer_expiration_datetime_utc ? new Date(job.job_offer_expiration_datetime_utc) : undefined,
        requirements: job.job_required_skills || [],
        benefits: job.job_benefits || [],
      }
    } catch (error) {
      console.error('JSearch job details error:', error)
      throw new Error('Failed to get job details from JSearch API')
    }
  }
}

// Backup API using public job search endpoints
export class BackupJobAPI {
  async searchJobs(params: JobSearchParams): Promise<JobAPIResponse> {
    // This would implement backup job sources like public APIs or web scraping
    // For now, return mock data as fallback
    console.warn('Using backup job API with mock data')
    
    const mockJobs: NormalizedJob[] = [
      {
        sourceJobId: `backup_${Date.now()}_1`,
        source: 'backup',
        title: params.query,
        company: 'TechCorp Inc',
        description: `We are looking for a talented ${params.query} to join our team. This is a great opportunity for someone with strong technical skills.`,
        url: 'https://example.com/job/1',
        location: params.location || 'Remote',
        salaryRange: '$70,000 - $120,000',
        employmentType: 'Full-time',
        isRemote: !params.location || params.location.toLowerCase().includes('remote'),
        postedAt: new Date(),
        requirements: ['Experience in relevant technologies', 'Strong problem-solving skills'],
        benefits: ['Health insurance', 'Flexible working hours', 'Professional development'],
      },
      {
        sourceJobId: `backup_${Date.now()}_2`,
        source: 'backup',
        title: `Senior ${params.query}`,
        company: 'Innovation Labs',
        description: `Join our innovative team as a Senior ${params.query}. We offer competitive compensation and great benefits.`,
        url: 'https://example.com/job/2',
        location: params.location || 'San Francisco, CA',
        salaryRange: '$90,000 - $150,000',
        employmentType: 'Full-time',
        isRemote: false,
        postedAt: new Date(Date.now() - 86400000), // 1 day ago
        requirements: ['5+ years experience', 'Leadership skills'],
        benefits: ['Equity', '401k matching', 'Unlimited PTO'],
      },
    ]

    return {
      jobs: mockJobs,
      totalResults: mockJobs.length,
      currentPage: 1,
      hasMore: false,
    }
  }

  async getJobDetails(_jobId: string): Promise<NormalizedJob | null> {
    console.warn('Using backup job API for job details')
    return null
  }
}

// Enhanced job search service with fallback
export class JobSearchService {
  private primaryAPI: JSearchAPI | null = null
  private backupAPI: BackupJobAPI

  constructor(jsearchApiKey?: string) {
    if (jsearchApiKey) {
      this.primaryAPI = new JSearchAPI(jsearchApiKey)
    }
    this.backupAPI = new BackupJobAPI()
  }

  async searchJobs(params: JobSearchParams): Promise<JobAPIResponse> {
    // Try primary API first
    if (this.primaryAPI) {
      try {
        return await this.primaryAPI.searchJobs(params)
      } catch (error) {
        console.warn('Primary job API failed, falling back to backup:', error)
      }
    }

    // Fall back to backup API
    return await this.backupAPI.searchJobs(params)
  }

  async getJobDetails(jobId: string): Promise<NormalizedJob | null> {
    // Try primary API first
    if (this.primaryAPI) {
      try {
        return await this.primaryAPI.getJobDetails(jobId)
      } catch (error) {
        console.warn('Primary job API failed for details, falling back:', error)
      }
    }

    // Fall back to backup API
    return await this.backupAPI.getJobDetails(jobId)
  }
}

// Factory function for creating job APIs
export function createJobAPI(provider: 'jsearch', apiKey: string) {
  switch (provider) {
    case 'jsearch':
      return new JSearchAPI(apiKey)
    default:
      throw new Error(`Unsupported job API provider: ${provider}`)
  }
}

// Create job search service with automatic fallback
export function createJobSearchService(jsearchApiKey?: string) {
  return new JobSearchService(jsearchApiKey)
}