import jsPDF from 'jspdf'
import { uploadFile } from './fileUpload'

export interface ResumeSection {
  title: string
  content: string
}

export interface ContactInfo {
  email?: string
  phone?: string
  address?: string
  linkedin?: string
  website?: string
}

export interface PDFGenerationOptions {
  jobTitle: string
  company: string
  candidateName: string
  sections: ResumeSection[]
  contactInfo?: ContactInfo
  customizationNotes?: string[]
  keywordMatches?: string[]
  suggestedImprovements?: string[]
}

export class PDFGenerator {
  private static instance: PDFGenerator

  static getInstance(): PDFGenerator {
    if (!PDFGenerator.instance) {
      PDFGenerator.instance = new PDFGenerator()
    }
    return PDFGenerator.instance
  }

  /**
   * Generate a professional PDF resume from customized content
   */
  async generateResumePDF(
    customizedContent: string,
    options: PDFGenerationOptions,
    userId: string
  ): Promise<string> {
    try {
      const doc = new jsPDF()
      let yPosition = 20

      // Set up document properties
      doc.setProperties({
        title: `${options.candidateName} - Resume - ${options.jobTitle}`,
        subject: `Customized Resume for ${options.jobTitle} at ${options.company}`,
        author: options.candidateName,
        creator: options.candidateName
      })

      // Header
      yPosition = this.addHeader(doc, options, yPosition)
      
      // Add sections
      yPosition = this.addSections(doc, options.sections, yPosition)

      // Add customization footer if space allows
      if (yPosition < 250) {
        this.addCustomizationFooter(doc, options, yPosition)
      }

      // Convert to buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

      // Upload to file storage (Cloudinary primary, S3 fallback)
      const fileName = `${options.candidateName.replace(/\s+/g, '_')}_${options.company}_${options.jobTitle.replace(/\s+/g, '_')}_Resume.pdf`
      const uploadResult = await uploadFile({
        buffer: pdfBuffer,
        fileName,
        contentType: 'application/pdf',
        userId
      })
      const fileUrl = uploadResult.fileUrl

      return fileUrl
    } catch (error) {
      console.error('PDF generation error:', error)
      throw new Error('Failed to generate PDF resume')
    }
  }

