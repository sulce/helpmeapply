import jsPDF from 'jspdf'
import { uploadFile } from './fileUpload'
import { getTemplateByRegion, getSectionLabel } from './regionalTemplates'

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

interface ResumeData {
  contactInfo: ContactInfo
  professionalSummary: string
  experience: Experience[]
  education: Education[]
  skills: Skill[]
  certifications: string[]
  projects: string[]
  languages: string[]
  templateRegion?: string
  includePhoto?: boolean
  photoUrl?: string
  personalDetails?: {
    age?: number
    nationality?: string
    maritalStatus?: string
  }
}

export async function generateStructuredResumePDF(
  resumeData: ResumeData,
  userId: string
): Promise<string> {
  const doc = new jsPDF()
  let yPosition = 20
  const margin = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - (margin * 2)
  const maxY = 270

  // Get template configuration
  const templateRegion = resumeData.templateRegion || 'US'
  const template = getTemplateByRegion(templateRegion as any)

  // Set document properties
  doc.setProperties({
    title: `${resumeData.contactInfo.fullName} - Resume`,
    subject: 'Professional Resume',
    author: resumeData.contactInfo.fullName,
    creator: resumeData.contactInfo.fullName
  })

  // Add header with contact info (and photo for EU templates)  
  yPosition = addRegionalHeader(doc, resumeData, template, yPosition, margin, pageWidth)
  
  // Add template-specific styling elements
  yPosition = addTemplateSpecificStyling(doc, template, yPosition, margin, contentWidth)

  // Add personal details for EU templates
  if (template.includePersonalDetails && resumeData.personalDetails) {
    yPosition = addPersonalDetailsSection(doc, resumeData.personalDetails, yPosition, margin, contentWidth, maxY, template)
  }

  // Add sections in template-defined order
  const sectionsToRender = template.defaultSectionOrder || ['summary', 'experience', 'skills', 'education', 'certifications', 'projects', 'languages']
  
  for (const sectionKey of sectionsToRender) {
    if (sectionKey === 'summary' && resumeData.professionalSummary.trim()) {
      const sectionLabel = getSectionLabel(templateRegion as any, 'summary')
      yPosition = addSection(doc, sectionLabel.toUpperCase(), [resumeData.professionalSummary], yPosition, margin, contentWidth, maxY)
    }
    
    if (sectionKey === 'experience' && resumeData.experience.length > 0) {
      const sectionLabel = getSectionLabel(templateRegion as any, 'experience')
      const experienceContent = formatExperience(resumeData.experience)
      yPosition = addSection(doc, sectionLabel.toUpperCase(), experienceContent, yPosition, margin, contentWidth, maxY)
    }
    
    if (sectionKey === 'skills' && resumeData.skills.length > 0) {
      const sectionLabel = getSectionLabel(templateRegion as any, 'skills')
      const skillsContent = formatSkills(resumeData.skills)
      yPosition = addSection(doc, sectionLabel.toUpperCase(), skillsContent, yPosition, margin, contentWidth, maxY)
    }
    
    if (sectionKey === 'education' && resumeData.education.length > 0) {
      const sectionLabel = getSectionLabel(templateRegion as any, 'education')
      const educationContent = formatEducation(resumeData.education)
      yPosition = addSection(doc, sectionLabel.toUpperCase(), educationContent, yPosition, margin, contentWidth, maxY)
    }
    
    if (sectionKey === 'certifications' && resumeData.certifications.filter(cert => cert.trim()).length > 0) {
      const sectionLabel = getSectionLabel(templateRegion as any, 'certifications')
      const certContent = resumeData.certifications.filter(cert => cert.trim()).map(cert => `• ${cert}`)
      yPosition = addSection(doc, sectionLabel.toUpperCase(), certContent, yPosition, margin, contentWidth, maxY)
    }
    
    if (sectionKey === 'projects' && resumeData.projects.filter(project => project.trim()).length > 0) {
      const sectionLabel = getSectionLabel(templateRegion as any, 'projects')
      const projectContent = resumeData.projects.filter(project => project.trim()).map(project => `• ${project}`)
      yPosition = addSection(doc, sectionLabel.toUpperCase(), projectContent, yPosition, margin, contentWidth, maxY)
    }
    
    if (sectionKey === 'languages' && resumeData.languages.filter(lang => lang.trim()).length > 0) {
      const sectionLabel = getSectionLabel(templateRegion as any, 'languages')
      const langContent = resumeData.languages.filter(lang => lang.trim()).map(lang => `• ${lang}`)
      yPosition = addSection(doc, sectionLabel.toUpperCase(), langContent, yPosition, margin, contentWidth, maxY)
    }
  }

  // Add page numbers if multiple pages
  const totalPages = doc.getNumberOfPages()
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, 280)
      doc.setTextColor(0, 0, 0)
    }
  }

  // Convert to buffer and upload
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  const fileName = `${resumeData.contactInfo.fullName.replace(/\s+/g, '_')}_Resume_${Date.now()}.pdf`
  
  const uploadResult = await uploadFile({
    buffer: pdfBuffer,
    fileName,
    contentType: 'application/pdf',
    userId
  })

  return uploadResult.fileUrl
}

