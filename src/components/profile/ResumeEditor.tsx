'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  Plus, 
  Trash2, 
  Save,
  FileText,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  Globe,
  Settings
} from 'lucide-react'
import { ALL_TEMPLATES, type TemplateRegion, getTemplateByRegion } from '@/lib/regionalTemplates'

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

interface PersonalDetails {
  age?: number
  nationality?: string
  maritalStatus?: string
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
  // Template settings
  templateRegion: TemplateRegion
  includePhoto: boolean
  photoUrl?: string
  personalDetails?: PersonalDetails
}

interface ResumeEditorProps {
  userId: string
  onSave?: (resumeData: ResumeData) => void
  initialData?: Partial<ResumeData>
}

export function ResumeEditor({ userId, onSave, initialData }: ResumeEditorProps) {
  const [resumeData, setResumeData] = useState<ResumeData>({
    contactInfo: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      linkedin: '',
      website: ''
    },
    professionalSummary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    languages: [],
    templateRegion: 'US',
    includePhoto: false,
    personalDetails: {}
  })

  const [activeSection, setActiveSection] = useState<string>('contact')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setResumeData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      jobTitle: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: ['']
    }
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, newExp]
    }))
  }

  const updateExperience = (id: string, updates: Partial<Experience>) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => 
        exp.id === id ? { ...exp, ...updates } : exp
      )
    }))
  }

  const removeExperience = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }))
  }

  const addEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      degree: '',
      institution: '',
      location: '',
      graduationDate: '',
      gpa: '',
      achievements: ['']
    }
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, newEdu]
    }))
  }

  const updateEducation = (id: string, updates: Partial<Education>) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(edu => 
        edu.id === id ? { ...edu, ...updates } : edu
      )
    }))
  }

  const removeEducation = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }))
  }

  const addSkill = () => {
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: '',
      category: 'Technical',
      proficiency: 'Intermediate'
    }
    setResumeData(prev => ({
      ...prev,
      skills: [...prev.skills, newSkill]
    }))
  }

  const updateSkill = (id: string, updates: Partial<Skill>) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.map(skill => 
        skill.id === id ? { ...skill, ...updates } : skill
      )
    }))
  }

  const removeSkill = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill.id !== id)
    }))
  }

  const addListItem = (section: 'certifications' | 'projects' | 'languages') => {
    setResumeData(prev => ({
      ...prev,
      [section]: [...prev[section], '']
    }))
  }

  const updateListItem = (section: 'certifications' | 'projects' | 'languages', index: number, value: string) => {
    setResumeData(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) => i === index ? value : item)
    }))
  }

  const removeListItem = (section: 'certifications' | 'projects' | 'languages', index: number) => {
    setResumeData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Save to database or call parent handler
      if (onSave) {
        await onSave(resumeData)
      }
    } catch (error) {
      console.error('Error saving resume:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generatePDF = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/resume/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData, userId })
      })
      
      if (response.ok) {
        const { pdfUrl } = await response.json()
        window.open(pdfUrl, '_blank')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const currentTemplate = getTemplateByRegion(resumeData.templateRegion)
  
  const sections = [
    { id: 'template', label: 'Template', icon: Settings },
    { id: 'contact', label: 'Contact Info', icon: User },
    ...(currentTemplate.includePersonalDetails ? [{ id: 'personal', label: 'Personal Details', icon: User }] : []),
    { id: 'summary', label: currentTemplate.sectionLabels.summary || 'Summary', icon: FileText },
    { id: 'experience', label: currentTemplate.sectionLabels.experience || 'Experience', icon: Briefcase },
    { id: 'education', label: currentTemplate.sectionLabels.education || 'Education', icon: GraduationCap },
    { id: 'skills', label: currentTemplate.sectionLabels.skills || 'Skills', icon: Code },
    { id: 'certifications', label: currentTemplate.sectionLabels.certifications || 'Certifications', icon: Award },
    { id: 'projects', label: currentTemplate.sectionLabels.projects || 'Projects', icon: Globe },
    { id: 'languages', label: currentTemplate.sectionLabels.languages || 'Languages', icon: Globe }
  ]

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Resume Builder</h1>
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save Resume
          </Button>
          <Button onClick={generatePDF} disabled={isLoading} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Section Navigation */}
        <div className="w-64 space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'hover:bg-gray-100'
              }`}
            >
              <section.icon className="h-5 w-5 mr-3" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <Card className="p-6">
            {activeSection === 'template' && (
              <TemplateSelectionSection
                templateRegion={resumeData.templateRegion}
                includePhoto={resumeData.includePhoto}
                photoUrl={resumeData.photoUrl}
                onChange={(updates) =>
                  setResumeData(prev => ({ ...prev, ...updates }))
                }
              />
            )}

            {activeSection === 'personal' && currentTemplate.includePersonalDetails && (
              <PersonalDetailsSection
                personalDetails={resumeData.personalDetails || {}}
                onChange={(personalDetails) =>
                  setResumeData(prev => ({ ...prev, personalDetails }))
                }
              />
            )}

            {activeSection === 'contact' && (
              <ContactInfoSection
                contactInfo={resumeData.contactInfo}
                onChange={(updates) => 
                  setResumeData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, ...updates }
                  }))
                }
              />
            )}

            {activeSection === 'summary' && (
              <SummarySection
                summary={resumeData.professionalSummary}
                onChange={(summary) =>
                  setResumeData(prev => ({ ...prev, professionalSummary: summary }))
                }
              />
            )}

            {activeSection === 'experience' && (
              <ExperienceSection
                experience={resumeData.experience}
                onAdd={addExperience}
                onUpdate={updateExperience}
                onRemove={removeExperience}
              />
            )}

            {activeSection === 'education' && (
              <EducationSection
                education={resumeData.education}
                onAdd={addEducation}
                onUpdate={updateEducation}
                onRemove={removeEducation}
              />
            )}

            {activeSection === 'skills' && (
              <SkillsSection
                skills={resumeData.skills}
                onAdd={addSkill}
                onUpdate={updateSkill}
                onRemove={removeSkill}
              />
            )}

            {['certifications', 'projects', 'languages'].includes(activeSection) && (
              <ListSection
                title={sections.find(s => s.id === activeSection)?.label || ''}
                items={resumeData[activeSection as keyof Pick<ResumeData, 'certifications' | 'projects' | 'languages'>]}
                onAdd={() => addListItem(activeSection as 'certifications' | 'projects' | 'languages')}
                onUpdate={(index, value) => updateListItem(activeSection as 'certifications' | 'projects' | 'languages', index, value)}
                onRemove={(index) => removeListItem(activeSection as 'certifications' | 'projects' | 'languages', index)}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

// Contact Info Section Component
function ContactInfoSection({ 
  contactInfo, 
  onChange 
}: { 
  contactInfo: ContactInfo
  onChange: (updates: Partial<ContactInfo>) => void 
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Full Name *</label>
          <input
            type="text"
            value={contactInfo.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="John Doe"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Email *</label>
          <input
            type="email"
            value={contactInfo.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="john@example.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Phone *</label>
          <input
            type="tel"
            value={contactInfo.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="+1 (555) 123-4567"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Address</label>
          <input
            type="text"
            value={contactInfo.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="City, State, Country"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">LinkedIn</label>
          <input
            type="url"
            value={contactInfo.linkedin || ''}
            onChange={(e) => onChange({ linkedin: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="https://linkedin.com/in/johndoe"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Website</label>
          <input
            type="url"
            value={contactInfo.website || ''}
            onChange={(e) => onChange({ website: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="https://johndoe.com"
          />
        </div>
      </div>
    </div>
  )
}

// Professional Summary Section Component
function SummarySection({ 
  summary, 
  onChange 
}: { 
  summary: string
  onChange: (summary: string) => void 
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Professional Summary</h2>
      <div>
        <label className="block text-sm font-medium mb-2">
          Write a compelling professional summary (2-4 sentences)
        </label>
        <textarea
          value={summary}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Experienced professional with expertise in..."
        />
      </div>
    </div>
  )
}

// Experience Section Component
function ExperienceSection({ 
  experience, 
  onAdd, 
  onUpdate, 
  onRemove 
}: {
  experience: Experience[]
  onAdd: () => void
  onUpdate: (id: string, updates: Partial<Experience>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Work Experience</h2>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Experience
        </Button>
      </div>

      {experience.map((exp) => (
        <div key={exp.id} className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div>
                <label className="block text-sm font-medium mb-2">Job Title *</label>
                <input
                  type="text"
                  value={exp.jobTitle}
                  onChange={(e) => onUpdate(exp.id, { jobTitle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Software Engineer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Company *</label>
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) => onUpdate(exp.id, { company: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ABC Company"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={exp.location}
                  onChange={(e) => onUpdate(exp.id, { location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="New York, NY"
                />
              </div>
              
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="month"
                    value={exp.startDate}
                    onChange={(e) => onUpdate(exp.id, { startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="month"
                    value={exp.endDate}
                    onChange={(e) => onUpdate(exp.id, { endDate: e.target.value })}
                    disabled={exp.current}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
                
                <div className="flex items-center pb-2">
                  <input
                    type="checkbox"
                    id={`current-${exp.id}`}
                    checked={exp.current}
                    onChange={(e) => onUpdate(exp.id, { 
                      current: e.target.checked, 
                      endDate: e.target.checked ? '' : exp.endDate 
                    })}
                    className="mr-2"
                  />
                  <label htmlFor={`current-${exp.id}`} className="text-sm">Current</label>
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemove(exp.id)}
              className="ml-4 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description & Achievements</label>
            <textarea
              value={exp.description.join('\n')}
              onChange={(e) => onUpdate(exp.id, { description: e.target.value.split('\n') })}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="• Developed web applications using React and Node.js&#10;• Improved system performance by 40%&#10;• Led a team of 5 developers"
            />
            <p className="text-xs text-gray-500 mt-1">Separate each achievement with a new line. Use bullet points for better formatting.</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Education Section Component
function EducationSection({ 
  education, 
  onAdd, 
  onUpdate, 
  onRemove 
}: {
  education: Education[]
  onAdd: () => void
  onUpdate: (id: string, updates: Partial<Education>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Education</h2>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Education
        </Button>
      </div>

      {education.map((edu) => (
        <div key={edu.id} className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div>
                <label className="block text-sm font-medium mb-2">Degree *</label>
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => onUpdate(edu.id, { degree: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Bachelor of Science in Computer Science"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Institution *</label>
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => onUpdate(edu.id, { institution: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="University of California"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={edu.location}
                  onChange={(e) => onUpdate(edu.id, { location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Berkeley, CA"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Graduation Date</label>
                <input
                  type="month"
                  value={edu.graduationDate}
                  onChange={(e) => onUpdate(edu.id, { graduationDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">GPA (optional)</label>
                <input
                  type="text"
                  value={edu.gpa || ''}
                  onChange={(e) => onUpdate(edu.id, { gpa: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="3.8/4.0"
                />
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemove(edu.id)}
              className="ml-4 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Achievements & Honors</label>
            <textarea
              value={edu.achievements.join('\n')}
              onChange={(e) => onUpdate(edu.id, { achievements: e.target.value.split('\n') })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="• Summa Cum Laude&#10;• Dean's List (4 semesters)&#10;• Computer Science Club President"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Skills Section Component
function SkillsSection({ 
  skills, 
  onAdd, 
  onUpdate, 
  onRemove 
}: {
  skills: Skill[]
  onAdd: () => void
  onUpdate: (id: string, updates: Partial<Skill>) => void
  onRemove: (id: string) => void
}) {
  const categories = ['Technical', 'Soft Skills', 'Languages', 'Tools', 'Frameworks']
  const proficiencyLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Skills</h2>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill) => (
          <div key={skill.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Skill Name</label>
                  <input
                    type="text"
                    value={skill.name}
                    onChange={(e) => onUpdate(skill.id, { name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="JavaScript"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={skill.category}
                    onChange={(e) => onUpdate(skill.id, { category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Proficiency</label>
                  <select
                    value={skill.proficiency}
                    onChange={(e) => onUpdate(skill.id, { proficiency: e.target.value as Skill['proficiency'] })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {proficiencyLevels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRemove(skill.id)}
                className="ml-3 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Generic List Section Component
function ListSection({ 
  title, 
  items, 
  onAdd, 
  onUpdate, 
  onRemove 
}: {
  title: string
  items: string[]
  onAdd: () => void
  onUpdate: (index: number, value: string) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add {title.slice(0, -1)}
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-3">
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(index, e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${title.toLowerCase().slice(0, -1)}...`}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemove(index)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {items.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No {title.toLowerCase()} added yet. Click &quot;Add {title.slice(0, -1)}&quot; to get started.
          </p>
        )}
      </div>
    </div>
  )
}

