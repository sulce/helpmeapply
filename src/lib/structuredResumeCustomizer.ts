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
  professionalSummary?: string
  summary?: string  // Alternative field name for compatibility
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
      console.log('=== CUSTOMIZATION DEBUG ===')
      console.log('Job title (raw):', job.title)
      console.log('Job title (clean):', this.cleanJobTitle(job.title))
      console.log('Job description length:', job.description?.length)
      
      // Analyze job requirements and match with resume
      const jobAnalysis = await this.analyzeJobRequirements(job)
      console.log('Job analysis result:', jobAnalysis)
      
      const matchResult = this.matchResumeToJob(baseResume, jobAnalysis)
      console.log('Match result:', matchResult)

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
    // Use fast local analysis instead of slow OpenAI calls
    console.log('Using fast local job analysis (no AI calls)')
    return this.getFallbackJobAnalysis(job)
  }

  private extractTechnicalSkills(description: string, keywords: string[]): string[] {
    const commonTechSkills = [
      'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js', 'express',
      'java', 'spring', 'python', 'django', 'flask', 'php', 'laravel',
      'sql', 'mysql', 'postgresql', 'mongodb', 'redis',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 
      'git', 'ci/cd', 'jenkins', 'github actions',
      'api', 'rest', 'graphql', 'microservices'
    ]
    
    const description_lower = description.toLowerCase()
    const foundSkills = commonTechSkills.filter(skill => 
      description_lower.includes(skill.toLowerCase())
    )
    
    // Add keywords that look like technical skills
    const techKeywords = keywords.filter(keyword => 
      keyword.length > 2 && 
      (keyword.includes('.') || keyword.includes('/') || keyword.toUpperCase() === keyword)
    )
    
    return [...new Set([...foundSkills, ...techKeywords])]
  }

  private extractSoftSkills(description: string): string[] {
    const commonSoftSkills = [
      'leadership', 'communication', 'teamwork', 'problem solving',
      'analytical', 'creative', 'detail oriented', 'agile', 'scrum'
    ]
    
    const description_lower = description.toLowerCase()
    return commonSoftSkills.filter(skill => 
      description_lower.includes(skill.toLowerCase())
    )
  }

  private extractResponsibilities(description: string): string[] {
    // Extract bullet points or sentences that start with action verbs
    const actionVerbs = ['develop', 'build', 'design', 'implement', 'manage', 'lead', 'create']
    const sentences = description.split(/[.!?]/).map(s => s.trim())
    
    return sentences.filter(sentence => 
      actionVerbs.some(verb => sentence.toLowerCase().startsWith(verb))
    ).slice(0, 5) // Limit to 5 responsibilities
  }

  private extractExperienceLevel(description: string): string {
    const description_lower = description.toLowerCase()
    
    if (description_lower.includes('senior') || description_lower.includes('lead')) {
      return 'senior'
    } else if (description_lower.includes('junior') || description_lower.includes('entry')) {
      return 'junior'
    } else {
      return 'mid-level'
    }
  }

  private getFallbackJobAnalysis(job: JobDetails) {
    // Enhanced fast local analysis - much more comprehensive than before
    const description = job.description.toLowerCase()
    const cleanJobTitle = this.cleanJobTitle(job.title).toLowerCase()
    
    // Expanded tech skills list
    const commonTechSkills = [
      // Frontend
      'javascript', 'typescript', 'react', 'redux', 'vue', 'angular', 'html5', 'css3', 'sass', 'next.js', 'nuxt',
      // Backend
      'node.js', 'express', 'python', 'java', 'spring', 'spring boot', 'django', 'flask', 'php', 'laravel', '.net', 'c#',
      // Databases
      'sql', 'mysql', 'postgresql', 'mongodb', 'nosql', 'redis', 'elasticsearch', 'dynamodb',
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'cloudformation',
      // APIs & Architecture
      'rest', 'graphql', 'api', 'microservices', 'websocket', 'grpc',
      // Tools & Methodologies
      'git', 'jira', 'confluence', 'agile', 'scrum', 'kanban', 'figma'
    ]
    
    const commonSoftSkills = [
      'communication', 'leadership', 'teamwork', 'problem solving', 'problem-solving',
      'analytical', 'creative', 'detail oriented', 'collaboration', 'mentoring',
      'time management', 'adaptability', 'critical thinking'
    ]

    // Extract keywords from job title and description
    const titleKeywords = cleanJobTitle.split(/\s+/).filter(word => word.length > 2)
    const foundTechSkills = commonTechSkills.filter(skill => 
      description.includes(skill) || cleanJobTitle.includes(skill)
    )
    const foundSoftSkills = commonSoftSkills.filter(skill => 
      description.includes(skill.replace(/\s+/g, '').toLowerCase()) || cleanJobTitle.includes(skill)
    )

    // Extract experience requirements
    const experienceMatches = description.match(/(\d+)\+?\s*years?\s*of\s*(experience|exp)/gi) || []
    const experienceKeywords = experienceMatches.slice(0, 3) // Top 3 experience requirements

    // Extract specific framework/tool mentions
    const specificMentions: string[] = []
    const techMentions = description.match(/experience\s+with\s+([^.]+)/gi) || []
    techMentions.forEach(mention => {
      const tools = mention.replace(/experience\s+with\s+/gi, '').split(/[,\s]+and\s+|,\s+/)
      specificMentions.push(...tools.slice(0, 3)) // Limit to avoid spam
    })

    const allKeywords = [
      ...new Set([
        ...titleKeywords, 
        ...foundTechSkills, 
        ...foundSoftSkills,
        ...experienceKeywords,
        ...specificMentions.slice(0, 5) // Top 5 specific mentions
      ])
    ].filter(keyword => keyword && keyword.length > 2)

    console.log(`Fast analysis found ${foundTechSkills.length} tech skills, ${foundSoftSkills.length} soft skills, ${allKeywords.length} total keywords`)

    return {
      technicalSkills: foundTechSkills,
      softSkills: foundSoftSkills,
      experienceLevel: description.includes('senior') || description.includes('lead') ? 'senior' : 
                     description.includes('junior') || description.includes('entry') ? 'junior' : 'mid-level',
      keyResponsibilities: titleKeywords,
      keywords: allKeywords.slice(0, 10) // Limit to top 10 to keep summary readable
    }
  }

  private matchResumeToJob(resume: StructuredResumeData, jobAnalysis: any) {
    const keywordMatches: string[] = []
    const customizationNotes: string[] = []
    const relevantSkills: Skill[] = []
    let matchScore = 0

    // Enhanced skill matching with priority weighting
    for (const skill of resume.skills) {
      const skillName = skill.name.toLowerCase()
      
      // Direct keyword matching
      const directMatch = jobAnalysis.keywords?.some((keyword: string) =>
        skillName.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(skillName)
      )
      
      // Technical skills matching
      const techMatch = jobAnalysis.technicalSkills?.some((reqSkill: string) =>
        skillName.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(skillName)
      )
      
      // High-priority skills for full stack roles (prioritize frontend for this role)
      const frontendSkills = ['javascript', 'typescript', 'react', 'redux', 'html', 'css', 'vue', 'angular']
      const fullStackSkills = ['node.js', 'express', 'api', 'microservices', 'aws', 'docker']
      
      const isFrontendSkill = frontendSkills.some(tech =>
        skillName.includes(tech) || tech.includes(skillName)
      )
      const isFullStackSkill = fullStackSkills.some(tech =>
        skillName.includes(tech) || tech.includes(skillName)
      )
      const isHighPriorityTech = isFrontendSkill || isFullStackSkill

      if (directMatch || techMatch || isHighPriorityTech) {
        relevantSkills.push(skill)
        keywordMatches.push(skill.name)
        
        // Higher score for high-priority technologies, extra for frontend skills
        const baseScore = skill.proficiency === 'Expert' ? 4 :
                         skill.proficiency === 'Advanced' ? 3 :
                         skill.proficiency === 'Intermediate' ? 2 : 1
        const priorityMultiplier = isFrontendSkill ? 2.0 : // Frontend skills get highest priority
                                  isFullStackSkill ? 1.5 : // Full-stack skills get medium priority
                                  1 // Other skills get base score
        matchScore += baseScore * priorityMultiplier
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

    console.log('=== CUSTOMIZATION CHANGES ===')
    console.log('Original summary:', baseResume.professionalSummary || baseResume.summary || 'None')
    console.log('Original skills order:', baseResume.skills.map(s => s.name).slice(0, 5))
    console.log('Relevant skills found:', matchResult.relevantSkills.map((s: any) => s.name))
    console.log('Job keywords:', jobAnalysis.keywords || [])

    // Customize professional summary - handle both field names
    const baseSummary = baseResume.professionalSummary || baseResume.summary || ''
    const customizedSummary = this.customizeProfessionalSummary(
      baseSummary,
      job,
      jobAnalysis
    )
    
    // Add job-specific targeting to summary
    const cleanJobTitle = this.cleanJobTitle(job.title)
    const enhancedSummary = this.enhanceSummaryWithJobFocus(customizedSummary, cleanJobTitle, jobAnalysis.keywords || [])
    
    customized.professionalSummary = enhancedSummary
    customized.summary = enhancedSummary // Set both fields for compatibility
    
    console.log('Customized summary:', enhancedSummary)

    // Reorder and emphasize relevant skills
    customized.skills = this.reorderSkillsForJob(baseResume.skills, matchResult.relevantSkills)
    console.log('Reordered skills:', customized.skills.map(s => s.name).slice(0, 5))

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

    console.log('Customization complete. Changes made:', {
      summaryChanged: customized.professionalSummary !== (baseResume.professionalSummary || baseResume.summary),
      skillsReordered: JSON.stringify(customized.skills.slice(0, 3)) !== JSON.stringify(baseResume.skills.slice(0, 3)),
      keywordsFound: jobAnalysis.keywords?.length || 0
    })

    return customized
  }

  private customizeProfessionalSummary(
    originalSummary: string,
    job: JobDetails,
    jobAnalysis: any
  ): string {
    if (!originalSummary.trim()) {
      const cleanJobTitle = this.cleanJobTitle(job.title)
      return `Experienced professional with expertise seeking ${cleanJobTitle} opportunities to contribute technical skills and domain knowledge to drive business success.`
    }

    // Add job-specific keywords to the summary if they're not already there
    let enhanced = originalSummary
    const keywords = jobAnalysis.technicalSkills || []
    
    // Add a sentence about the target role if not already mentioned
    const cleanJobTitle = this.cleanJobTitle(job.title)
    if (!enhanced.toLowerCase().includes(cleanJobTitle.toLowerCase())) {
      enhanced = `${enhanced} Seeking opportunities as a ${cleanJobTitle} to leverage expertise and drive innovation.`
    }

    return enhanced
  }

  private enhanceSummaryWithJobFocus(
    summary: string, 
    jobTitle: string, 
    keywords: string[]
  ): string {
    // Create a more natural, job-focused summary (no debug headers)
    let enhanced = summary
    
    // Replace generic terms with job-specific ones
    if (jobTitle.toLowerCase().includes('full stack')) {
      enhanced = enhanced.replace(/API Developer/gi, 'Full Stack Developer')
      enhanced = enhanced.replace(/backend developer/gi, 'Full Stack Developer')
    }
    
    // Add role-specific expertise statement
    const roleSpecificLine = this.createRoleSpecificExpertise(jobTitle, keywords)
    if (roleSpecificLine) {
      enhanced = `${enhanced} ${roleSpecificLine}`
    }
    
    return enhanced
  }

  private createRoleSpecificExpertise(jobTitle: string, keywords: string[]): string {
    const title = jobTitle.toLowerCase()
    const relevantTechs = keywords.filter(k => 
      ['react', 'node.js', 'javascript', 'typescript', 'angular', 'vue', 'python', 'java'].includes(k.toLowerCase())
    )
    
    if (title.includes('full stack')) {
      const frontendTechs = relevantTechs.filter(tech => 
        ['react', 'javascript', 'typescript', 'angular', 'vue'].includes(tech.toLowerCase())
      )
      const backendTechs = relevantTechs.filter(tech => 
        ['node.js', 'python', 'java', 'api'].includes(tech.toLowerCase())
      )
      
      if (frontendTechs.length > 0 && backendTechs.length > 0) {
        return `Specialized in full-stack development with expertise in frontend technologies like ${frontendTechs.slice(0, 2).join(', ')} and backend systems using ${backendTechs.slice(0, 2).join(', ')}.`
      }
    }
    
    if (relevantTechs.length > 0) {
      return `Strong expertise in ${relevantTechs.slice(0, 3).join(', ')} with proven track record of delivering scalable solutions.`
    }
    
    return ''
  }

  private cleanJobTitle(rawTitle: string): string {
    // Clean up job titles that might contain company names or extra text
    // Examples: 
    // "Full Stack Developer (Frontend: React, Redux, JavaScript, TypeScript, HTML5, Next.js and Backend[...])" -> "Full Stack Developer"
    
    let cleaned = rawTitle
    
    // First, extract everything BEFORE the first parenthesis
    const beforeParens = rawTitle.split('(')[0].trim()
    if (beforeParens && beforeParens.length > 3) {
      cleaned = beforeParens
    } else {
      // Fallback: remove parenthetical content
      cleaned = cleaned.replace(/\s*\([^)]*\)/g, '')
    }
    
    // Remove company name patterns like "Company is hiring:" or "Company -"
    cleaned = cleaned.replace(/^[^:]*:\s*/i, '') // Remove "Company is hiring: "
    cleaned = cleaned.replace(/^[^-]*-\s*/i, '') // Remove "Company - "
    
    // Remove location patterns at the end like " in City" or " - City"  
    cleaned = cleaned.replace(/\s+in\s+[^,]*$/i, '') // Remove " in Toronto"
    cleaned = cleaned.replace(/\s*-\s*[^,]*$/i, '') // Remove " - Toronto"
    cleaned = cleaned.replace(/,\s*[^,]*$/i, '') // Remove ", Toronto" 
    
    // Clean up extra whitespace
    cleaned = cleaned.trim()
    
    console.log(`Job title cleaned: "${rawTitle}" -> "${cleaned}"`)
    return cleaned || rawTitle // Fallback to original if cleaning resulted in empty string
  }

  private reorderSkillsForJob(allSkills: Skill[], relevantSkills: Skill[]): Skill[] {
    // Put relevant skills first, then others
    const relevantIds = new Set(relevantSkills.map(s => s.id))
    const otherSkills = allSkills.filter(s => !relevantIds.has(s.id))
    
    // Boost proficiency of relevant skills to make them more prominent
    const boostedRelevantSkills = relevantSkills.map(skill => ({
      ...skill,
      proficiency: this.boostProficiency(skill.proficiency),
      category: skill.category // Keep original category clean
    }))
    
    console.log('Boosted relevant skills:', boostedRelevantSkills.map(s => `${s.name} (${s.proficiency})`))
    
    return [...boostedRelevantSkills, ...otherSkills]
  }

  private boostProficiency(current: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'): 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' {
    // Boost proficiency level for relevant skills (but cap at Expert)
    switch (current) {
      case 'Beginner': return 'Intermediate'
      case 'Intermediate': return 'Advanced'
      case 'Advanced': return 'Expert'
      case 'Expert': return 'Expert'
      default: return current
    }
  }

  private enhanceExperienceForJob(experience: Experience[], keywords: string[]): Experience[] {
    // Enhance experience by prioritizing relevant accomplishments and emphasizing keywords
    return experience.map((exp, index) => {
      const enhanced = { ...exp }
      
      // Reorder description bullets to prioritize job-relevant ones first
      const relevantDescriptions: string[] = []
      const otherDescriptions: string[] = []
      
      exp.description.forEach(desc => {
        // Check if this description contains job-relevant keywords
        const descLower = desc.toLowerCase()
        const hasRelevantKeywords = keywords.some(keyword => 
          descLower.includes(keyword.toLowerCase())
        )
        
        if (hasRelevantKeywords) {
          relevantDescriptions.push(desc) // Keep relevant descriptions as-is
        } else {
          otherDescriptions.push(desc)
        }
      })
      
      // Add a job-specific accomplishment to the most recent role
      if (index === 0 && keywords.length > 0) {
        const relevantTech = keywords.find(k => 
          ['react', 'node.js', 'javascript', 'typescript', 'python', 'java', 'aws'].includes(k.toLowerCase())
        )
        if (relevantTech) {
          const jobSpecificBullet = `Applied ${relevantTech} expertise to architect and deliver enterprise-grade solutions that enhanced system performance and user experience`
          relevantDescriptions.unshift(jobSpecificBullet)
        }
      }
      
      // Put relevant descriptions first, then others
      enhanced.description = [...relevantDescriptions, ...otherDescriptions]
      
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