function addHeader(
  doc: jsPDF, 
  contactInfo: ContactInfo, 
  yPosition: number, 
  margin: number, 
  pageWidth: number
): number {
  // Name - centered and large
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  const nameWidth = doc.getTextWidth(contactInfo.fullName)
  doc.text(contactInfo.fullName, (pageWidth - nameWidth) / 2, yPosition)
  yPosition += 12

  // Contact information - centered
  const contactItems = []
  if (contactInfo.email) contactItems.push(contactInfo.email)
  if (contactInfo.phone) contactItems.push(contactInfo.phone)
  if (contactInfo.address) contactItems.push(contactInfo.address)
  if (contactInfo.linkedin) contactItems.push(contactInfo.linkedin)
  if (contactInfo.website) contactItems.push(contactInfo.website)

  if (contactItems.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    // Split into lines if too many items
    const maxItemsPerLine = 3
    for (let i = 0; i < contactItems.length; i += maxItemsPerLine) {
      const lineItems = contactItems.slice(i, i + maxItemsPerLine)
      const contactLine = lineItems.join(' • ')
      const contactWidth = doc.getTextWidth(contactLine)
      doc.text(contactLine, (pageWidth - contactWidth) / 2, yPosition)
      yPosition += 5
    }
  }

  // Add separator line
  yPosition += 5
  doc.setLineWidth(0.8)
  doc.setDrawColor(51, 51, 51)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 12

  return yPosition
}

function addSection(
  doc: jsPDF,
  title: string,
  content: string[],
  yPosition: number,
  margin: number,
  contentWidth: number,
  maxY: number
): number {
  // Check if we need a new page
  if (yPosition > maxY - 30) {
    doc.addPage()
    yPosition = 20
  }

  // Section title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(51, 51, 51)
  doc.text(title, margin, yPosition)
  
  // Add underline
  const titleWidth = doc.getTextWidth(title)
  doc.setLineWidth(0.5)
  doc.setDrawColor(100, 100, 100)
  doc.line(margin, yPosition + 1, margin + titleWidth, yPosition + 1)
  yPosition += 10

  // Section content
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  for (const item of content) {
    if (yPosition > maxY - 10) {
      doc.addPage()
      yPosition = 20
    }

    // Format content based on type
    if (item.startsWith('•')) {
      // Bullet point
      yPosition = addBulletPoint(doc, item, yPosition, margin, contentWidth)
    } else if (item.includes(' - ') && item.match(/\d{4}/)) {
      // Job/education entry
      yPosition = addJobEntry(doc, item, yPosition, margin, contentWidth)
    } else {
      // Regular paragraph
      const lines = doc.splitTextToSize(item, contentWidth)
      for (const line of lines) {
        if (yPosition > maxY - 5) {
          doc.addPage()
          yPosition = 20
        }
        doc.text(line, margin, yPosition)
        yPosition += 5
      }
    }
    
    yPosition += 3
  }

  return yPosition + 8
}

