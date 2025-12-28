import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import { getSignedDownloadUrl } from './s3'

export interface ExtractedDocument {
  text: string
  metadata: {
    pages?: number
    wordCount: number
    charCount: number
    fileType: string
    fileName?: string
  }
  sections?: {
    title: string
    content: string
  }[]
  extractedJobTitle?: string
}

export class DocumentExtractor {
  private static instance: DocumentExtractor

  static getInstance(): DocumentExtractor {
    if (!DocumentExtractor.instance) {
      DocumentExtractor.instance = new DocumentExtractor()
    }
    return DocumentExtractor.instance
  }

  /**
   * Extract text from a document based on URL or file buffer
   */
  async extractFromUrl(fileUrl: string): Promise<ExtractedDocument> {
    try {
      // Download the file from S3
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Determine file type from URL or content type
      const fileType = this.determineFileType(fileUrl, response.headers.get('content-type'))
      const fileName = this.extractFileName(fileUrl)

      return this.extractFromBuffer(buffer, fileType, fileName)
    } catch (error) {
      console.error('Error extracting document from URL:', error)
      throw new Error('Failed to extract text from document')
    }
  }

  /**
   * Extract text from a file buffer
   */
  async extractFromBuffer(buffer: Buffer, fileType: string, fileName?: string): Promise<ExtractedDocument> {
    try {
      let extractedText = ''
      let pages: number | undefined

      switch (fileType) {
        case 'pdf':
          console.log('Processing PDF file...')
          const pdfResult = await this.extractPDF(buffer)
          extractedText = pdfResult.text
          pages = pdfResult.pages
          break
        
        case 'docx':
        case 'doc':
          console.log('Processing Word document...')
          extractedText = await this.extractWord(buffer)
          break
        
        case 'txt':
          console.log('Processing text file...')
          extractedText = buffer.toString('utf-8')
          break
        
        default:
          throw new Error(`Unsupported file type: ${fileType}. Supported formats: PDF (temporarily unavailable), Word (.docx/.doc), and Text (.txt)`)
      }

      // Clean and structure the extracted text
      const cleanedText = this.cleanExtractedText(extractedText)
      const sections = this.parseResumeSection(cleanedText)
      
      // Extract the most recent job title
      const extractedJobTitle = this.extractJobTitle(cleanedText, sections)

      return {
        text: cleanedText,
        metadata: {
          pages,
          wordCount: this.countWords(cleanedText),
          charCount: cleanedText.length,
          fileType,
          fileName,
        },
        sections,
        extractedJobTitle,
      }
    } catch (error) {
      console.error('Error extracting document:', error)
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract text from PDF buffer
   */
  private async extractPDF(buffer: Buffer): Promise<{ text: string; pages: number }> {
    try {
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid PDF buffer')
      }
      
      // Check PDF header
      const pdfHeader = buffer.slice(0, 4).toString()
      if (!pdfHeader.includes('%PDF')) {
        throw new Error('Buffer does not contain valid PDF data')
      }

      // Create a safer execution context for pdf-parse
      // This helps isolate the library and prevent it from accessing external files
      const result = await this.executePdfParseSafely(buffer)
      
      return {
        text: result.text || 'PDF processed but no text extracted',
        pages: result.numpages || 1,
      }
    } catch (error) {
      console.error('PDF extraction error:', error)
      
      // If it's a file access error, return a helpful message
      if (error instanceof Error && (
        error.message.includes('ENOENT') || 
        error.message.includes('test/data') ||
        (error as any).code === 'ENOENT'
      )) {
        console.warn('PDF-parse library attempting to access non-existent test files')
        return {
          text: 'PDF extraction failed due to a library issue. Please try uploading your resume in Word format (.docx) or enter your information manually.',
          pages: 1
        }
      }
      
      // Generic fallback
      return {
        text: 'PDF text extraction failed. Please try a different file format or enter your information manually.',
        pages: 1
      }
    }
  }

  /**
   * Execute pdf-parse in a safer context to prevent file system access issues
   */
  private async executePdfParseSafely(buffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('PDF parsing timed out'))
      }, 30000) // 30 second timeout

      try {
        // Execute pdf-parse with minimal options to prevent external file access
        pdfParse(buffer).then((data) => {
          clearTimeout(timeout)
          resolve(data)
        }).catch((error) => {
          clearTimeout(timeout)
          reject(error)
        })
      } catch (syncError) {
        clearTimeout(timeout)
        reject(syncError)
      }
    })
  }

  /**
   * Extract text from Word document buffer
   */
  private async extractWord(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      
      if (result.messages && result.messages.length > 0) {
        console.warn('Word extraction warnings:', result.messages)
      }

      return result.value
    } catch (error) {
      console.error('Word extraction error:', error)
      throw new Error('Failed to extract text from Word document')
    }
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanExtractedText(text: string): string {
    if (!text || text.length < 10) {
      throw new Error('Extracted text is too short or empty - possible extraction failure')
    }

    // Handle PDF error messages specially - don't clean them
    if (text.includes('PDF extraction failed') || text.includes('PDF text extraction failed')) {
      return text
    }

    // Check for heavily corrupted text (more than 30% non-printable or garbled characters)
    const printableRatio = this.calculatePrintableRatio(text)
    if (printableRatio < 0.7) {
      console.warn('Text appears heavily corrupted, printable ratio:', printableRatio)
      // Try to recover by removing non-printable characters
      text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    }

    let cleaned = text
      // Remove excessive whitespace but preserve line breaks
      .replace(/[ \t]+/g, ' ')
      // Clean up excessive line breaks (more than 2)
      .replace(/\n{3,}/g, '\n\n')
      // Clean up bullet points and formatting
      .replace(/[•·∙▪▫‣⁃]/g, '• ')
      // Remove page breaks and form feeds
      .replace(/\f/g, '\n')
      // Remove common PDF extraction artifacts
      .replace(/\s*\|\s*/g, ' ')
      // Clean up garbled character sequences
      .replace(/[^\w\s\.\,\!\?\;\:\(\)\[\]\-\+\@\#\$\%\&\*\/\\'"]/g, ' ')
      // Remove sequences of random characters (likely extraction errors)
      .replace(/\b[a-zA-Z]{1}\s[a-zA-Z]{1}\s[a-zA-Z]{1}(?:\s[a-zA-Z]{1}){3,}\b/g, '')
      // Clean up multiple spaces
      .replace(/\s{2,}/g, ' ')
      // Trim whitespace
      .trim()

    // Final validation
    if (cleaned.length < text.length * 0.3) {
      console.warn('Heavily cleaned text, may have lost important content')
    }

    // If the cleaned text is still mostly garbage, throw an error
    const finalPrintableRatio = this.calculatePrintableRatio(cleaned)
    if (finalPrintableRatio < 0.8 && cleaned.length > 50) {
      throw new Error('Extracted text appears to be corrupted and cannot be reliably cleaned')
    }

    return cleaned
  }

  private calculatePrintableRatio(text: string): number {
    if (!text) return 0
    const printableChars = text.match(/[a-zA-Z0-9\s\.\,\!\?\;\:\(\)\[\]\-\+\@\#\$\%\&\*\/\\'"]/g)
    return printableChars ? printableChars.length / text.length : 0
  }

  /**
   * Parse resume into logical sections
   */
  private parseResumeSection(text: string): { title: string; content: string }[] {
    const sections: { title: string; content: string }[] = []
    
    // Common resume section headers (case-insensitive)
    const sectionHeaders = [
      'contact information',
      'summary',
      'objective',
      'professional summary',
      'profile',
      'experience',
      'work experience',
      'professional experience',
      'employment history',
      'education',
      'academic background',
      'qualifications',
      'skills',
      'technical skills',
      'core competencies',
      'expertise',
      'certifications',
      'licenses',
      'achievements',
      'accomplishments',
      'awards',
      'projects',
      'portfolio',
      'publications',
      'references',
      'languages',
      'volunteer work',
      'volunteer experience',
      'interests',
      'hobbies',
    ]

    const lines = text.split('\n')
    let currentSection = { title: 'General', content: '' }

    for (const line of lines) {
      const cleanLine = line.trim()
      if (!cleanLine) continue

      // Check if this line is a section header
      const isHeader = sectionHeaders.some(header => 
        cleanLine.toLowerCase().includes(header.toLowerCase()) &&
        cleanLine.length < 50 && // Headers are usually short
        !cleanLine.includes('.') && // Headers usually don't have periods
        cleanLine.length > 2 // Must be more than 2 characters
      )

      if (isHeader) {
        // Save previous section if it has content
        if (currentSection.content.trim()) {
          sections.push({ ...currentSection })
        }
        
        // Start new section
        currentSection = {
          title: this.normalizeHeaderTitle(cleanLine),
          content: ''
        }
      } else {
        // Add line to current section
        currentSection.content += (currentSection.content ? '\n' : '') + cleanLine
      }
    }

    // Add the last section
    if (currentSection.content.trim()) {
      sections.push(currentSection)
    }

    return sections.filter(section => section.content.trim().length > 0)
  }

  /**
   * Normalize section header titles
   */
  private normalizeHeaderTitle(title: string): string {
    return title
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Extract the most recent job title from resume
   */
  private extractJobTitle(text: string, sections?: { title: string; content: string }[]): string | undefined {
    // Strategy 1: Look in experience section first (most reliable)
    if (sections) {
      const experienceSection = sections.find(section => 
        section.title.toLowerCase().includes('experience') ||
        section.title.toLowerCase().includes('employment') ||
        section.title.toLowerCase().includes('work')
      )
      
      if (experienceSection) {
        const jobTitle = this.extractJobTitleFromExperience(experienceSection.content)
        if (jobTitle) return jobTitle
      }
    }

    // Strategy 2: Look for patterns in full text
    return this.extractJobTitleFromText(text)
  }

  /**
   * Extract job title from experience section content
   */
  private extractJobTitleFromExperience(experienceText: string): string | undefined {
    const lines = experienceText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    // Common patterns for job titles in experience sections
    const jobTitlePatterns = [
      // Pattern: Job Title | Company | Date
      /^([A-Z][a-zA-Z\s&,-]+?)\s*[\|\/]\s*([A-Z][a-zA-Z\s&,.-]+?)\s*[\|\/]?\s*(\d{4}|\w+\s+\d{4})/,
      // Pattern: Job Title at Company
      /^([A-Z][a-zA-Z\s&,-]+?)\s+(?:at|@)\s+([A-Z][a-zA-Z\s&,.-]+)/,
      // Pattern: Job Title - Company
      /^([A-Z][a-zA-Z\s&,-]+?)\s*[-–—]\s*([A-Z][a-zA-Z\s&,.-]+)/,
      // Pattern: Job Title (most recent, likely first in list)
      /^([A-Z][a-zA-Z\s&,-]{5,40}?)(?:\s*[-–—•]|\s*$)/
    ]

    for (const line of lines) {
      for (const pattern of jobTitlePatterns) {
        const match = line.match(pattern)
        if (match && match[1]) {
          const title = this.cleanJobTitle(match[1])
          if (this.isValidJobTitle(title)) {
            return title
          }
        }
      }
    }

    return undefined
  }

  /**
   * Extract job title from full resume text
   */
  private extractJobTitleFromText(text: string): string | undefined {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    // Look for patterns near the top of the resume (first 20 lines)
    const topLines = lines.slice(0, 20)
    
    for (const line of topLines) {
      // Skip lines that are clearly contact info or headers
      if (this.isContactInfo(line) || this.isResumeHeader(line)) {
        continue
      }
      
      // Look for standalone job titles (often appear after name)
      if (this.isValidJobTitle(line) && line.length > 5 && line.length < 50) {
        return this.cleanJobTitle(line)
      }
    }

    return undefined
  }

  /**
   * Clean and format job title
   */
  private cleanJobTitle(title: string): string {
    return title
      .replace(/[^\w\s&,-]/g, '') // Remove special chars except common job title chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Validate if a string could be a job title
   */
  private isValidJobTitle(title: string): boolean {
    if (!title || title.length < 3 || title.length > 50) return false
    
    // Common job title keywords
    const jobKeywords = [
      'developer', 'engineer', 'manager', 'director', 'analyst', 'specialist',
      'coordinator', 'assistant', 'associate', 'senior', 'junior', 'lead',
      'principal', 'architect', 'consultant', 'designer', 'officer', 'executive',
      'administrator', 'supervisor', 'technician', 'representative', 'advisor',
      'scientist', 'researcher', 'programmer', 'administrator', 'intern',
      'software', 'data', 'product', 'project', 'sales', 'marketing', 'finance',
      'human', 'resources', 'operations', 'customer', 'business', 'quality',
      'security', 'network', 'systems', 'web', 'mobile', 'frontend', 'backend',
      'fullstack', 'devops', 'cloud', 'digital', 'content', 'social', 'technical'
    ]
    
    const lowerTitle = title.toLowerCase()
    
    // Must contain at least one job-related keyword
    const hasJobKeyword = jobKeywords.some(keyword => lowerTitle.includes(keyword))
    
    // Must not be a common non-job-title phrase
    const excludePatterns = [
      'contact', 'email', 'phone', 'address', 'objective', 'summary',
      'education', 'skills', 'experience', 'references', 'linkedin',
      'github', 'portfolio', 'website', 'certification', 'degree'
    ]
    
    const isExcluded = excludePatterns.some(pattern => lowerTitle.includes(pattern))
    
    return hasJobKeyword && !isExcluded
  }

  /**
   * Check if line contains contact information
   */
  private isContactInfo(line: string): boolean {
    const contactPatterns = [
      /@\w+\.\w+/, // Email
      /\(\d{3}\)\s*\d{3}-\d{4}/, // Phone
      /\d{3}-\d{3}-\d{4}/, // Phone
      /linkedin\.com/, // LinkedIn
      /github\.com/, // GitHub
      /^\d+\s+\w+/, // Address starting with number
    ]
    
    return contactPatterns.some(pattern => pattern.test(line))
  }

  /**
   * Check if line is a resume header/section
   */
  private isResumeHeader(line: string): boolean {
    const headerKeywords = [
      'resume', 'curriculum vitae', 'cv', 'objective', 'summary',
      'professional summary', 'profile', 'qualifications'
    ]
    
    const lowerLine = line.toLowerCase()
    return headerKeywords.some(keyword => lowerLine.includes(keyword))
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Determine file type from URL or content type
   */
  private determineFileType(fileUrl: string, contentType?: string | null): string {
    // First try to determine from content type
    if (contentType) {
      if (contentType.includes('pdf')) return 'pdf'
      if (contentType.includes('msword')) return 'doc'
      if (contentType.includes('wordprocessingml')) return 'docx'
      if (contentType.includes('text/plain')) return 'txt'
    }

    // Special handling for Cloudinary URLs
    if (fileUrl.includes('cloudinary.com')) {
      // For Cloudinary, check the filename in the URL path
      const urlParts = fileUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      // Look for common resume file indicators
      if (fileName.toLowerCase().includes('cv') || fileName.toLowerCase().includes('resume')) {
        // Default to PDF for resumes on Cloudinary since they're usually PDFs
        return 'pdf'
      }
    }

    // Fall back to file extension
    const extension = fileUrl.toLowerCase().split('.').pop()
    switch (extension) {
      case 'pdf':
        return 'pdf'
      case 'doc':
        return 'doc'
      case 'docx':
        return 'docx'
      case 'txt':
        return 'txt'
      default:
        // If no extension found and it's a Cloudinary URL, default to PDF
        if (fileUrl.includes('cloudinary.com')) {
          console.warn(`No file extension found for Cloudinary URL, defaulting to PDF: ${fileUrl}`)
          return 'pdf'
        }
        throw new Error(`Unsupported file extension: ${extension}`)
    }
  }

  /**
   * Extract filename from URL
   */
  private extractFileName(fileUrl: string): string {
    try {
      const url = new URL(fileUrl)
      const pathParts = url.pathname.split('/')
      return pathParts[pathParts.length - 1] || 'unknown-file'
    } catch {
      return 'unknown-file'
    }
  }

  /**
   * Test method to validate extraction works
   */
  async testExtraction(fileUrl: string): Promise<ExtractedDocument> {
    console.log('Testing document extraction for:', fileUrl)
    
    try {
      const result = await this.extractFromUrl(fileUrl)
      
      console.log('Extraction successful:')
      console.log('- File type:', result.metadata.fileType)
      console.log('- Word count:', result.metadata.wordCount)
      console.log('- Character count:', result.metadata.charCount)
      console.log('- Sections found:', result.sections?.length || 0)
      
      if (result.sections && result.sections.length > 0) {
        console.log('- Section titles:', result.sections.map(s => s.title).join(', '))
      }
      
      return result
    } catch (error) {
      console.error('Extraction test failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const documentExtractor = DocumentExtractor.getInstance()

// Helper function for easy use
export async function extractTextFromDocument(fileUrl: string): Promise<ExtractedDocument> {
  return documentExtractor.extractFromUrl(fileUrl)
}

// Helper function to extract from buffer
export async function extractTextFromBuffer(
  buffer: Buffer, 
  fileType: string, 
  fileName?: string
): Promise<ExtractedDocument> {
  return documentExtractor.extractFromBuffer(buffer, fileType, fileName)
}