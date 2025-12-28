'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, Play, Pause, RotateCcw, CheckCircle, Volume2, Square, MessageSquare } from 'lucide-react'
import { useAudioRecording } from '@/hooks/useAudioRecording'

interface InterviewQuestion {
  id: string
  questionIndex: number
  questionText: string
  questionAudioUrl: string
  userAnswerText?: string
  userAnswerAudioUrl?: string
  answeredAt?: string
  feedback?: string
  score?: number
}

interface InterviewSessionData {
  id: string
  status: string
  jobTitle: string
  company: string
  currentQuestion: number
  totalQuestions: number
  overallScore?: number
  feedback?: string
}

interface InterviewProgress {
  current: number
  total: number
  answered: number
  completion: number
}

interface InterviewSessionProps {
  sessionId: string
  onComplete?: () => void
}

export function InterviewSession({ sessionId, onComplete }: InterviewSessionProps) {
  const [session, setSession] = useState<InterviewSessionData | null>(null)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [progress, setProgress] = useState<InterviewProgress | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const questionAudioRef = useRef<HTMLAudioElement | null>(null)
  const router = useRouter()
  
  // Audio recording hook
  const audioRecording = useAudioRecording()

  // Load session data
  useEffect(() => {
    loadSession()
  }, [sessionId])

  // Load current question when session data changes
  useEffect(() => {
    if (session && questions.length > 0) {
      const currentQ = questions[session.currentQuestion]
      if (currentQ) {
        setCurrentQuestion(currentQ)
      } else if (session.currentQuestion === 0) {
        // Need to get first question
        getNextQuestion()
      }
    }
  }, [session, questions])

  const loadSession = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/interview/session/${sessionId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load interview session')
      }

      const data = await response.json()
      setSession(data.data.session)
      setQuestions(data.data.questions)
      setProgress(data.data.progress)
    } catch (error) {
      console.error('Error loading session:', error)
      setError('Failed to load interview session')
    } finally {
      setIsLoading(false)
    }
  }

  const getNextQuestion = async () => {
    if (!session) return

    try {
      setIsLoading(true)
      setError('')

      const formData = new FormData()
      formData.append('sessionId', sessionId)
      formData.append('jobDescription', session.jobTitle) // Simplified for now
      formData.append('questionIndex', session.currentQuestion.toString())
      formData.append('totalQuestions', session.totalQuestions.toString())

      const response = await fetch('/api/interview/next-question', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to get next question')
      }

      const data = await response.json()
      const newQuestion: InterviewQuestion = {
        id: data.data.questionId,
        questionIndex: data.data.questionIndex,
        questionText: data.data.questionText,
        questionAudioUrl: data.data.questionAudioUrl
      }

      setCurrentQuestion(newQuestion)
      setQuestions(prev => [...prev, newQuestion])

    } catch (error) {
      console.error('Error getting next question:', error)
      setError('Failed to get interview question. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const playQuestionAudio = () => {
    if (!currentQuestion?.questionAudioUrl) return

    if (questionAudioRef.current) {
      questionAudioRef.current.pause()
      questionAudioRef.current = null
    }

    const audio = new Audio(currentQuestion.questionAudioUrl)
    questionAudioRef.current = audio

    audio.onplay = () => setIsPlaying(true)
    audio.onpause = () => setIsPlaying(false)
    audio.onended = () => setIsPlaying(false)

    audio.play().catch(error => {
      console.error('Error playing audio:', error)
      setError('Failed to play question audio')
    })
  }

  const stopQuestionAudio = () => {
    if (questionAudioRef.current) {
      questionAudioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleStopRecording = async () => {
    audioRecording.stopRecording()
    
    // Wait for the recording to be processed
    setTimeout(() => {
      if (audioRecording.state.audioBlob) {
        submitAnswer(audioRecording.state.audioBlob)
        audioRecording.clearRecording()
      }
    }, 100)
  }

  const submitAnswer = async (audioBlob?: Blob) => {
    if (!currentQuestion) return

    try {
      setIsLoading(true)
      
      const formData = new FormData()
      formData.append('questionId', currentQuestion.id)
      
      if (audioBlob) {
        formData.append('userAnswerAudio', audioBlob, 'answer.wav')
      }

      const response = await fetch('/api/interview/submit-answer', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to submit answer')
      }

      const data = await response.json()
      
      if (data.data.isCompleted) {
        // Interview completed
        setSession(prev => prev ? { ...prev, status: 'COMPLETED' } : null)
        onComplete?.()
      } else {
        // Get next question
        setSession(prev => prev ? { 
          ...prev, 
          currentQuestion: data.data.nextQuestionIndex 
        } : null)
        getNextQuestion()
      }

      // Update progress
      await loadSession()

    } catch (error) {
      console.error('Error submitting answer:', error)
      setError('Failed to submit answer. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetInterview = () => {
    if (confirm('Are you sure you want to restart this interview? All progress will be lost.')) {
      router.refresh()
    }
  }

  if (isLoading && !session) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading interview...</span>
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => router.back()}
          className="mt-2 text-red-600 hover:text-red-700 underline"
        >
          Go Back
        </button>
      </div>
    )
  }

  if (session?.status === 'COMPLETED') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-green-800">Interview Completed!</h3>
            <p className="text-green-700">
              You have successfully completed the interview for {session.jobTitle} at {session.company}.
            </p>
            {session.overallScore && (
              <p className="text-green-700 mt-1">
                Overall Score: {Math.round(session.overallScore * 100)}%
              </p>
            )}
          </div>
        </div>
        
        {session.feedback && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-medium text-gray-900 mb-2">Feedback:</h4>
            <p className="text-gray-700">{session.feedback}</p>
          </div>
        )}

        <div className="mt-4 flex space-x-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Back to Dashboard
          </button>
          <button
            onClick={resetInterview}
            className="px-4 py-2 border border-green-600 text-green-600 rounded hover:bg-green-50"
          >
            Retake Interview
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Practice Interview
        </h1>
        <p className="text-gray-600">
          {session?.jobTitle} at {session?.company}
        </p>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {progress.current + 1} of {progress.total}</span>
            <span>{progress.completion}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.completion}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-red-600 hover:text-red-700 underline text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Question Section */}
      {currentQuestion && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Interview Question</h2>
          
          {/* Question Audio */}
          {currentQuestion.questionAudioUrl ? (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 font-medium">Listen to the question</p>
                  <p className="text-blue-600 text-sm">Click play to hear the interviewer</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={isPlaying ? stopQuestionAudio : playQuestionAudio}
                    disabled={isLoading}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <MessageSquare className="w-5 h-5 text-gray-600 mr-2" />
                <p className="text-gray-600 font-medium">Interview Question</p>
              </div>
            </div>
          )}

          {/* Question Text */}
          {currentQuestion.questionText && (
            <div className={`rounded-lg p-6 mb-6 ${currentQuestion.questionAudioUrl ? 'bg-gray-50' : 'bg-blue-50 border-2 border-blue-200'}`}>
              <h3 className={`font-semibold mb-3 ${currentQuestion.questionAudioUrl ? 'text-gray-900' : 'text-blue-900'}`}>
                {currentQuestion.questionAudioUrl ? 'Question Text:' : 'Interview Question:'}
              </h3>
              <p className={`text-lg leading-relaxed ${currentQuestion.questionAudioUrl ? 'text-gray-700' : 'text-blue-800 font-medium'}`}>
                {currentQuestion.questionText}
              </p>
            </div>
          )}

          {/* Recording Section */}
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-orange-800 font-medium">
                  {audioRecording.state.isRecording 
                    ? (audioRecording.state.isPaused ? 'Recording paused...' : 'Recording your answer...') 
                    : 'Record your answer'
                  }
                </p>
                <p className="text-orange-600 text-sm">
                  {audioRecording.state.isRecording 
                    ? 'Click stop when finished' 
                    : 'Click the microphone to start recording'
                  }
                </p>
                
                {audioRecording.state.recordingTime > 0 && (
                  <p className="text-orange-700 text-sm font-mono mt-1">
                    Duration: {(audioRecording.state as any).formattedTime}
                  </p>
                )}
              </div>

              <div className="flex space-x-2">
                {!audioRecording.state.isRecording && !audioRecording.state.audioBlob && (
                  <button
                    onClick={audioRecording.startRecording}
                    disabled={isLoading}
                    className="flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    Start Recording
                  </button>
                )}

                {audioRecording.state.isRecording && !audioRecording.state.isPaused && (
                  <>
                    <button
                      onClick={audioRecording.pauseRecording}
                      disabled={isLoading}
                      className="flex items-center px-4 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </button>
                    <button
                      onClick={handleStopRecording}
                      disabled={isLoading}
                      className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      Stop & Submit
                    </button>
                  </>
                )}

                {audioRecording.state.isRecording && audioRecording.state.isPaused && (
                  <>
                    <button
                      onClick={audioRecording.resumeRecording}
                      disabled={isLoading}
                      className="flex items-center px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </button>
                    <button
                      onClick={handleStopRecording}
                      disabled={isLoading}
                      className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      Stop & Submit
                    </button>
                  </>
                )}

                {audioRecording.state.audioBlob && !audioRecording.state.isRecording && (
                  <>
                    <button
                      onClick={audioRecording.playRecording}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Volume2 className="w-4 h-4 mr-2" />
                      Play
                    </button>
                    <button
                      onClick={audioRecording.clearRecording}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        if (audioRecording.state.audioBlob) {
                          submitAnswer(audioRecording.state.audioBlob)
                          audioRecording.clearRecording()
                        }
                      }}
                      disabled={isLoading}
                      className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Submit Answer
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Recording Status */}
            {audioRecording.state.isRecording && !audioRecording.state.isPaused && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-red-600 text-sm font-medium">Recording in progress...</span>
              </div>
            )}

            {audioRecording.state.isPaused && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-yellow-600 text-sm font-medium">Recording paused</span>
              </div>
            )}

            {audioRecording.state.audioBlob && !audioRecording.state.isRecording && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-600 text-sm font-medium">
                  Recording ready • Duration: {(audioRecording.state as any).formattedTime}
                </span>
              </div>
            )}

            {/* Error Display */}
            {audioRecording.state.error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{audioRecording.state.error}</p>
                <button
                  onClick={() => audioRecording.clearRecording()}
                  className="text-red-600 hover:text-red-700 underline text-sm mt-1"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={resetInterview}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restart Interview
        </button>

        <div className="flex space-x-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Exit Interview
          </button>
          
          {!currentQuestion && session?.currentQuestion === 0 && (
            <button
              onClick={getNextQuestion}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Start Interview'}
            </button>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  )
}