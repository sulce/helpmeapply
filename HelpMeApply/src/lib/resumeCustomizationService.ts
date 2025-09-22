import { analyzeJobMatch, extractJobRequirements } from './openai'
import { documentExtractor, ExtractedDocument } from './documentExtractor'
import { PDFGenerator } from './pdfGenerator'

export interface ResumeCustomizationRequest {
  originalResume: {
    content?: string
    url?: string
    filename?: string
  }
  job: {
    title: string
    company: string
    description: string
    requirements: string[]
  }
  profile: {
    fullName: string
    skills: Array<{
      name: string
      proficiency: string
      yearsUsed?: number
    }>
    jobTitlePrefs: string[]
    yearsExperience?: number
  }
}

export interface CustomizedResume {
  customizedContent: string
  customizationNotes: string[]
  keywordMatches: string[]
  suggestedImprovements: string[]
  originalText?: string
  extractedSections?: Array<{ title: string; content: string }>
  customizedPdfUrl?: string
}

export class ResumeCustomizationService {
  private static instance: ResumeCustomizationService

  static getInstance(): ResumeCustomizationService {
    if (!ResumeCustomizationService.instance) {
      ResumeCustomizationService.instance = new ResumeCustomizationService()
    }
    return ResumeCustomizationService.instance
  }

  async customizeResume(request: ResumeCustomizationRequest, userId?: string): Promise<CustomizedResume> {
    try {
      // Extract text from the original resume document
      let extractedDocument: ExtractedDocument | null = null
      let originalText = request.originalResume.content || ''

      if (request.originalResume.url && !request.originalResume.content) {
        console.log('Extracting text from resume document:', request.originalResume.url)
        try {
          extractedDocument = await documentExtractor.extractFromUrl(request.originalResume.url)
          originalText = extractedDocument.text
          console.log('Successfully extracted text:', originalText.length, 'characters')
          
          // Additional validation for extracted content
          if (originalText.length < 50 || this.isTextCorrupted(originalText)) {
            throw new Error('Extracted text appears corrupted or too short')
          }
        } catch (error) {
          console.warn('Failed to extract text from document:', error)
          // Fall back to generating a professional template based on user profile
          originalText = this.generateFallbackResumeContent(request.profile, request.job)
          extractedDocument = null
        }
      }

      // Extract key requirements from job description
      const jobRequirements = await extractJobRequirements(request.job.description)
      
      // Get user's relevant skills
      const relevantSkills = this.findRelevantSkills(request.profile.skills, jobRequirements)
      
      // Generate customization strategy with original resume content
      const customizationStrategy = this.createCustomizationStrategy(
        request.job,
        request.profile,
        relevantSkills,
        jobRequirements,
        originalText,
        extractedDocument?.sections
      )

      // Apply customizations
      const customizedContent = await this.applyCustomizations(
        {
          ...request.originalResume,
          content: originalText,
        },
        customizationStrategy,
        extractedDocument
      )

      // Generate PDF from customized content
      let customizedPdfUrl: string | undefined
      try {
        const pdfGenerator = PDFGenerator.getInstance()
        
        // Parse customized content into proper CV sections
        const sections = this.parseResumeIntoSections(customizedContent, extractedDocument?.sections)
        
        customizedPdfUrl = await pdfGenerator.generateResumePDF(
          customizedContent,
          {
            jobTitle: request.job.title,
            company: request.job.company,
            candidateName: request.profile.fullName,
            sections,
            customizationNotes: customizationStrategy.notes,
            keywordMatches: customizationStrategy.keywordMatches,
            suggestedImprovements: customizationStrategy.improvements,
          },
          userId || 'unknown-user'
        )
        
        console.log('Customized resume PDF generated:', customizedPdfUrl)
      } catch (error) {
        console.error('PDF generation failed:', error)
        // Continue without PDF - the analysis is still valuable
      }

      return {
        customizedContent,
        customizationNotes: customizationStrategy.notes,
        keywordMatches: customizationStrategy.keywordMatches,
        suggestedImprovements: customizationStrategy.improvements,
        originalText,
        extractedSections: extractedDocument?.sections,
        customizedPdfUrl,
      }
    } catch (error) {
      console.error('Resume customization error:', error)
      throw new Error('Failed to customize resume')
    }
  }

