import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import OpenAI from 'openai'

// Helper function to fetch file from URL and convert to Blob
async function fetchFileAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch file from ${url}: ${response.status}`)
  }
  
  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') || 'application/octet-stream'
  
  return new Blob([buffer], { type: contentType })
}

interface NextQuestionRequest {
  sessionId: string
  resumeFile?: Blob
  jobDescription: string
  previousQuestionAudio?: string
  previousAnswerAudio?: string
  questionIndex: number
  totalQuestions: number
}

interface GradioResponse {
  data: [
    string,  // [0] Interviewer Question Audio - filepath
    string,  // [1] Your turn! Record Your Answer Audio - filepath  
    string   // [2] Performance Evaluation - text
  ]
}

// Built-in interview questions fallback
async function handleBuiltInQuestions(
  sessionId: string,
  questionIndex: number, 
  totalQuestions: number,
  interviewSession: any,
  jobDescription: string
): Promise<NextResponse> {
  try {
    // Professional interview questions based on job type and progress
    const getQuestionForRole = (jobTitle: string, qIndex: number): string => {
      const roleType = jobTitle.toLowerCase()
      
      // Question banks by role type
      const questions = {
        opening: [
          "Tell me about yourself and your professional background.",
          "Why are you interested in this position at our company?",
          "What attracted you to apply for this role?"
        ],
        technical: [
          roleType.includes('engineer') || roleType.includes('developer') ? 
            "Walk me through your approach to solving a complex technical problem." :
          roleType.includes('manager') ? 
            "Describe your management style and how you handle team conflicts." :
          roleType.includes('designer') ?
            "Tell me about your design process from concept to final product." :
            "What technical skills make you well-suited for this position?"
        ],
        experience: [
          "Describe a challenging project you've worked on and how you overcame obstacles.",
          "Tell me about a time when you had to learn a new technology quickly.",
          "Give me an example of when you collaborated with a difficult team member."
        ],
        behavioral: [
          "How do you handle tight deadlines and pressure?",
          "Describe a time when you failed at something. What did you learn?",
          "Tell me about a time you went above and beyond for a project."
        ],
        closing: [
          "Where do you see yourself in 5 years?",
          "What questions do you have for me about the role or company?",
          "What would success look like for you in this position?"
        ]
      }
      
      // Select appropriate question based on interview progress
      if (qIndex === 0) return questions.opening[qIndex % 3]
      if (qIndex === totalQuestions - 1) return questions.closing[qIndex % 3]
      if (qIndex === 1) return questions.technical[0]
      if (qIndex <= 2) return questions.experience[qIndex % 3]
      return questions.behavioral[qIndex % 3]
    }
    
    const questionText = getQuestionForRole(interviewSession.jobTitle, questionIndex)
    
    // Save the question to database
    const interviewQuestion = await prisma.interviewQuestion.create({
      data: {
        sessionId: sessionId,
        questionIndex: questionIndex,
        questionText: questionText,
        questionAudioUrl: null // Built-in questions are text-only
      }
    })

    // Update session progress
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        currentQuestion: questionIndex,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        questionId: interviewQuestion.id,
        questionText: questionText,
        questionAudioUrl: null,
        questionIndex: questionIndex,
        totalQuestions: totalQuestions,
        sessionId: sessionId
      }
    })

  } catch (error) {
    console.error('Built-in questions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate interview question' },
      { status: 500 }
    )
  }
}

// OpenAI-based interview handler
async function handleOpenAIInterview(
  userId: string,
  sessionId: string, 
  jobDescription: string,
  questionIndex: number,
  totalQuestions: number,
  interviewSession: any
): Promise<NextResponse> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Get user profile for context
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { skills: true }
    })

    // Generate interview question based on job description and progress
    const questionPrompt = `You are conducting a professional job interview. 

Job Details:
- Position: ${interviewSession.jobTitle}
- Company: ${interviewSession.company}  
- Job Description: ${jobDescription}

Interview Progress:
- Current Question: ${questionIndex + 1} of ${totalQuestions}
- Candidate Background: ${profile?.fullName || 'Candidate'}
- Skills: ${profile?.skills?.map(s => s.name).join(', ') || 'Various skills'}

