import { generateStructuredResumePDF } from './structuredPdfGenerator'
import { analyzeJobMatch } from './openai'

interface ContactInfo {
  fullName: string
  email: string
  phone: string
  address: string
  linkedin?: string
  website?: string
}

interface Experience {
  id: string
  jobTitle: string
  company: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  description: string[]
}

interface Education {
  id: string
  degree: string
  institution: string
  location: string
  graduationDate: string
  gpa?: string
  achievements: string[]
}

interface Skill {
  id: string
  name: string
  category: string
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
}

interface StructuredResumeData {
  contactInfo: ContactInfo
  professionalSummary: string
  experience: Experience[]
  education: Education[]
  skills: Skill[]
  certifications: string[]
  projects: string[]
  languages: string[]
}

interface JobDetails {
  id: string
  title: string
  company: string
  description: string
  requirements: string[]
}

interface CustomizedResumeResult {
  customizedResumeData: StructuredResumeData
  customizedPdfUrl: string
  customizationNotes: string[]
  keywordMatches: string[]
  matchScore: number
}

export class StructuredResumeCustomizer {
  private static instance: StructuredResumeCustomizer

  static getInstance(): StructuredResumeCustomizer {
    if (!StructuredResumeCustomizer.instance) {
      StructuredResumeCustomizer.instance = new StructuredResumeCustomizer()
    }
    return StructuredResumeCustomizer.instance
  }

  async customizeResumeForJob(
    baseResume: StructuredResumeData,
    job: JobDetails,
    userId: string
  ): Promise<CustomizedResumeResult> {
    try {
      // Analyze job requirements and match with resume
      const jobAnalysis = await this.analyzeJobRequirements(job)
      const matchResult = this.matchResumeToJob(baseResume, jobAnalysis)

      // Create customized version
      const customizedResume = this.createCustomizedResume(
        baseResume,
        job,
        jobAnalysis,
        matchResult
      )

      // Generate PDF from customized data
      const pdfUrl = await generateStructuredResumePDF(customizedResume, userId)

      return {
        customizedResumeData: customizedResume,
        customizedPdfUrl: pdfUrl,
        customizationNotes: matchResult.customizationNotes,
        keywordMatches: matchResult.keywordMatches,
        matchScore: matchResult.matchScore
      }
    } catch (error) {
      console.error('Resume customization error:', error)
      throw new Error('Failed to customize resume for job')
    }
  }

  private async analyzeJobRequirements(job: JobDetails) {
    // Extract key requirements from job description
    const prompt = `
      Analyze this job posting and extract key requirements:
      
      Title: ${job.title}
      Company: ${job.company}
      Description: ${job.description}
      
      Please extract:
      1. Required technical skills
      2. Required soft skills
      3. Experience level needed
      4. Key responsibilities
      5. Important keywords for ATS
      
      Format as JSON with arrays for each category.
    `

    try {
      const analysis = await analyzeJobMatch({
        profile: {
          fullName: 'User',
          skills: [],
          jobTitlePrefs: [],
          preferredLocations: [],
          employmentTypes: []
        },
        jobDescription: {
          title: job.title,
          company: job.company,
          description: job.description || '',
          requirements: []
        }
      })
      return typeof analysis === 'string' ? JSON.parse(analysis) : analysis
    } catch (error) {
      console.warn('Job analysis failed, using fallback', error)
      return this.getFallbackJobAnalysis(job)
    }
  }

  private getFallbackJobAnalysis(job: JobDetails) {
    // Basic keyword extraction as fallback
    const description = job.description.toLowerCase()
    const commonTechSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'aws',
      'docker', 'kubernetes', 'git', 'agile', 'scrum', 'typescript'
    ]
    const commonSoftSkills = [
      'communication', 'leadership', 'teamwork', 'problem solving',
      'analytical', 'creative', 'detail oriented'
    ]

