import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export interface JobMatchingRequest {
  profile: {
    fullName: string
    skills: Array<{
      name: string
      proficiency: string
      yearsUsed?: number
    }>
    jobTitlePrefs: string[]
    yearsExperience?: number
    preferredLocations: string[]
    employmentTypes: string[]
    resumeContent?: string
  }
  jobDescription: {
    title: string
    company: string
    description: string
    requirements: string[]
    location?: string
    salaryRange?: string
    employmentType?: string
  }
}

export interface JobMatchResult {
  matchScore: number // 0-1 score
  reasons: string[]
  concerns: string[]
  recommendation: 'highly_recommended' | 'recommended' | 'maybe' | 'not_recommended'
}

export interface CoverLetterRequest {
  profile: {
    fullName: string
    skills: Array<{
      name: string
      proficiency: string
      yearsUsed?: number
    }>
    jobTitlePrefs: string[]
    yearsExperience?: number
    resumeContent?: string
  }
  job: {
    title: string
    company: string
    description: string
    requirements: string[]
  }
}

export async function analyzeJobMatch(request: JobMatchingRequest): Promise<JobMatchResult> {
  try {
    const prompt = `
Analyze how well this candidate matches the job posting. Return a JSON response with the following structure:
{
  "matchScore": number (0-1),
  "reasons": ["reason 1", "reason 2"],
  "concerns": ["concern 1", "concern 2"],
  "recommendation": "highly_recommended" | "recommended" | "maybe" | "not_recommended"
}

CANDIDATE PROFILE:
- Name: ${request.profile.fullName}
- Preferred Job Titles: ${request.profile.jobTitlePrefs.join(', ')}
- Years of Experience: ${request.profile.yearsExperience || 'Not specified'}
- Skills: ${request.profile.skills.map(s => `${s.name} (${s.proficiency}${s.yearsUsed ? ', ' + s.yearsUsed + ' years' : ''})`).join(', ')}
- Preferred Locations: ${request.profile.preferredLocations.join(', ')}
- Employment Types: ${request.profile.employmentTypes.join(', ')}

JOB POSTING:
- Title: ${request.jobDescription.title}
- Company: ${request.jobDescription.company}
- Location: ${request.jobDescription.location || 'Not specified'}
- Employment Type: ${request.jobDescription.employmentType || 'Not specified'}
- Salary: ${request.jobDescription.salaryRange || 'Not specified'}
- Description: ${request.jobDescription.description}
- Requirements: ${request.jobDescription.requirements.join(', ')}

Analyze the match based on:
1. Skill alignment with requirements
2. Experience level fit
3. Location preferences
4. Employment type compatibility
5. Career goals alignment

Provide specific reasons for the match score and any concerns.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert job matching AI that analyzes candidate-job fit. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Clean response by removing markdown code blocks if present
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    return JSON.parse(cleanedResponse)
  } catch (error) {
    console.error('OpenAI job matching error:', error)
    throw new Error('Failed to analyze job match')
  }
}

export async function generateCoverLetter(request: CoverLetterRequest): Promise<string> {
  try {
    const prompt = `
Write a professional cover letter for this job application. Make it personalized, concise (2-3 paragraphs), and compelling.

CANDIDATE:
- Name: ${request.profile.fullName}
- Preferred Roles: ${request.profile.jobTitlePrefs.join(', ')}
- Years of Experience: ${request.profile.yearsExperience || 'Not specified'}
- Key Skills: ${request.profile.skills.map(s => `${s.name} (${s.proficiency})`).join(', ')}

JOB:
- Title: ${request.job.title}
- Company: ${request.job.company}
- Description: ${request.job.description}
- Key Requirements: ${request.job.requirements.join(', ')}

Guidelines:
- Start with enthusiasm for the specific role and company
- Highlight 2-3 most relevant skills/experiences that match the requirements
- Show knowledge of the company/role
- End with a strong call to action
- Keep it professional but personable
- Avoid generic phrases
- Don't repeat the entire resume

Return only the cover letter text, no additional formatting or metadata.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert career coach and professional writer specializing in cover letters. Write compelling, personalized cover letters that get interviews.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 800,
    })

    const coverLetter = completion.choices[0]?.message?.content
    if (!coverLetter) {
      throw new Error('No response from OpenAI')
    }

    return coverLetter.trim()
  } catch (error) {
    console.error('OpenAI cover letter generation error:', error)
    throw new Error('Failed to generate cover letter')
  }
}

export async function extractJobRequirements(jobDescription: string): Promise<string[]> {
  try {
    const prompt = `
Extract the key requirements from this job description. Return a JSON array of strings containing the most important qualifications, skills, and requirements.

Focus on:
- Required technical skills
- Years of experience needed
- Educational requirements
- Certifications
- Soft skills mentioned
- Specific tools/technologies

Job Description:
${jobDescription}

Return only a JSON array like: ["requirement 1", "requirement 2", ...]
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing job descriptions and extracting key requirements. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 500,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Clean the response to remove any markdown formatting or extra characters
    let cleanedResponse = response.trim()
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Remove any leading/trailing backticks
    cleanedResponse = cleanedResponse.replace(/^`+|`+$/g, '').trim()

    try {
      return JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Failed to parse cleaned JSON:', cleanedResponse)
      throw new Error(`Invalid JSON response: ${parseError}`)
    }
  } catch (error) {
    console.error('OpenAI requirement extraction error:', error)
    throw new Error('Failed to extract job requirements')
  }
}

export async function findRelevantJobs(profileSummary: string, jobTitles: string[]): Promise<string[]> {
  try {
    const prompt = `
Based on this candidate profile, suggest relevant job titles they should search for. Include variations, synonyms, and related roles.

Profile Summary:
${profileSummary}

Current preferences: ${jobTitles.join(', ')}

Return a JSON array of 10-15 relevant job titles, including:
- Exact matches to preferences
- Senior/junior variations
- Related roles in the same field
- Cross-functional opportunities
- Industry-specific variations

Return only a JSON array like: ["Job Title 1", "Job Title 2", ...]
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a career advisor expert at identifying relevant job opportunities. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 400,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    return JSON.parse(response)
  } catch (error) {
    console.error('OpenAI job suggestion error:', error)
    throw new Error('Failed to find relevant jobs')
  }
}