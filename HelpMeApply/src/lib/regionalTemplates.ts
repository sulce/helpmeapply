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
    description: 'Standard American resume format - concise, skills-focused',
    flag: '🇺🇸',
    defaultSectionOrder: ['summary', 'experience', 'skills', 'education', 'certifications', 'projects'],
    includePhoto: false,
    includePersonalDetails: false,
    maxPages: 2,
    features: ['ATS-optimized', 'Skills emphasis', 'Concise format'],
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
    description: 'British CV format with personal statement and detailed background',
    flag: '🇬🇧',
    defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'certifications', 'projects'],
    includePhoto: false,
    includePersonalDetails: false,
    maxPages: 3,
    features: ['Personal statement', 'Education emphasis', 'Detailed format'],
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
    description: 'Canadian resume format with bilingual support',
    flag: '🇨🇦',
    defaultSectionOrder: ['summary', 'experience', 'skills', 'education', 'certifications', 'languages'],
    includePhoto: false,
    includePersonalDetails: false,
    maxPages: 2,
    features: ['Bilingual friendly', 'Skills-focused', 'North American style'],
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
    description: 'European CV format with photo and personal details',
    flag: '🇪🇺',
    defaultSectionOrder: ['personal', 'summary', 'education', 'experience', 'skills', 'languages', 'certifications'],
    includePhoto: true,
    includePersonalDetails: true,
    maxPages: 4,
    features: ['Photo included', 'Personal details', 'Europass compatible'],
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
    description: 'Academic CV for researchers, professors, and graduate students',
    flag: '🎓',
    defaultSectionOrder: ['summary', 'education', 'experience', 'publications', 'research', 'skills', 'certifications'],
    includePhoto: false,
    includePersonalDetails: false,
    maxPages: 6,
    features: ['Publications section', 'Research focus', 'Academic achievements'],
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