  private findRelevantSkills(
    userSkills: ResumeCustomizationRequest['profile']['skills'],
    jobRequirements: string[]
  ): Array<{ skill: string; relevance: number; proficiency: string }> {
    const relevantSkills: Array<{ skill: string; relevance: number; proficiency: string }> = []

    userSkills.forEach(skill => {
      let relevance = 0
      const skillLower = skill.name.toLowerCase()

      // Check for exact matches
      jobRequirements.forEach(req => {
        const reqLower = req.toLowerCase()
        if (reqLower.includes(skillLower) || skillLower.includes(reqLower)) {
          relevance += 1.0
        }
      })

      // Check for partial matches and synonyms
      if (relevance === 0) {
        jobRequirements.forEach(req => {
          const reqWords = req.toLowerCase().split(/\s+/)
          const skillWords = skillLower.split(/\s+/)
          
          const commonWords = reqWords.filter(word => skillWords.includes(word))
          if (commonWords.length > 0) {
            relevance += commonWords.length * 0.3
          }
        })
      }

      if (relevance > 0) {
        relevantSkills.push({
          skill: skill.name,
          relevance,
          proficiency: skill.proficiency,
        })
      }
    })

    // Sort by relevance
    return relevantSkills.sort((a, b) => b.relevance - a.relevance)
  }

  private createCustomizationStrategy(
    job: ResumeCustomizationRequest['job'],
    profile: ResumeCustomizationRequest['profile'],
    relevantSkills: Array<{ skill: string; relevance: number; proficiency: string }>,
    jobRequirements: string[],
    originalText?: string,
    extractedSections?: Array<{ title: string; content: string }>
  ) {
    const strategy = {
      notes: [] as string[],
      keywordMatches: [] as string[],
      improvements: [] as string[],
      skillsToEmphasize: relevantSkills.slice(0, 10), // Top 10 relevant skills
      titleAlignment: this.findTitleAlignment(profile.jobTitlePrefs, job.title),
      originalContent: originalText,
      sections: extractedSections,
      sectionsToEnhance: [] as string[],
    }

    // Add customization notes
    strategy.notes.push(`Customized for ${job.title} at ${job.company}`)
    
    if (originalText) {
      strategy.notes.push(`Analyzed original resume content (${originalText.length} characters)`)
    }

    if (extractedSections && extractedSections.length > 0) {
      strategy.notes.push(`Identified ${extractedSections.length} resume sections`)
      strategy.sectionsToEnhance = this.identifySectionsToEnhance(extractedSections, jobRequirements)
    }
    
    if (strategy.skillsToEmphasize.length > 0) {
      strategy.notes.push(`Emphasized ${strategy.skillsToEmphasize.length} relevant skills`)
      strategy.keywordMatches.push(...strategy.skillsToEmphasize.map(s => s.skill))
    }

    if (strategy.titleAlignment.score > 0.5) {
      strategy.notes.push(`Aligned with target role: ${job.title}`)
    }

    // Analyze existing content for keyword matches
    if (originalText) {
      const existingKeywords = this.findExistingKeywords(originalText, jobRequirements)
      strategy.keywordMatches.push(...existingKeywords)
      if (existingKeywords.length > 0) {
        strategy.notes.push(`Found ${existingKeywords.length} existing keywords in resume`)
      }
    }

    // Add improvement suggestions
    const missingSkills = jobRequirements.filter(req => 
      !relevantSkills.some(skill => 
        skill.skill.toLowerCase().includes(req.toLowerCase()) ||
        req.toLowerCase().includes(skill.skill.toLowerCase())
      ) &&
      // Only suggest if not already in resume
      (!originalText || !originalText.toLowerCase().includes(req.toLowerCase()))
    )

    if (missingSkills.length > 0) {
      strategy.improvements.push(
        `Consider adding experience with: ${missingSkills.slice(0, 5).join(', ')}`
      )
    }

    if (profile.yearsExperience && profile.yearsExperience < 3) {
      strategy.improvements.push('Emphasize projects and achievements to compensate for limited experience')
    }

    // Suggest section enhancements
    if (strategy.sectionsToEnhance.length > 0) {
      strategy.improvements.push(
        `Strengthen these sections: ${strategy.sectionsToEnhance.join(', ')}`
      )
    }

    return strategy
  }