function addBulletPoint(
  doc: jsPDF, 
  text: string, 
  yPosition: number, 
  margin: number, 
  contentWidth: number
): number {
  const bulletIndent = 8
  const textIndent = 15
  
  const cleanText = text.replace(/^•\s*/, '').trim()
  
  doc.text('•', margin + bulletIndent, yPosition)
  
  const wrappedLines = doc.splitTextToSize(cleanText, contentWidth - textIndent)
  for (const line of wrappedLines) {
    doc.text(line, margin + textIndent, yPosition)
    yPosition += 5
  }

  return yPosition
}

function addJobEntry(
  doc: jsPDF, 
  text: string, 
  yPosition: number, 
  margin: number, 
  contentWidth: number
): number {
  // Parse job entry format: "Job Title - Company (Date)"
  const parts = text.split(' - ')
  
  if (parts.length >= 2) {
    // Job title (bold)
    doc.setFont('helvetica', 'bold')
    doc.text(parts[0].trim(), margin, yPosition)
    
    // Company and date (normal)
    doc.setFont('helvetica', 'normal')
    const companyInfo = parts.slice(1).join(' - ')
    doc.text(companyInfo, margin, yPosition + 5)
    
    yPosition += 12
  } else {
    // Fallback for unstructured entries
    doc.setFont('helvetica', 'bold')
    const lines = doc.splitTextToSize(text, contentWidth)
    for (const line of lines) {
      doc.text(line, margin, yPosition)
      yPosition += 5
    }
  }

  doc.setFont('helvetica', 'normal')
  return yPosition
}

