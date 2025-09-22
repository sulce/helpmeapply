import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  yearsUsed: z.number().min(0, 'Years used cannot be negative').optional(),
})

// Relaxed skill schema for drafts
export const skillDraftSchema = z.object({
  name: z.string().optional(),
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  yearsUsed: z.number().min(0, 'Years used cannot be negative').optional(),
})

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().optional(),
  jobTitlePrefs: z.array(z.string()).min(1, 'At least one job title preference is required'),
  yearsExperience: z.number().min(0, 'Years of experience cannot be negative').optional(),
  salaryMin: z.number().min(0, 'Minimum salary cannot be negative').optional(),
  salaryMax: z.number().min(0, 'Maximum salary cannot be negative').optional(),
  preferredLocations: z.array(z.string()).min(1, 'At least one preferred location is required'),
  employmentTypes: z.array(z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'REMOTE'])).min(1, 'At least one employment type is required'),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  indeedProfile: z.string().optional(),
  resumeUrl: z.string().optional(),
  skills: z.array(skillSchema).optional(),
})

// Very relaxed schema for saving drafts - allows any data structure
export const profileDraftSchema = z.object({
  fullName: z.any().optional(),
  email: z.any().optional(),
  mobile: z.any().optional(),
  jobTitlePrefs: z.any().optional(),
  yearsExperience: z.any().optional(),
  salaryMin: z.any().optional(),
  salaryMax: z.any().optional(),
  preferredLocations: z.any().optional(),
  employmentTypes: z.any().optional(),
  linkedinUrl: z.any().optional(),
  indeedProfile: z.any().optional(),
  resumeUrl: z.any().optional(),
  skills: z.any().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type ProfileDraftInput = z.infer<typeof profileDraftSchema>
export type SkillInput = z.infer<typeof skillSchema>