  /**
   * Generate a simple text-based PDF from content
   */
  async generateSimplePDF(
    content: string,
    title: string,
    userId: string
  ): Promise<string> {
    try {
      const doc = new jsPDF()
      
      // Set title
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(title, 20, 20)

      // Add content with text wrapping
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      const lines = doc.splitTextToSize(content, 170) // 170mm width for margin
      doc.text(lines, 20, 35)

      // Convert to buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

      // Upload to file storage (Cloudinary primary, S3 fallback)
      const fileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`
      const uploadResult = await uploadFile({
        buffer: pdfBuffer,
        fileName,
        contentType: 'application/pdf',
        userId
      })
      const fileUrl = uploadResult.fileUrl

      return fileUrl
    } catch (error) {
      console.error('Simple PDF generation error:', error)
      throw new Error('Failed to generate PDF')
    }
  }

  private addHeader(doc: jsPDF, options: PDFGenerationOptions, yPosition: number): number {
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20

    // Candidate name - centered and larger
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    const nameWidth = doc.getTextWidth(options.candidateName)
    doc.text(options.candidateName, (pageWidth - nameWidth) / 2, yPosition)
    yPosition += 12

    // Contact information - centered
    if (options.contactInfo) {
      const contactItems = []
      if (options.contactInfo.email) contactItems.push(options.contactInfo.email)
      if (options.contactInfo.phone) contactItems.push(options.contactInfo.phone)
      if (options.contactInfo.address) contactItems.push(options.contactInfo.address)
      if (options.contactInfo.linkedin) contactItems.push(`LinkedIn: ${options.contactInfo.linkedin}`)
      if (options.contactInfo.website) contactItems.push(options.contactInfo.website)

      if (contactItems.length > 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        
        // Split contact info into lines if too long
        const maxItemsPerLine = 3
        for (let i = 0; i < contactItems.length; i += maxItemsPerLine) {
          const lineItems = contactItems.slice(i, i + maxItemsPerLine)
          const contactLine = lineItems.join(' • ')
          const contactWidth = doc.getTextWidth(contactLine)
          doc.text(contactLine, (pageWidth - contactWidth) / 2, yPosition)
          yPosition += 5
        }
        yPosition += 3
      }
    }

    // Optional professional objective or target role (only if it looks natural)
    // Note: Many modern CVs omit this for a cleaner look

    // Add separator line
    doc.setLineWidth(0.8)
    doc.setDrawColor(51, 51, 51)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 10

    return yPosition
  }

  private addSections(doc: jsPDF, sections: ResumeSection[], yPosition: number): number {
    const maxY = 270 // Leave space for footer
    const margin = 20
    const pageWidth = doc.internal.pageSize.getWidth()
    const contentWidth = pageWidth - (margin * 2)

    for (const section of sections) {
      // Check if we need a new page
      if (yPosition > maxY - 30) {
        doc.addPage()
        yPosition = 20
      }

      // Section title with underline
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 51, 51)
      doc.text(section.title.toUpperCase(), margin, yPosition)
      
      // Add underline for section
      const titleWidth = doc.getTextWidth(section.title.toUpperCase())
      doc.setLineWidth(0.5)
      doc.setDrawColor(100, 100, 100)
      doc.line(margin, yPosition + 1, margin + titleWidth, yPosition + 1)
      yPosition += 10

      // Section content with proper formatting
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      
      yPosition = this.formatSectionContent(doc, section, yPosition, margin, contentWidth, maxY)
      yPosition += 8 // Space between sections
    }

    return yPosition
  }

  private formatSectionContent(doc: jsPDF, section: ResumeSection, yPosition: number, margin: number, contentWidth: number, maxY: number): number {
    const content = section.content.trim()
    const lines = content.split('\n').filter(line => line.trim())
    const lineHeight = 5

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Check for new page
      if (yPosition > maxY - 10) {
        doc.addPage()
        yPosition = 20
      }

      // Format different types of content
      if (this.isJobTitle(trimmedLine)) {
        yPosition = this.addJobEntry(doc, trimmedLine, yPosition, margin, contentWidth)
      } else if (this.isBulletPoint(trimmedLine)) {
        yPosition = this.addBulletPoint(doc, trimmedLine, yPosition, margin, contentWidth)
      } else if (this.isEducationEntry(trimmedLine)) {
        yPosition = this.addEducationEntry(doc, trimmedLine, yPosition, margin, contentWidth)
      } else if (this.isSkillCategory(trimmedLine)) {
        yPosition = this.addSkillCategory(doc, trimmedLine, yPosition, margin, contentWidth)
      } else {
        // Regular paragraph text
        const wrappedLines = doc.splitTextToSize(trimmedLine, contentWidth)
        for (const wrappedLine of wrappedLines) {
          if (yPosition > maxY - 5) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(wrappedLine, margin, yPosition)
          yPosition += lineHeight
        }
      }
      
      yPosition += 2 // Small space between items
    }

    return yPosition
  }

  private isJobTitle(line: string): boolean {
    // Detect job titles (usually contain dates, company names)
    return /\d{4}.*-.*\d{4}|\d{4}.*present|at\s+\w+/i.test(line) && 
           !line.startsWith('•') && !line.startsWith('-')
  }

  private isBulletPoint(line: string): boolean {
    return line.startsWith('•') || line.startsWith('-') || line.startsWith('*')
  }

  private isEducationEntry(line: string): boolean {
    return /degree|university|college|bachelor|master|phd|certification|gpa/i.test(line) &&
           !line.startsWith('•') && !line.startsWith('-')
  }

  private isSkillCategory(line: string): boolean {
    return /^(technical skills|programming languages|frameworks|tools|languages|certifications):/i.test(line)
  }

  private addJobEntry(doc: jsPDF, line: string, yPosition: number, margin: number, contentWidth: number): number {
    // Parse job title, company, and dates
    const parts = line.split(/\s+at\s+|\s+-\s+|\s+\|\s+/)
    
    if (parts.length >= 2) {
      // Job title (bold)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(parts[0].trim(), margin, yPosition)
      
      // Company and dates (regular, right-aligned if dates found)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const companyInfo = parts.slice(1).join(' | ').trim()
      
      // Try to separate company from dates
      const dateMatch = companyInfo.match(/(\d{4}.*-.*\d{4}|\d{4}.*present)/i)
      if (dateMatch) {
        const company = companyInfo.replace(dateMatch[0], '').replace(/\s+\|\s*$/, '').trim()
        const dates = dateMatch[0].trim()
        
        // Company on left, dates on right
        doc.text(company, margin, yPosition + 5)
        const datesWidth = doc.getTextWidth(dates)
        doc.text(dates, margin + contentWidth - datesWidth, yPosition + 5)
      } else {
        doc.text(companyInfo, margin, yPosition + 5)
      }
      
      yPosition += 12
    } else {
      // Fallback for unstructured job entries
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      const wrappedLines = doc.splitTextToSize(line, contentWidth)
      for (const wrappedLine of wrappedLines) {
        doc.text(wrappedLine, margin, yPosition)
        yPosition += 5
      }
    }

    return yPosition
  }

  private addBulletPoint(doc: jsPDF, line: string, yPosition: number, margin: number, contentWidth: number): number {
    const bulletIndent = 8
    const textIndent = 15
    
    // Remove original bullet and add proper bullet
    const cleanText = line.replace(/^[•\-\*]\s*/, '').trim()
    
    // Add bullet point
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('•', margin + bulletIndent, yPosition)
    
    // Add text with proper wrapping and indentation
    const wrappedLines = doc.splitTextToSize(cleanText, contentWidth - textIndent)
    for (let i = 0; i < wrappedLines.length; i++) {
      doc.text(wrappedLines[i], margin + textIndent, yPosition)
      yPosition += 5
    }

    return yPosition
  }

  private addEducationEntry(doc: jsPDF, line: string, yPosition: number, margin: number, contentWidth: number): number {
    // Similar to job entry but optimized for education
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    
    const wrappedLines = doc.splitTextToSize(line, contentWidth)
    for (const wrappedLine of wrappedLines) {
      doc.text(wrappedLine, margin, yPosition)
      yPosition += 5
    }

    return yPosition + 3
  }

  private addSkillCategory(doc: jsPDF, line: string, yPosition: number, margin: number, contentWidth: number): number {
    const [category, skills] = line.split(':').map(s => s.trim())
    
    // Category name (bold)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(category + ':', margin, yPosition)
    yPosition += 5
    
    // Skills (normal, with proper formatting)
    if (skills) {
      doc.setFont('helvetica', 'normal')
      const skillList = skills.split(',').map(s => s.trim()).join(' • ')
      const wrappedLines = doc.splitTextToSize(skillList, contentWidth - 10)
      for (const wrappedLine of wrappedLines) {
        doc.text(wrappedLine, margin + 10, yPosition)
        yPosition += 5
      }
    }

    return yPosition + 2
  }

  private addCustomizationFooter(doc: jsPDF, options: PDFGenerationOptions, yPosition: number): void {
    const footerY = 280

    // Only add page numbers for multi-page documents - no AI branding
    const totalPages = doc.getNumberOfPages()
    if (totalPages > 1) {
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.text(`Page ${i} of ${totalPages}`, 170, footerY)
      }
      
      doc.setTextColor(0, 0, 0)
    }
  }

  /**
   * Parse customized content into sections for PDF generation
   */
  parseCustomizedContent(content: string, candidateName: string): {
    sections: ResumeSection[]
    metadata: { keywordMatches: string[]; customizationNotes: string[] }
  } {
    const sections: ResumeSection[] = []
    const metadata = { keywordMatches: [] as string[], customizationNotes: [] as string[] }

    const lines = content.split('\n')
    let currentSection: ResumeSection | null = null
    let inMetadataSection = false
    const standardSectionOrder = ['PROFESSIONAL SUMMARY', 'EXPERIENCE', 'SKILLS', 'EDUCATION', 'CERTIFICATIONS', 'PROJECTS']

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Skip metadata extraction sections
      if (trimmedLine.includes('='.repeat(10)) || 
          trimmedLine.includes('CUSTOMIZATION SUMMARY') ||
          trimmedLine.includes('OPTIMIZATION DETAILS') ||
          trimmedLine.includes('KEYWORD MATCHES') ||
          trimmedLine.includes('SUGGESTED IMPROVEMENTS')) {
        inMetadataSection = !inMetadataSection
        continue
      }

      if (inMetadataSection) {
        // Extract keywords and notes from metadata
        if (trimmedLine.startsWith('•') && trimmedLine.toLowerCase().includes('keyword')) {
          const keyword = trimmedLine.replace('•', '').replace(/keyword/gi, '').replace(/:/g, '').trim()
          if (keyword) metadata.keywordMatches.push(keyword)
        } else if (trimmedLine.startsWith('•')) {
          metadata.customizationNotes.push(trimmedLine.replace('•', '').trim())
        } else if (trimmedLine.startsWith('-')) {
          metadata.customizationNotes.push(trimmedLine.replace('-', '').trim())
        }
        continue
      }

      // Detect section headers (various formats)
      let sectionName = null
      
      // Format: [SECTION NAME]
      const bracketMatch = trimmedLine.match(/^\[([^\]]+)\]$/)
      if (bracketMatch) {
        sectionName = bracketMatch[1]
      }
      
      // Format: SECTION NAME (all caps with optional colons)
      const allCapsMatch = trimmedLine.match(/^([A-Z\s]{3,}):?$/)
      if (allCapsMatch && this.isLikelySectionHeader(allCapsMatch[1].trim())) {
        sectionName = allCapsMatch[1].trim()
      }
      
      // Format: Section Name: (title case with colon)
      const titleCaseMatch = trimmedLine.match(/^([A-Z][a-zA-Z\s]{2,}):\s*$/)
      if (titleCaseMatch && this.isLikelySectionHeader(titleCaseMatch[1].trim())) {
        sectionName = titleCaseMatch[1].trim().toUpperCase()
      }

      if (sectionName) {
        // Save previous section
        if (currentSection && currentSection.content.trim()) {
          sections.push(currentSection)
        }

        // Normalize section name
        sectionName = this.normalizeSectionName(sectionName)

        // Start new section
        currentSection = {
          title: sectionName,
          content: ''
        }
        continue
      }

      // Add content to current section
      if (currentSection) {
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine
      } else if (!trimmedLine.includes('CUSTOMIZED RESUME FOR:') && 
                !trimmedLine.includes('Position:') &&
                !trimmedLine.includes('Generated by') &&
                !trimmedLine.includes('AI-Customized')) {
        // Create a professional summary section for unattached content
        if (!sections.find(s => s.title === 'PROFESSIONAL SUMMARY')) {
          currentSection = {
            title: 'PROFESSIONAL SUMMARY',
            content: trimmedLine
          }
        } else {
          // Add to existing summary if it exists
          const summarySection = sections.find(s => s.title === 'PROFESSIONAL SUMMARY')
          if (summarySection) {
            summarySection.content += '\n' + trimmedLine
          }
        }
      }
    }

    // Add the last section
    if (currentSection && currentSection.content.trim()) {
      sections.push(currentSection)
    }

    // Sort sections in standard order
    const orderedSections: ResumeSection[] = []
    for (const standardSection of standardSectionOrder) {
      const section = sections.find(s => s.title === standardSection)
      if (section) {
        orderedSections.push(section)
      }
    }
    
    // Add any remaining sections not in standard order
    for (const section of sections) {
      if (!standardSectionOrder.includes(section.title)) {
        orderedSections.push(section)
      }
    }

    // Ensure we have at least some content
    if (orderedSections.length === 0) {
      orderedSections.push({
        title: 'PROFESSIONAL SUMMARY',
        content: 'Experienced professional seeking to contribute expertise and drive results in challenging roles.'
      })
    }

    // Validate section content quality
    const validatedSections = orderedSections.map(section => ({
      ...section,
      content: this.validateSectionContent(section.content)
    })).filter(section => section.content.length > 10)

    // Ensure we still have content after validation
    if (validatedSections.length === 0) {
      validatedSections.push({
        title: 'PROFESSIONAL SUMMARY',
        content: 'Professional candidate with relevant experience and skills. Dedicated to delivering excellence and contributing to organizational success.'
      })
    }

    return { sections: validatedSections, metadata }
  }

  private isLikelySectionHeader(text: string): boolean {
    const commonSections = [
      'PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE',
      'EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT', 'CAREER',
      'SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES',
      'EDUCATION', 'ACADEMIC BACKGROUND',
      'CERTIFICATIONS', 'CERTIFICATES', 'CREDENTIALS',
      'PROJECTS', 'KEY PROJECTS', 'NOTABLE PROJECTS',
      'ACHIEVEMENTS', 'ACCOMPLISHMENTS', 'AWARDS',
      'LANGUAGES', 'PUBLICATIONS', 'VOLUNTEER', 'INTERESTS'
    ]
    
    return commonSections.some(section => 
      text.toUpperCase().includes(section) || 
      section.includes(text.toUpperCase())
    )
  }

  private normalizeSectionName(sectionName: string): string {
    const normalized = sectionName.toUpperCase().trim()
    
    // Map common variations to standard names
    const mappings: { [key: string]: string } = {
      'WORK EXPERIENCE': 'EXPERIENCE',
      'EMPLOYMENT HISTORY': 'EXPERIENCE',
      'CAREER HISTORY': 'EXPERIENCE',
      'PROFESSIONAL EXPERIENCE': 'EXPERIENCE',
      'TECHNICAL SKILLS': 'SKILLS',
      'CORE COMPETENCIES': 'SKILLS',
      'COMPETENCIES': 'SKILLS',
      'ACADEMIC BACKGROUND': 'EDUCATION',
      'EDUCATIONAL BACKGROUND': 'EDUCATION',
      'CERTIFICATES': 'CERTIFICATIONS',
      'CREDENTIALS': 'CERTIFICATIONS',
      'KEY PROJECTS': 'PROJECTS',
      'NOTABLE PROJECTS': 'PROJECTS',
      'ACCOMPLISHMENTS': 'ACHIEVEMENTS',
      'AWARDS': 'ACHIEVEMENTS',
      'PROFILE': 'PROFESSIONAL SUMMARY',
      'OBJECTIVE': 'PROFESSIONAL SUMMARY'
    }

    return mappings[normalized] || normalized
  }

  private validateSectionContent(content: string): string {
    if (!content || content.trim().length === 0) return ''
    
    // Remove excessive garbled characters
    let cleaned = content
      .replace(/[^\w\s\.\,\!\?\;\:\(\)\[\]\-\+\@\#\$\%\&\*\/\\'"•]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    
    // Check if content is mostly readable
    const words = cleaned.split(/\s+/).filter(word => word.length > 1)
    const readableWords = words.filter(word => /^[a-zA-Z0-9\.\,\!\?\;\:\-\+\@\#\$\%\&\*]+$/.test(word))
    
    // If less than 70% of words are readable, it's likely corrupted
    if (words.length > 0 && readableWords.length / words.length < 0.7) {
      return 'Content not available - please refer to original resume for details.'
    }
    
    // Remove sequences of single characters (common in corrupted PDFs)
    cleaned = cleaned.replace(/\b[a-zA-Z]\s[a-zA-Z]\s[a-zA-Z](?:\s[a-zA-Z]){2,}\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    
    return cleaned
  }
}

// Export singleton instance
export const pdfGenerator = PDFGenerator.getInstance()

// Helper function for easy use
export async function generateCustomizedResumePDF(
  customizedContent: string,
  options: PDFGenerationOptions,
  userId: string
): Promise<string> {
  return pdfGenerator.generateResumePDF(customizedContent, options, userId)
}