  private findTitleAlignment(jobTitlePrefs: string[], targetTitle: string) {
    let bestMatch = { title: '', score: 0 }
    
    jobTitlePrefs.forEach(pref => {
      const score = this.calculateTitleSimilarity(pref, targetTitle)
      if (score > bestMatch.score) {
        bestMatch = { title: pref, score }
      }
    })

    return bestMatch
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = title1.toLowerCase().split(/\s+/)
    const words2 = title2.toLowerCase().split(/\s+/)
    
    const commonWords = words1.filter(word => words2.includes(word))
    const totalWords = new Set([...words1, ...words2]).size
    
    return totalWords > 0 ? commonWords.length / totalWords : 0
  }

  private identifySectionsToEnhance(
    sections: Array<{ title: string; content: string }>,
    jobRequirements: string[]
  ): string[] {
    const sectionsToEnhance: string[] = []
    
    // Check which sections could be strengthened based on job requirements
    for (const section of sections) {
      const sectionContent = section.content.toLowerCase()
      const matchedRequirements = jobRequirements.filter(req => 
        sectionContent.includes(req.toLowerCase())
      )
      
      // If section has few matches but is important, suggest enhancement
      if (section.title.toLowerCase().includes('experience') && matchedRequirements.length < 3) {
        sectionsToEnhance.push(section.title)
      } else if (section.title.toLowerCase().includes('skill') && matchedRequirements.length < 2) {
        sectionsToEnhance.push(section.title)
      }
    }
    
    return sectionsToEnhance
  }

  private findExistingKeywords(resumeText: string, jobRequirements: string[]): string[] {
    const existingKeywords: string[] = []
    const resumeLower = resumeText.toLowerCase()
    
    for (const requirement of jobRequirements) {
      if (resumeLower.includes(requirement.toLowerCase())) {
        existingKeywords.push(requirement)
      }
    }
    
    return [...new Set(existingKeywords)] // Remove duplicates
  }

  private async applyCustomizations(
    originalResume: ResumeCustomizationRequest['originalResume'],
    strategy: any,
    extractedDocument?: ExtractedDocument | null
  ): Promise<string> {
    // Professional resume content - no AI branding
    const customizations: string[] = []

    // Add original resume content if available
    if (strategy.originalContent && strategy.originalContent.length > 10) {

      // If we have sections, customize each section
      if (strategy.sections && strategy.sections.length > 0) {
        for (const section of strategy.sections) {
          customizations.push(
            `[${section.title.toUpperCase()}]`,
            ''
          )

          // Enhance section content based on job requirements
          const enhancedContent = this.enhanceSectionContent(
            section.content,
            section.title,
            strategy
          )

          customizations.push(enhancedContent, '')
        }
      } else {
        // If no sections detected, use the full content
        customizations.push(
          '[PROFESSIONAL EXPERIENCE]',
          '',
          this.enhanceFullContent(strategy.originalContent, strategy),
          ''
        )
      }
    }

    // No optimization details - keep the CV clean and professional

    return customizations.join('\n')
  }

  private enhanceSectionContent(content: string, sectionTitle: string, strategy: any): string {
    const relevantSkills = strategy.skillsToEmphasize || []
    const keywords = strategy.keywordMatches || []
    
    let enhancedContent = content

    // Add skill emphasis for relevant sections
    if (sectionTitle.toLowerCase().includes('skill')) {
      const skillList = relevantSkills.slice(0, 5).map((skill: any) => 
        `• ${skill.skill} (${skill.proficiency})`
      ).join('\n')
      
      if (skillList) {
        enhancedContent = `${content}\n\nKEY SKILLS FOR THIS ROLE:\n${skillList}`
      }
    }

    // Enhance experience sections
    if (sectionTitle.toLowerCase().includes('experience')) {
      const keywordHints = keywords.slice(0, 3).join(', ')
      if (keywordHints) {
        enhancedContent += `\n\n[HIGHLIGHT: Emphasize experience with ${keywordHints}]`
      }
    }

    return enhancedContent
  }

