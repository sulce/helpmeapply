import OpenAI from 'openai'
import { documentExtractor, ExtractedDocument } from './documentExtractor'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export interface ParsedContactInfo {
  fullName: string
  email: string
  phone: string
  address: string
  linkedin?: string
  website?: string
}

export interface ParsedExperience {
  id: string
  jobTitle: string
  company: string
  location: string
  startDate: string // YYYY-MM format
  endDate: string // YYYY-MM format or empty if current
  current: boolean
  description: string[]
}

export interface ParsedEducation {
  id: string
  degree: string
  institution: string
  location: string
  graduationDate: string // YYYY-MM format
  gpa?: string
  achievements: string[]
}

export interface ParsedSkill {
  id: string
  name: string
  category: 'Technical' | 'Soft' | 'Language' | 'Tool' | 'Framework'
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
}

export interface ParsedResumeData {
  contactInfo: ParsedContactInfo
  professionalSummary: string
  experience: ParsedExperience[]
  education: ParsedEducation[]
  skills: ParsedSkill[]
  certifications: string[]
  projects: string[]
  languages: string[]
  templateRegion: 'US' | 'UK' | 'CA' | 'EU' | 'Academic'
  includePhoto: boolean
}

export interface ResumeParsingResult {
  success: boolean
  data?: ParsedResumeData
  error?: string
  extractedText?: string
  confidence: number // 0-1 score of parsing confidence
  warnings: string[]
}

export class ResumeParser {
  private static instance: ResumeParser

  static getInstance(): ResumeParser {
    if (!ResumeParser.instance) {
      ResumeParser.instance = new ResumeParser()
    }
    return ResumeParser.instance
  }

  /**
   * Parse resume from file URL
   */
  async parseFromUrl(fileUrl: string): Promise<ResumeParsingResult> {
    try {
      // Extract text from document
      const extractedDoc = await documentExtractor.extractFromUrl(fileUrl)
      return this.parseFromExtractedDocument(extractedDoc)
    } catch (error) {
      console.error('Resume parsing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse resume',
        confidence: 0,
        warnings: []
      }
    }
  }

  /**
   * Parse resume from extracted document
   */
  async parseFromExtractedDocument(doc: ExtractedDocument): Promise<ResumeParsingResult> {
    try {
      const warnings: string[] = []

      // Validate document quality
      if (doc.metadata.wordCount < 50) {
        warnings.push('Resume appears very short - may be missing content')
      }

      if (doc.text.length < 200) {
        return {
          success: false,
          error: 'Resume text is too short to parse effectively',
          confidence: 0,
          warnings
        }
      }

      // Use AI to parse the resume into structured data
      const aiResult = await this.parseWithAI(doc.text)
      
      // Validate and enhance the parsed data
      const validatedData = this.validateAndEnhanceData(aiResult, doc)
      const confidence = this.calculateConfidence(validatedData, doc)

      // Add warnings based on confidence
      if (confidence < 0.7) {
        warnings.push('Some resume sections may not have been parsed correctly')
      }
      if (!validatedData.contactInfo.email) {
        warnings.push('Email address not found - please verify contact information')
      }
      if (validatedData.experience.length === 0) {
        warnings.push('No work experience found - this may need manual review')
      }

      return {
        success: true,
        data: validatedData,
        extractedText: doc.text,
        confidence,
        warnings
      }
    } catch (error) {
      console.error('Resume parsing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse resume',
        confidence: 0,
        warnings: []
      }
    }
  }

