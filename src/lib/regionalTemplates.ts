export type TemplateRegion = 'US' | 'UK' | 'CA' | 'EU' | 'ACADEMIC'

export interface RegionalTemplate {
  id: TemplateRegion
  name: string
  description: string
  flag: string
  defaultSectionOrder: string[]
  includePhoto: boolean
  includePersonalDetails: boolean
  maxPages: number
  features: string[]
  sectionLabels: Record<string, string>
}

export const REGIONAL_TEMPLATES: Record<TemplateRegion, RegionalTemplate> = {
  US: {
    id: 'US',
    name: 'US Professional',
    description: 'Clean American format with subtle underline styling - perfect for ATS systems',
    flag: '🇺🇸',
    defaultSectionOrder: ['summary', 'experience', 'skills', 'education', 'certifications', 'projects'],
    includePhoto: false,
    includePersonalDetails: false,
    maxPages: 2,
    features: ['ATS-optimized', 'Skills emphasis', 'Clean underline design'],
    sectionLabels: {
      summary: 'Professional Summary',
      experience: 'Professional Experience',
      education: 'Education',
      skills: 'Core Competencies',
      certifications: 'Certifications',
      projects: 'Key Projects',
      languages: 'Languages'
    }
  },
  
  UK: {
    id: 'UK',
    name: 'UK Standard',
    description: 'Professional British CV with elegant border styling and detailed sections',
    flag: '🇬🇧',
    defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'certifications', 'projects'],
    includePhoto: false,
    includePersonalDetails: false,
    maxPages: 3,
    features: ['Elegant borders', 'Education emphasis', 'Formal layout'],
    sectionLabels: {
      summary: 'Personal Statement',
      experience: 'Employment History',
      education: 'Education & Qualifications',
      skills: 'Key Skills',
      certifications: 'Professional Qualifications',
      projects: 'Notable Projects',
      languages: 'Languages'
    }
  },

  CA: {
    id: 'CA',
    name: 'Canadian',
    description: 'Canadian format with patriotic red accent lines and bilingual support',
    flag: '🇨🇦',
    defaultSectionOrder: ['summary', 'experience', 'skills', 'education', 'certifications', 'languages'],
    includePhoto: false,
    includePersonalDetails: false,
    maxPages: 2,
    features: ['Red accent styling', 'Bilingual friendly', 'Skills-focused'],
    sectionLabels: {
      summary: 'Professional Summary',
      experience: 'Work Experience',
      education: 'Education',
      skills: 'Technical Skills',
      certifications: 'Certifications',
      projects: 'Projects',
      languages: 'Languages / Langues'
    }
  },

  EU: {
    id: 'EU',
    name: 'European',
    description: 'Elegant European CV with blue sidebar accent, photo support, and personal details',
    flag: '🇪🇺',
    defaultSectionOrder: ['personal', 'summary', 'education', 'experience', 'skills', 'languages', 'certifications'],
    includePhoto: true,
    includePersonalDetails: true,
    maxPages: 4,
    features: ['Blue sidebar design', 'Photo included', 'Personal details'],
    sectionLabels: {
      personal: 'Personal Information',
      summary: 'Professional Profile',
      experience: 'Work Experience',
      education: 'Education and Training',
      skills: 'Skills and Competencies',
      certifications: 'Certificates and Licenses',
      projects: 'Projects',
      languages: 'Language Skills'
    }
  },

  ACADEMIC: {
    id: 'ACADEMIC',
    name: 'Academic',
    description: 'Scholarly format with institutional brown styling and comprehensive sections',
    flag: '🎓',
    defaultSectionOrder: ['summary', 'education', 'experience', 'publications', 'research', 'skills', 'certifications'],
    includePhoto: false,
    includePersonalDetails: false,
    maxPages: 6,
    features: ['Academic styling', 'Publications section', 'Research focus'],
    sectionLabels: {
      summary: 'Research Interests',
      experience: 'Academic Appointments',
      education: 'Education',
      skills: 'Technical Skills',
      certifications: 'Certifications',
      projects: 'Research Projects',
      publications: 'Publications',
      research: 'Research Experience',
      languages: 'Languages'
    }
  }
}

export function getTemplateByRegion(region: TemplateRegion): RegionalTemplate {
  return REGIONAL_TEMPLATES[region]
}

export function getDefaultSectionOrder(region: TemplateRegion): string[] {
  return REGIONAL_TEMPLATES[region].defaultSectionOrder
}

export function getSectionLabel(region: TemplateRegion, section: string): string {
  const template = REGIONAL_TEMPLATES[region]
  return template.sectionLabels[section] || section.charAt(0).toUpperCase() + section.slice(1)
}

export const ALL_TEMPLATES = Object.values(REGIONAL_TEMPLATES)