function formatExperience(experience: Experience[]): string[] {
  const content: string[] = []
  
  for (const exp of experience) {
    if (!exp.jobTitle.trim() || !exp.company.trim()) continue
    
    // Title and company line
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} - Present`
      : `${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}`
    
    const titleLine = `${exp.jobTitle} - ${exp.company}${exp.location ? ', ' + exp.location : ''} (${dateRange})`
    content.push(titleLine)
    
    // Description bullets
    for (const desc of exp.description) {
      if (desc.trim()) {
        const cleanDesc = desc.startsWith('•') ? desc : `• ${desc}`
        content.push(cleanDesc)
      }
    }
    
    content.push('') // Space between entries
  }
  
  return content.filter(item => item !== '')
}

function formatEducation(education: Education[]): string[] {
  const content: string[] = []
  
  for (const edu of education) {
    if (!edu.degree.trim() || !edu.institution.trim()) continue
    
    // Degree and institution line
    const eduLine = `${edu.degree} - ${edu.institution}${edu.location ? ', ' + edu.location : ''} (${formatDate(edu.graduationDate)})`
    content.push(eduLine)
    
    // GPA if provided
    if (edu.gpa?.trim()) {
      content.push(`• GPA: ${edu.gpa}`)
    }
    
    // Achievements
    for (const achievement of edu.achievements) {
      if (achievement.trim()) {
        const cleanAchievement = achievement.startsWith('•') ? achievement : `• ${achievement}`
        content.push(cleanAchievement)
      }
    }
    
    content.push('') // Space between entries
  }
  
  return content.filter(item => item !== '')
}

function formatSkills(skills: Skill[]): string[] {
  const content: string[] = []
  
  // Group skills by category
  const skillsByCategory = skills.reduce((acc, skill) => {
    if (skill.name.trim()) {
      if (!acc[skill.category]) acc[skill.category] = []
      acc[skill.category].push(`${skill.name} (${skill.proficiency})`)
    }
    return acc
  }, {} as Record<string, string[]>)
  
  // Format each category
  for (const [category, categorySkills] of Object.entries(skillsByCategory)) {
    if (categorySkills.length > 0) {
      content.push(`${category}: ${categorySkills.join(', ')}`)
    }
  }
  
  return content
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  
  const date = new Date(dateString + '-01') // Add day for proper parsing
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short'
  })
}

// Regional Header with optional photo
function addRegionalHeader(
  doc: jsPDF,
  resumeData: ResumeData,
  template: any,
  yPosition: number,
  margin: number,
  pageWidth: number
): number {
  const contactInfo = resumeData.contactInfo
  
  // For EU templates with photo
  if (template.includePhoto && resumeData.photoUrl && resumeData.includePhoto) {
    // Add photo on the right side
    // Note: In a real implementation, you'd need to load and embed the actual image
    doc.setDrawColor(200)
    doc.rect(pageWidth - margin - 40, yPosition, 35, 45) // Photo placeholder
    doc.setFontSize(8)
    doc.text('Photo', pageWidth - margin - 22, yPosition + 25)
    
    // Name and contact info on the left
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(contactInfo.fullName, margin, yPosition + 15)
    yPosition += 25
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (contactInfo.email) {
      doc.text(contactInfo.email, margin, yPosition)
      yPosition += 6
    }
    if (contactInfo.phone) {
      doc.text(contactInfo.phone, margin, yPosition)
      yPosition += 6
    }
    if (contactInfo.address) {
      doc.text(contactInfo.address, margin, yPosition)
      yPosition += 6
    }
    
    return Math.max(yPosition + 10, yPosition + 55) // Account for photo height
  } else {
    // Standard centered header (US/UK/CA style)
    return addHeader(doc, contactInfo, yPosition, margin, pageWidth)
  }
}

// Personal Details Section for EU templates
function addPersonalDetailsSection(
  doc: jsPDF,
  personalDetails: any,
  yPosition: number,
  margin: number,
  contentWidth: number,
  maxY: number,
  template: any
): number {
  const details = []
  
  if (personalDetails.age) {
    details.push(`Age: ${personalDetails.age}`)
  }
  if (personalDetails.nationality) {
    details.push(`Nationality: ${personalDetails.nationality}`)
  }
  if (personalDetails.maritalStatus) {
    details.push(`Marital Status: ${personalDetails.maritalStatus}`)
  }
  
  if (details.length > 0) {
    return addSection(doc, 'PERSONAL INFORMATION', details, yPosition, margin, contentWidth, maxY)
  }
  
  return yPosition
}

// Add template-specific visual styling elements
function addTemplateSpecificStyling(
  doc: jsPDF,
  template: any,
  yPosition: number,
  margin: number,
  contentWidth: number
): number {
  switch (template.id) {
    case 'US':
      // US style: Add a subtle underline below header
      doc.setDrawColor(100, 100, 100)
      doc.line(margin, yPosition - 5, margin + contentWidth, yPosition - 5)
      return yPosition + 5
      
    case 'UK':
      // UK style: Add a professional border box around the header area
      doc.setDrawColor(50, 50, 150)
      doc.setLineWidth(0.5)
      doc.rect(margin - 5, 15, contentWidth + 10, yPosition - 10)
      return yPosition + 8
      
    case 'CA':
      // Canadian style: Add maple leaf accent and dual lines
      doc.setDrawColor(255, 0, 0)
      doc.line(margin, yPosition - 3, margin + contentWidth/3, yPosition - 3)
      doc.setDrawColor(0, 0, 0)
      doc.line(margin + contentWidth*2/3, yPosition - 3, margin + contentWidth, yPosition - 3)
      return yPosition + 5
      
    case 'EU':
      // European style: Add a professional blue accent bar
      doc.setFillColor(41, 128, 185)
      doc.rect(margin - 5, yPosition - 8, 5, yPosition + 200, 'F')
      return yPosition + 3
      
    case 'ACADEMIC':
      // Academic style: Add institutional styling with borders
      doc.setDrawColor(139, 69, 19)
      doc.setLineWidth(1)
      doc.line(margin, yPosition - 5, margin + contentWidth, yPosition - 5)
      doc.setLineWidth(0.5)
      doc.line(margin, yPosition - 3, margin + contentWidth, yPosition - 3)
      return yPosition + 8
      
    default:
      return yPosition
  }
}