  /**
   * Use AI to parse resume text into structured data
   */
  private async parseWithAI(resumeText: string): Promise<ParsedResumeData> {
    const prompt = `
Parse this resume text into structured JSON data. Extract all relevant information accurately.

Resume Text:
${resumeText}

Return ONLY valid JSON in this exact structure:
{
  "contactInfo": {
    "fullName": "string",
    "email": "string", 
    "phone": "string",
    "address": "string (city, state format)",
    "linkedin": "string (optional)",
    "website": "string (optional)"
  },
  "professionalSummary": "string (extract summary/objective section)",
  "experience": [
    {
      "jobTitle": "string",
      "company": "string", 
      "location": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or empty if current",
      "current": boolean,
      "description": ["bullet point 1", "bullet point 2"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "location": "string", 
      "graduationDate": "YYYY-MM",
      "gpa": "string (optional)",
      "achievements": ["achievement 1", "achievement 2"]
    }
  ],
  "skills": [
    {
      "name": "skill name",
      "category": "Technical|Soft|Language|Tool|Framework", 
      "proficiency": "Beginner|Intermediate|Advanced|Expert"
    }
  ],
  "certifications": ["cert 1", "cert 2"],
  "projects": ["project 1", "project 2"],
  "languages": ["language 1", "language 2"]
}

Guidelines:
- Extract dates in YYYY-MM format (e.g., "2023-01", "2020-12")
- If only year is given, use "YYYY-01" format
- For current positions, set "endDate": "" and "current": true
- Categorize skills appropriately
- Estimate proficiency based on context (years, description)
- Include all work experience, even brief positions
- Extract achievements/accomplishments from education
- Include personal projects if mentioned
- Be accurate with names and titles
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume parser that extracts structured data from resumes. Always respond with valid JSON only, no markdown or additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 4000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from AI parser')
    }

    // Clean and parse JSON response
    let cleanedResponse = response.trim()
    
    // Remove markdown code blocks if present
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    
    // Remove any leading/trailing backticks
    cleanedResponse = cleanedResponse.replace(/^`+|`+$/g, '').trim()

    try {
      const parsed = JSON.parse(cleanedResponse)
      
      // Add IDs to arrays that need them
      if (parsed.experience) {
        parsed.experience = parsed.experience.map((exp: any, index: number) => ({
          ...exp,
          id: `exp-${Date.now()}-${index}`
        }))
      }
      
      if (parsed.education) {
        parsed.education = parsed.education.map((edu: any, index: number) => ({
          ...edu,
          id: `edu-${Date.now()}-${index}`
        }))
      }
      
      if (parsed.skills) {
        parsed.skills = parsed.skills.map((skill: any, index: number) => ({
          ...skill,
          id: `skill-${Date.now()}-${index}`
        }))
      }

      return parsed
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedResponse)
      throw new Error('AI returned invalid JSON response')
    }
  }

  /**
   * Validate and enhance parsed data
   */
  private validateAndEnhanceData(data: ParsedResumeData, doc: ExtractedDocument): ParsedResumeData {
    // Ensure required fields have defaults
    const validated: ParsedResumeData = {
      contactInfo: {
        fullName: data.contactInfo?.fullName || 'Name Not Found',
        email: data.contactInfo?.email || '',
        phone: data.contactInfo?.phone || '',
        address: data.contactInfo?.address || '',
        linkedin: data.contactInfo?.linkedin || undefined,
        website: data.contactInfo?.website || undefined,
      },
      professionalSummary: data.professionalSummary || '',
      experience: data.experience || [],
      education: data.education || [],
      skills: data.skills || [],
      certifications: data.certifications || [],
      projects: data.projects || [],
      languages: data.languages || [],
      templateRegion: 'US', // Default template
      includePhoto: false, // Default no photo
    }

    // Clean and validate experience dates
    validated.experience = validated.experience.map(exp => ({
      ...exp,
      startDate: this.validateDate(exp.startDate) || '',
      endDate: exp.current ? '' : (this.validateDate(exp.endDate) || ''),
      description: Array.isArray(exp.description) ? exp.description.filter(d => d && d.trim()) : []
    }))

    // Clean and validate education dates
    validated.education = validated.education.map(edu => ({
      ...edu,
      graduationDate: this.validateDate(edu.graduationDate) || '',
      achievements: Array.isArray(edu.achievements) ? edu.achievements.filter(a => a && a.trim()) : []
    }))

    // Validate skills
    validated.skills = validated.skills.map((skill: any) => ({
      ...skill,
      category: this.validateSkillCategory(skill.category),
      proficiency: this.validateProficiency(skill.proficiency)
    })).filter(skill => skill.name && skill.name.trim())

    return validated
  }

  /**
   * Validate date format (YYYY-MM)
   */
  private validateDate(date: string): string | null {
    if (!date) return null
    
    // Handle various date formats
    const dateStr = date.toString().trim()
    
    // Already in YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
      return dateStr
    }
    
    // YYYY format - add -01
    if (/^\d{4}$/.test(dateStr)) {
      return `${dateStr}-01`
    }
    
    // MM/YYYY or MM-YYYY format
    const mmYyyy = dateStr.match(/^(\d{1,2})[-\/](\d{4})$/)
    if (mmYyyy) {
      const month = mmYyyy[1].padStart(2, '0')
      return `${mmYyyy[2]}-${month}`
    }
    
    // YYYY/MM or YYYY-MM format
    const yyyyMm = dateStr.match(/^(\d{4})[-\/](\d{1,2})$/)
    if (yyyyMm) {
      const month = yyyyMm[2].padStart(2, '0')
      return `${yyyyMm[1]}-${month}`
    }
    
    return null
  }

  /**
   * Validate skill category
   */
  private validateSkillCategory(category: string): 'Technical' | 'Soft' | 'Language' | 'Tool' | 'Framework' {
    const validCategories = ['Technical', 'Soft', 'Language', 'Tool', 'Framework']
    return validCategories.includes(category) ? category as any : 'Technical'
  }

  /**
   * Validate proficiency level
   */
  private validateProficiency(proficiency: string): 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' {
    const validProficiencies = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
    return validProficiencies.includes(proficiency) ? proficiency as any : 'Intermediate'
  }

  /**
   * Calculate parsing confidence score
   */
  private calculateConfidence(data: ParsedResumeData, doc: ExtractedDocument): number {
    let score = 0.0
    let factors = 0

    // Contact info completeness (30% weight)
    if (data.contactInfo.fullName && data.contactInfo.fullName !== 'Name Not Found') {
      score += 0.1
    }
    if (data.contactInfo.email && data.contactInfo.email.includes('@')) {
      score += 0.1
    }
    if (data.contactInfo.phone) {
      score += 0.1
    }
    factors += 0.3

    // Experience section (30% weight)
    if (data.experience.length > 0) {
      score += 0.15
      // Quality of experience data
      const hasValidDates = data.experience.some(exp => exp.startDate)
      const hasDescriptions = data.experience.some(exp => exp.description.length > 0)
      if (hasValidDates) score += 0.075
      if (hasDescriptions) score += 0.075
    }
    factors += 0.3

    // Skills section (20% weight)
    if (data.skills.length > 0) {
      score += 0.1
      if (data.skills.length >= 5) score += 0.1
    }
    factors += 0.2

    // Education section (10% weight)
    if (data.education.length > 0) {
      score += 0.1
    }
    factors += 0.1

    // Professional summary (10% weight)
    if (data.professionalSummary && data.professionalSummary.length > 50) {
      score += 0.1
    }
    factors += 0.1

    return Math.min(score, 1.0)
  }
}

// Export singleton instance
export const resumeParser = ResumeParser.getInstance()

// Helper function for easy use
export async function parseResumeFromUrl(fileUrl: string): Promise<ResumeParsingResult> {
  return resumeParser.parseFromUrl(fileUrl)
}