// Template Selection Component
function TemplateSelectionSection({
  templateRegion,
  includePhoto,
  photoUrl,
  onChange
}: {
  templateRegion: TemplateRegion
  includePhoto: boolean
  photoUrl?: string
  onChange: (updates: Partial<ResumeData>) => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Choose Your Resume Template</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              templateRegion === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onChange({ 
              templateRegion: template.id,
              includePhoto: template.includePhoto,
            })}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{template.flag}</span>
              <span className="text-xs font-medium text-gray-500">
                Max {template.maxPages} pages
              </span>
            </div>
            
            <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
            
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">Features:</div>
              <div className="flex flex-wrap gap-1">
                {template.features.map((feature, index) => (
                  <span
                    key={index}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            
            {templateRegion === template.id && (
              <div className="mt-3 text-sm text-blue-600 font-medium">
                ✓ Selected
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Photo Upload Section (for templates that support it) */}
      {ALL_TEMPLATES.find(t => t.id === templateRegion)?.includePhoto && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Professional Photo</h3>
          <div className="flex items-start space-x-4">
            {photoUrl ? (
              <div className="relative">
                <img
                  src={photoUrl}
                  alt="Profile"
                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={() => onChange({ photoUrl: undefined })}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
            )}
            
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                Upload a professional headshot. This will appear in your {templateRegion} format resume.
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    // In a real implementation, you'd upload this file
                    // For now, we'll just use a placeholder URL
                    const url = URL.createObjectURL(file)
                    onChange({ photoUrl: url })
                  }
                }}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 400x400px, professional attire, neutral background
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Personal Details Component (for EU/International templates)
function PersonalDetailsSection({
  personalDetails,
  onChange
}: {
  personalDetails: PersonalDetails
  onChange: (details: PersonalDetails) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Personal Details</h2>
        <p className="text-gray-600 mt-1">
          Additional personal information for European/International resumes
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Age (optional)</label>
          <input
            type="number"
            value={personalDetails.age || ''}
            onChange={(e) => onChange({ 
              ...personalDetails, 
              age: e.target.value ? parseInt(e.target.value) : undefined 
            })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="25"
            min="16"
            max="100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Nationality (optional)</label>
          <input
            type="text"
            value={personalDetails.nationality || ''}
            onChange={(e) => onChange({ 
              ...personalDetails, 
              nationality: e.target.value 
            })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="American"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Marital Status (optional)</label>
          <select
            value={personalDetails.maritalStatus || ''}
            onChange={(e) => onChange({ 
              ...personalDetails, 
              maritalStatus: e.target.value 
            })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">ℹ️ Privacy Note</h4>
        <p className="text-blue-800 text-sm">
          Personal details like age, nationality, and marital status are commonly included 
          in European CVs but are not required. In some countries (like the US), including 
          this information is discouraged. Only provide information you&apos;re comfortable sharing.
        </p>
      </div>
    </div>
  )
}