    return {
      technicalSkills: commonTechSkills.filter(skill => description.includes(skill)),
      softSkills: commonSoftSkills.filter(skill => description.includes(skill.replace(' ', ''))),
      experienceLevel: description.includes('senior') ? 'senior' : 
                     description.includes('junior') ? 'junior' : 'mid-level',
      keyResponsibilities: [job.title.toLowerCase()],
      keywords: [...commonTechSkills, ...commonSoftSkills].filter(
        keyword => description.includes(keyword)
      )
    }
  }

  private matchResumeToJob(resume: StructuredResumeData, jobAnalysis: any) {
    const keywordMatches: string[] = []
    const customizationNotes: string[] = []
    const relevantSkills: Skill[] = []
    let matchScore = 0

    // Match skills
    for (const skill of resume.skills) {
      const skillName = skill.name.toLowerCase()
      const isRelevant = jobAnalysis.technicalSkills?.some((reqSkill: string) =>
        skillName.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(skillName)
      ) || jobAnalysis.keywords?.some((keyword: string) =>
        skillName.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(skillName)
      )

      if (isRelevant) {
        relevantSkills.push(skill)
        keywordMatches.push(skill.name)
        matchScore += skill.proficiency === 'Expert' ? 4 :
                     skill.proficiency === 'Advanced' ? 3 :
                     skill.proficiency === 'Intermediate' ? 2 : 1
      }
    }

    // Match experience
    let experienceMatch = 0
    for (const exp of resume.experience) {
      const expText = `${exp.jobTitle} ${exp.description.join(' ')}`.toLowerCase()
      const jobKeywords = jobAnalysis.keywords || []
      
      const keywordCount = jobKeywords.filter((keyword: string) =>
        expText.includes(keyword.toLowerCase())
      ).length

      experienceMatch += keywordCount
      if (keywordCount > 0) {
        customizationNotes.push(`${exp.jobTitle} experience aligns with job requirements`)
      }
    }

    // Calculate overall match score (0-1)
    const maxPossibleScore = (jobAnalysis.technicalSkills?.length || 5) * 4 + 
                            (jobAnalysis.keywords?.length || 5)
    matchScore = Math.min((matchScore + experienceMatch) / maxPossibleScore, 1)

    // Add customization suggestions
    if (relevantSkills.length > 0) {
      customizationNotes.push(`Highlighted ${relevantSkills.length} relevant skills`)
    }
    if (keywordMatches.length > 0) {
      customizationNotes.push(`Optimized for ${keywordMatches.length} key terms`)
    }

    return {
      keywordMatches,
      customizationNotes,
      relevantSkills,
      matchScore,
      jobAnalysis
    }
  }

  private createCustomizedResume(
    baseResume: StructuredResumeData,
    job: JobDetails,
    jobAnalysis: any,
    matchResult: any
  ): StructuredResumeData {
    // Create a deep copy of the base resume
    const customized: StructuredResumeData = JSON.parse(JSON.stringify(baseResume))

    // Customize professional summary
    customized.professionalSummary = this.customizeProfessionalSummary(
      baseResume.professionalSummary,
      job,
      jobAnalysis
    )

    // Reorder and emphasize relevant skills
    customized.skills = this.reorderSkillsForJob(baseResume.skills, matchResult.relevantSkills)

    // Enhance experience descriptions with relevant keywords
    customized.experience = this.enhanceExperienceForJob(
      baseResume.experience,
      jobAnalysis.keywords || []
    )

    // Prioritize relevant education and certifications
    customized.education = this.prioritizeEducationForJob(baseResume.education, job)
    customized.certifications = this.prioritizeCertificationsForJob(
      baseResume.certifications,
      jobAnalysis.keywords || []
    )

    return customized
  }

  private customizeProfessionalSummary(
    originalSummary: string,
    job: JobDetails,
    jobAnalysis: any
  ): string {
    if (!originalSummary.trim()) {
      return `Experienced professional with expertise in ${job.title.toLowerCase()} seeking to contribute technical skills and domain knowledge to drive business success.`
    }

    // Add job-specific keywords to the summary if they're not already there
    let enhanced = originalSummary
    const keywords = jobAnalysis.technicalSkills || []
    
    // Add a sentence about the target role if not already mentioned
    if (!enhanced.toLowerCase().includes(job.title.toLowerCase())) {
      enhanced = `${enhanced} Seeking opportunities in ${job.title.toLowerCase()} roles to leverage expertise and drive innovation.`
    }

    return enhanced
  }

  private reorderSkillsForJob(allSkills: Skill[], relevantSkills: Skill[]): Skill[] {
    // Put relevant skills first, then others
    const relevantIds = new Set(relevantSkills.map(s => s.id))
    const otherSkills = allSkills.filter(s => !relevantIds.has(s.id))
    
    return [...relevantSkills, ...otherSkills]
  }

  private enhanceExperienceForJob(experience: Experience[], keywords: string[]): Experience[] {
    // For each experience entry, check if we can naturally incorporate keywords
    return experience.map(exp => {
      const enhanced = { ...exp }
      
      // Don't modify descriptions artificially - keep them authentic
      // The reordering and skills emphasis is enough for ATS optimization
      
      return enhanced
    })
  }

  private prioritizeEducationForJob(education: Education[], job: JobDetails): Education[] {
    // Sort education by relevance to the job
    return education.sort((a, b) => {
      const aRelevant = this.isEducationRelevant(a, job)
      const bRelevant = this.isEducationRelevant(b, job)
      
      if (aRelevant && !bRelevant) return -1
      if (bRelevant && !aRelevant) return 1
      return 0
    })
  }

  private isEducationRelevant(education: Education, job: JobDetails): boolean {
    const jobTitle = job.title.toLowerCase()
    const degree = education.degree.toLowerCase()
    
    // Simple relevance matching
    if (jobTitle.includes('engineer') && degree.includes('engineering')) return true
    if (jobTitle.includes('computer') && degree.includes('computer')) return true
    if (jobTitle.includes('data') && degree.includes('data')) return true
    if (jobTitle.includes('business') && degree.includes('business')) return true
    
    return false
  }

  private prioritizeCertificationsForJob(certifications: string[], keywords: string[]): string[] {
    // Sort certifications by relevance to job keywords
    return certifications.sort((a, b) => {
      const aRelevant = keywords.some(keyword => 
        a.toLowerCase().includes(keyword.toLowerCase())
      )
      const bRelevant = keywords.some(keyword => 
        b.toLowerCase().includes(keyword.toLowerCase())
      )
      
      if (aRelevant && !bRelevant) return -1
      if (bRelevant && !aRelevant) return 1
      return 0
    })
  }
}

export const structuredResumeCustomizer = StructuredResumeCustomizer.getInstance()