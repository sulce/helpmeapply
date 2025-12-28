'use client'

import { useState, useRef, useCallback } from 'react'

interface AudioRecordingState {
  isRecording: boolean
  isPaused: boolean
  recordingTime: number
  audioBlob: Blob | null
  error: string | null
}

interface UseAudioRecordingReturn {
  state: AudioRecordingState
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  clearRecording: () => void
  playRecording: () => void
  stopPlayback: () => void
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    audioBlob: null,
    error: null
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Start timer for recording duration
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }))
    }, 1000)
  }, [])

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }))

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      })
      
      streamRef.current = stream
      audioChunksRef.current = []

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })
      
      mediaRecorderRef.current = mediaRecorder

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Handle stop event
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        })
        
        setState(prev => ({ 
          ...prev, 
          audioBlob,
          isRecording: false,
          isPaused: false
        }))

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        stopTimer()
      }

      // Handle errors
      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error)
        setState(prev => ({ 
          ...prev, 
          error: 'Recording failed. Please try again.',
          isRecording: false,
          isPaused: false
        }))
        stopTimer()
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isPaused: false,
        recordingTime: 0,
        audioBlob: null
      }))

      startTimer()

    } catch (error: any) {
      console.error('Error starting recording:', error)
      let errorMessage = 'Failed to start recording.'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.'
      }

      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isRecording: false,
        isPaused: false
      }))
    }
  }, [startTimer, stopTimer])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
    }
  }, [state.isRecording])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause()
      setState(prev => ({ ...prev, isPaused: true }))
      stopTimer()
    }
  }, [state.isRecording, state.isPaused, stopTimer])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume()
      setState(prev => ({ ...prev, isPaused: false }))
      startTimer()
    }
  }, [state.isRecording, state.isPaused, startTimer])

  // Clear recording
  const clearRecording = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      audioBlob: null,
      recordingTime: 0,
      error: null
    }))
    audioChunksRef.current = []

    // Stop any ongoing playback
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }
  }, [])

  // Play recording
  const playRecording = useCallback(() => {
    if (state.audioBlob) {
      // Stop any existing playback
      if (audioElementRef.current) {
        audioElementRef.current.pause()
      }

      const audio = new Audio(URL.createObjectURL(state.audioBlob))
      audioElementRef.current = audio

      audio.play().catch(error => {
        console.error('Error playing recording:', error)
        setState(prev => ({ ...prev, error: 'Failed to play recording' }))
      })
    }
  }, [state.audioBlob])

  // Stop playback
  const stopPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
    }
  }, [])

  return {
    state: {
      ...state,
      // Add formatted time for convenience
      formattedTime: formatTime(state.recordingTime)
    } as AudioRecordingState & { formattedTime: string },
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    playRecording,
    stopPlayback
  }
}