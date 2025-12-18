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
          const pdfResult = await this.extractPDF(buffer)
          extractedText = pdfResult.text
          pages = pdfResult.pages
          break
        
        case 'docx':
        case 'doc':
          extractedText = await this.extractWord(buffer)
          break
        
        case 'txt':
          extractedText = buffer.toString('utf-8')
          break
        
        default:
          throw new Error(`Unsupported file type: ${fileType}`)
      }

      // Clean and structure the extracted text
      const cleanedText = this.cleanExtractedText(extractedText)
      const sections = this.parseResumeSection(cleanedText)

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
      // Add safety checks for buffer
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid PDF buffer')
      }
      
      // Validate buffer contains PDF data
      const pdfHeader = buffer.slice(0, 4).toString()
      if (!pdfHeader.includes('%PDF')) {
        throw new Error('Buffer does not contain valid PDF data')
      }
      
      // Wrap pdf-parse in a Promise to catch any synchronous errors during initialization
      const data = await new Promise<any>((resolve, reject) => {
        try {
          // Use setTimeout to ensure we catch any immediate errors
          setTimeout(async () => {
            try {
              const result = await pdfParse(buffer, {
                max: 0, // No page limit
              })
              resolve(result)
            } catch (err) {
              reject(err)
            }
          }, 0)
        } catch (err) {
          reject(err)
        }
      })
      
      if (!data || !data.text) {
        throw new Error('PDF parsing returned no text')
      }
      
      return {
        text: data.text,
        pages: data.numpages || 1,
      }
    } catch (error) {
      console.error('PDF extraction error:', error)
      
      // Check if this is the specific test file error or ENOENT errors
      if (error instanceof Error) {
        if (error.message.includes('test/data') || error.message.includes('ENOENT')) {
          console.error('PDF-parse trying to access test/system files - this is a library bug')
          return {
            text: 'PDF extraction temporarily unavailable due to library issue. Please try again later or use a different file format.',
            pages: 1
          }
        }
      }
      
      // For production safety, always return a fallback instead of crashing
      console.warn('PDF extraction failed, returning fallback:', error)
      return {
        text: 'PDF text extraction failed - please try uploading again or use a different format',
        pages: 1
      }
    }
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