  private enhanceFullContent(content: string, strategy: any): string {
    const keywords = strategy.keywordMatches || []
    const skills = strategy.skillsToEmphasize || []
    
    let enhancedContent = content

    // Add keyword emphasis hints
    if (keywords.length > 0) {
      enhancedContent += `\n\n[OPTIMIZATION NOTE: This resume has been analyzed and optimized to highlight: ${keywords.slice(0, 10).join(', ')}]`
    }

    if (skills.length > 0) {
      enhancedContent += `\n\n[SKILL EMPHASIS: Focus on demonstrating: ${skills.slice(0, 5).map((s: any) => s.skill).join(', ')}]`
    }

    return enhancedContent
  }

  async generateResumeVariants(
    originalResume: ResumeCustomizationRequest['originalResume'],
    profile: ResumeCustomizationRequest['profile'],
    jobCategories: string[]
  ): Promise<Record<string, string>> {
    const variants: Record<string, string> = {}

    for (const category of jobCategories) {
      // Create a mock job for this category
      const mockJob = {
        title: category,
        company: 'Target Company',
        description: `Looking for an experienced ${category} to join our team...`,
        requirements: this.getCommonRequirementsForCategory(category),
      }

      const customizationRequest: ResumeCustomizationRequest = {
        originalResume,
        job: mockJob,
        profile,
      }

      try {
        const customized = await this.customizeResume(customizationRequest)
        variants[category] = customized.customizedContent
      } catch (error) {
        console.error(`Error creating variant for ${category}:`, error)
        variants[category] = 'Error generating variant'
      }
    }

    return variants
  }

  private parseResumeIntoSections(content: string, extractedSections?: Array<{ title: string; content: string }>): Array<{ title: string; content: string }> {
    // If we have extracted sections from document analysis, use those
    if (extractedSections && extractedSections.length > 0) {
      return extractedSections
    }

    // Parse the resume content into proper CV sections
    const sections: Array<{ title: string; content: string }> = []
    
    // Split content by common section headers (case insensitive)
    const sectionRegex = /(?:^|\n)([A-Z][A-Z\s&-]{3,}?)(?:\s*[:\n]|\s*$)(.*?)(?=\n[A-Z][A-Z\s&-]{3,}?(?:\s*[:\n]|\s*$)|$)/gi
    const matches = [...content.matchAll(sectionRegex)]
    
    if (matches.length > 0) {
      for (const match of matches) {
        const title = match[1].trim()
        const content = match[2].trim()
        
        if (content && title) {
          // Clean up and standardize section titles
          let standardTitle = title
          if (title.toLowerCase().includes('skill')) standardTitle = 'Technical Skills'
          else if (title.toLowerCase().includes('experience')) standardTitle = 'Professional Experience'
          else if (title.toLowerCase().includes('education')) standardTitle = 'Education'
          else if (title.toLowerCase().includes('development') || title.toLowerCase().includes('cert')) standardTitle = 'Professional Development'
          else if (title.toLowerCase().includes('information') || title.toLowerCase().includes('language')) standardTitle = 'Additional Information'
          
          sections.push({ title: standardTitle, content: content })
        }
      }
    }

    // If no structured sections found, extract contact info manually and create basic sections
    if (sections.length === 0) {
      const lines = content.split('\n').filter(line => line.trim())
      
      // Extract contact information (usually first few lines)
      const contactLines = []
      let i = 0
      while (i < lines.length && i < 6) {
        const line = lines[i].trim()
        // Stop if we hit a section header or long paragraph
        if (line.match(/^[A-Z][A-Z\s]{3,}$/) || line.length > 100) break
        if (line) contactLines.push(line)
        i++
      }
      
      if (contactLines.length > 0) {
        sections.push({ title: 'Contact Information', content: contactLines.join('\n') })
      }
      
      // Add remaining content as professional summary
      const remainingContent = lines.slice(i).join('\n').trim()
      if (remainingContent) {
        sections.push({ title: 'Professional Summary', content: remainingContent })
      }
    }

    return sections.length > 0 ? sections : [{ title: 'Resume', content: content.trim() }]
  }