Generate a professional, relevant interview question that:
1. Is appropriate for this stage of the interview (question ${questionIndex + 1} of ${totalQuestions})
2. Relates to the job requirements and responsibilities
3. Is conversational and realistic
4. Tests relevant skills and experience

${questionIndex === 0 ? 'Start with an opening question like "Tell me about yourself" or "Why are you interested in this position?"' : ''}
${questionIndex === totalQuestions - 1 ? 'This is the final question - make it about future goals or closing thoughts.' : ''}

Respond with just the question text, no additional formatting.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced hiring manager conducting professional job interviews. Generate realistic, relevant interview questions.'
        },
        {
          role: 'user', 
          content: questionPrompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    })

    const questionText = response.choices[0]?.message?.content?.trim() || 
      `Tell me about your experience with ${interviewSession.jobTitle} roles and what interests you about this position.`

    // Save the question to database
    const interviewQuestion = await prisma.interviewQuestion.create({
      data: {
        sessionId: sessionId,
        questionIndex: questionIndex,
        questionText: questionText,
        // No audio URL for OpenAI version - we'll use text-to-speech later if needed
        questionAudioUrl: null
      }
    })

    // Update session progress
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        currentQuestion: questionIndex,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        questionId: interviewQuestion.id,
        questionText: questionText,
        questionAudioUrl: null, // Will be text-based for now
        questionIndex: questionIndex,
        totalQuestions: totalQuestions,
        sessionId: sessionId
      }
    })

  } catch (error) {
    console.error('OpenAI interview error:', error)
    
    // Fallback to pre-defined questions
    const fallbackQuestions = [
      "Tell me about yourself and your background.",
      "Why are you interested in this position?", 
      "What are your greatest strengths?",
      "Describe a challenging project you've worked on.",
      "Where do you see yourself in 5 years?"
    ]
    
    const questionText = fallbackQuestions[questionIndex] || fallbackQuestions[0]
    
    const interviewQuestion = await prisma.interviewQuestion.create({
      data: {
        sessionId: sessionId,
        questionIndex: questionIndex,
        questionText: questionText,
        questionAudioUrl: null
      }
    })

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        currentQuestion: questionIndex,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        questionId: interviewQuestion.id,
        questionText: questionText,
        questionAudioUrl: null,
        questionIndex: questionIndex,
        totalQuestions: totalQuestions,
        sessionId: sessionId
      }
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const sessionId = formData.get('sessionId') as string
    const jobDescription = formData.get('jobDescription') as string
    const previousQuestionAudio = formData.get('previousQuestionAudio') as string
    const previousAnswerAudio = formData.get('previousAnswerAudio') as string
    const questionIndex = parseInt(formData.get('questionIndex') as string)
    const totalQuestions = parseInt(formData.get('totalQuestions') as string)
    const resumeFile = formData.get('resumeFile') as File

    if (!sessionId || !jobDescription || questionIndex < 0 || totalQuestions <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the interview session belongs to the user
    const interviewSession = await prisma.interviewSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!interviewSession) {
      return NextResponse.json(
        { error: 'Interview session not found' },
        { status: 404 }
      )
    }

    // Check if we have the Gradio endpoint configured
    const gradioEndpoint = process.env.GRADIO_INTERVIEW_ENDPOINT
    
    // If Gradio endpoint is not configured, fall back to built-in questions
    if (!gradioEndpoint) {
      console.log('Gradio endpoint not configured, using built-in questions')
      return await handleBuiltInQuestions(sessionId, questionIndex, totalQuestions, interviewSession, jobDescription)
    }

    console.log(`Calling Gradio interview coach for session ${sessionId}, question ${questionIndex}`)
    console.log(`Gradio endpoint: ${gradioEndpoint}`)

    // Try Gradio API integration using the correct client format
    let gradioResponse;
    try {
      console.log('=== ATTEMPTING GRADIO REQUEST ===')
      console.log('Gradio endpoint:', gradioEndpoint)
      
      // Get user's resume file for Gradio
      const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { resumeUrl: true }
      })
      
      // Prepare resume file for Gradio - need to send actual file data, not URL
      let resumeFileData = null
      if (profile?.resumeUrl) {
        try {
          console.log('Fetching resume from URL:', profile.resumeUrl)
          const resumeResponse = await fetch(profile.resumeUrl)
          if (resumeResponse.ok) {
            const resumeBlob = await resumeResponse.blob()
            // Convert blob to base64 for Gradio
            const resumeBuffer = await resumeBlob.arrayBuffer()
            const resumeBase64 = Buffer.from(resumeBuffer).toString('base64')
            
            // Create Gradio-compatible file object
            resumeFileData = {
              path: "resume.pdf",
              url: null,
              size: resumeBuffer.byteLength,
              orig_name: "resume.pdf",
              mime_type: resumeBlob.type || "application/pdf",
              is_stream: false,
              meta: { "_type": "gradio.FileData" }
            }
            
            console.log('Resume file prepared for Gradio:', {
              size: resumeFileData.size,
              type: resumeFileData.mime_type
            })
          } else {
            console.warn('Failed to fetch resume:', resumeResponse.status)
          }
        } catch (error) {
          console.error('Error preparing resume file:', error)
        }
      } else {
        console.log('No resume URL found in user profile')
      }
      
      // Prepare previous audio files if they exist
      let questionAudioData = null
      let answerAudioData = null
      
      if (previousQuestionAudio) {
        try {
          const audioResponse = await fetch(previousQuestionAudio)
          if (audioResponse.ok) {
            const audioBlob = await audioResponse.blob()
            const audioBuffer = await audioBlob.arrayBuffer()
            questionAudioData = {
              path: "question.wav",
              url: null,
              size: audioBuffer.byteLength,
              orig_name: "question.wav", 
              mime_type: "audio/wav",
              is_stream: false,
              meta: { "_type": "gradio.FileData" }
            }
          }
        } catch (error) {
          console.error('Error preparing question audio:', error)
        }
      }
      
      if (previousAnswerAudio) {
        try {
          const audioResponse = await fetch(previousAnswerAudio)
          if (audioResponse.ok) {
            const audioBlob = await audioResponse.blob()
            const audioBuffer = await audioBlob.arrayBuffer()
            answerAudioData = {
              path: "answer.wav",
              url: null,
              size: audioBuffer.byteLength,
              orig_name: "answer.wav",
              mime_type: "audio/wav", 
              is_stream: false,
              meta: { "_type": "gradio.FileData" }
            }
          }
        } catch (error) {
          console.error('Error preparing answer audio:', error)
        }
      }
      
      // Prepare the correct Gradio API data structure
      const gradioRequestData = [
        resumeFileData, // resume file object or null
        jobDescription, // job description string
        totalQuestions, // number of questions
        questionAudioData, // previous question audio or null
        answerAudioData  // previous answer audio or null
      ]
      
      console.log('=== GRADIO REQUEST DATA ===')
      console.log('Resume file:', resumeFileData ? 'Present' : 'None')
      console.log('Job description length:', jobDescription.length)
      console.log('Total questions:', totalQuestions)
      console.log('Question audio:', questionAudioData ? 'Present' : 'None')
      console.log('Answer audio:', answerAudioData ? 'Present' : 'None')
      
      // Use the correct Gradio API endpoint
      const gradioApiUrl = `${gradioEndpoint}/api/predict`
      
      gradioResponse = await fetch(gradioApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fn_index: 0,
          data: gradioRequestData
        })
      })
      
      console.log('=== GRADIO RESPONSE ===')
      console.log('Status:', gradioResponse.status, gradioResponse.statusText)
      console.log('Headers:', Object.fromEntries(gradioResponse.headers.entries()))
      
      if (!gradioResponse.ok) {
        const errorText = await gradioResponse.text()
        console.log('Gradio API error response:', errorText)
        console.log('Falling back to built-in questions due to API error')
        return await handleBuiltInQuestions(sessionId, questionIndex, totalQuestions, interviewSession, jobDescription)
      }
      
    } catch (error) {
      console.error('=== GRADIO API NETWORK ERROR ===')
      console.error('Network error calling Gradio:', error)
      console.log('Falling back to built-in questions due to network error')
      return await handleBuiltInQuestions(sessionId, questionIndex, totalQuestions, interviewSession, jobDescription)
    }

    if (!gradioResponse.ok) {
      console.error('Gradio API error:', gradioResponse.status, gradioResponse.statusText)
      console.log('Falling back to built-in interview questions...')
      
      // Fallback to built-in questions when Gradio is unavailable
      return await handleBuiltInQuestions(sessionId, questionIndex, totalQuestions, interviewSession, jobDescription)
    }

    let gradioResponseData
    try {
      const responseText = await gradioResponse.text()
      console.log('=== RAW GRADIO RESPONSE TEXT ===')
      console.log('Response text:', responseText)
      console.log('Response length:', responseText.length)
      
      if (!responseText.trim()) {
        console.log('Empty response from Gradio')
        throw new Error('Empty response from Gradio service')
      }
      
      gradioResponseData = JSON.parse(responseText)
      
      console.log('=== GRADIO RESPONSE DEBUG ===')
      console.log('Parsed response:', JSON.stringify(gradioResponseData, null, 2))
      console.log('=== END RESPONSE DEBUG ===')
    } catch (jsonError) {
      console.error('=== JSON PARSING ERROR ===')
      console.error('Failed to parse Gradio response as JSON:', jsonError)
      console.log('Falling back to built-in questions due to JSON parse error')
      return await handleBuiltInQuestions(sessionId, questionIndex, totalQuestions, interviewSession, jobDescription)
    }
    
    // Extract data from Gradio response based on the API documentation
    // Returns 3 elements: [questionAudio, answerAudio, evaluationText]
    let questionAudioPath, answerAudioPath, evaluationText
    
    try {
      if (gradioResponseData.data && Array.isArray(gradioResponseData.data)) {
        // Standard Gradio response format - array of 3 elements
        const [interviewerQuestionAudio, recordAnswerAudio, performanceEvaluation] = gradioResponseData.data
        
        questionAudioPath = interviewerQuestionAudio
        answerAudioPath = recordAnswerAudio  
        evaluationText = performanceEvaluation
        
        console.log('=== GRADIO RESPONSE BREAKDOWN ===')
        console.log('[0] Interviewer Question Audio:', questionAudioPath)
        console.log('[1] Record Answer Audio:', answerAudioPath) 
        console.log('[2] Performance Evaluation:', evaluationText)
        
      } else {
        console.error('Unexpected Gradio response format:', gradioResponseData)
        console.log('Expected data array with 3 elements, falling back to built-in questions')
        return await handleBuiltInQuestions(sessionId, questionIndex, totalQuestions, interviewSession, jobDescription)
      }
    } catch (extractError) {
      console.error('Error extracting data from Gradio response:', extractError)
      return await handleBuiltInQuestions(sessionId, questionIndex, totalQuestions, interviewSession, jobDescription)
    }
    
    // Convert Gradio file paths to accessible URLs
    // Gradio typically exposes files at /file/ endpoint
    const gradioBaseUrl = process.env.GRADIO_INTERVIEW_ENDPOINT
    const questionAudioUrl = questionAudioPath ? `${gradioBaseUrl}/file=${questionAudioPath}` : null
    
    console.log('=== GRADIO FILE MAPPING ===')
    console.log('Question audio path:', questionAudioPath)
    console.log('Question audio URL:', questionAudioUrl)
    console.log('Performance evaluation:', evaluationText)
    console.log('=== END FILE MAPPING ===')
    
    // For the question text, we'll use the evaluation text or generate a fallback
    // The actual question audio is provided via questionAudioUrl
    const questionText = evaluationText || `Interview question ${questionIndex + 1} of ${totalQuestions} for ${interviewSession.jobTitle} position.`

    // Save the new question to database
    const interviewQuestion = await prisma.interviewQuestion.create({
      data: {
        sessionId: sessionId,
        questionIndex: questionIndex,
        questionAudioUrl: questionAudioUrl,
        questionText: questionText,
      }
    })

    // Update the interview session with current question
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        currentQuestion: questionIndex,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        questionId: interviewQuestion.id,
        questionAudioUrl: questionAudioUrl,
        questionText: questionText,
        questionIndex: questionIndex,
        totalQuestions: totalQuestions,
        sessionId: sessionId
      }
    })

  } catch (error) {
    console.error('Next question API error:', error)
    return NextResponse.json(
      { error: 'Failed to get next interview question' },
      { status: 500 }
    )
  }
}