  private getCommonRequirementsForCategory(category: string): string[] {
    const categoryRequirements: Record<string, string[]> = {
      'Software Engineer': [
        'Programming', 'Software Development', 'Problem Solving',
        'Algorithms', 'Data Structures', 'Version Control'
      ],
      'Frontend Developer': [
        'JavaScript', 'React', 'HTML', 'CSS', 'User Interface',
        'Responsive Design', 'Web Development'
      ],
      'Backend Developer': [
        'Server-side Development', 'APIs', 'Databases', 'Node.js',
        'Python', 'System Architecture'
      ],
      'Full Stack Developer': [
        'Frontend', 'Backend', 'JavaScript', 'React', 'Node.js',
        'Databases', 'Web Development'
      ],
      'Data Scientist': [
        'Machine Learning', 'Python', 'Statistics', 'Data Analysis',
        'SQL', 'Data Visualization'
      ],
      'Product Manager': [
        'Product Strategy', 'Roadmapping', 'Stakeholder Management',
        'Agile', 'User Research', 'Analytics'
      ],
    }

    return categoryRequirements[category] || [
      'Leadership', 'Communication', 'Problem Solving', 'Teamwork'
    ]
  }

  private isTextCorrupted(text: string): boolean {
    if (!text || text.length < 10) return true
    
    // Check for high ratio of non-printable or garbled characters
    const printableChars = text.match(/[a-zA-Z0-9\s\.\,\!\?\;\:\(\)\[\]\-\+\@\#\$\%\&\*\/\\'"]/g)
    const printableRatio = printableChars ? printableChars.length / text.length : 0
    
    if (printableRatio < 0.7) return true
    
    // Check for excessive single character sequences (common in corrupted PDFs)
    const singleCharPattern = /\b[a-zA-Z]\s[a-zA-Z]\s[a-zA-Z](?:\s[a-zA-Z]){3,}\b/g
    const singleCharMatches = text.match(singleCharPattern)
    if (singleCharMatches && singleCharMatches.length > 3) return true
    
    // Check if text has reasonable word structure
    const words = text.split(/\s+/).filter(word => word.length > 2)
    if (words.length < 10) return true
    
    return false
  }

  private generateFallbackResumeContent(profile: ResumeCustomizationRequest['profile'], job: ResumeCustomizationRequest['job']): string {
    const sections = []
    
    // Professional Summary
    sections.push('[PROFESSIONAL SUMMARY]')
    sections.push(`Experienced professional with ${profile.yearsExperience || 'several'} years of experience seeking opportunities in ${job.title} roles. Passionate about leveraging technical skills and domain expertise to drive business success.`)
    sections.push('')
    
    // Skills
    sections.push('[SKILLS]')
    if (profile.skills && profile.skills.length > 0) {
      const skillsByLevel = profile.skills.reduce((acc, skill) => {
        if (!acc[skill.proficiency]) acc[skill.proficiency] = []
        acc[skill.proficiency].push(skill.name)
        return acc
      }, {} as Record<string, string[]>)
      
      Object.entries(skillsByLevel).forEach(([level, skills]) => {
        sections.push(`${level.charAt(0).toUpperCase() + level.slice(1)} Skills: ${skills.join(', ')}`)
      })
    } else {
      sections.push('Technical skills and competencies relevant to the target role')
    }
    sections.push('')
    
    // Experience
    sections.push('[EXPERIENCE]')
    sections.push(`Professional Experience`)
    sections.push(`• Demonstrated expertise in areas relevant to ${job.title} positions`)
    sections.push(`• Strong problem-solving and analytical capabilities`)
    sections.push(`• Proven track record of delivering results in team environments`)
    sections.push('')
    
    // Education
    sections.push('[EDUCATION]')
    sections.push('Educational Background')
    sections.push('• Relevant academic background and professional development')
    sections.push('')
    
    return sections.join('\n')
  }
}

export const resumeCustomizationService = ResumeCustomizationService.getInstance()