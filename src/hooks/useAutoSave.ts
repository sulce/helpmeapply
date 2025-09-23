'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export interface AutoSaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error'
  lastSaved?: Date
  error?: string
}

interface UseAutoSaveOptions {
  delay?: number // Debounce delay in ms
  localStorageKey?: string
  onSave?: (data: any) => Promise<void>
  onError?: (error: Error) => void
}

export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions = {}
) {
  const {
    delay = 2000, // 2 seconds default
    localStorageKey,
    onSave,
    onError
  } = options

  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>({ status: 'idle' })
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const previousDataRef = useRef<T | undefined>(undefined)
  const mountedRef = useRef(true)

  // Save to localStorage immediately
  const saveToLocalStorage = useCallback((dataToSave: T) => {
    if (localStorageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(dataToSave))
      } catch (error) {
        console.warn('Failed to save to localStorage:', error)
      }
    }
  }, [localStorageKey])

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): T | null => {
    if (localStorageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(localStorageKey)
        return saved ? JSON.parse(saved) : null
      } catch (error) {
        console.warn('Failed to load from localStorage:', error)
        return null
      }
    }
    return null
  }, [localStorageKey])

  // Clear localStorage
  const clearLocalStorage = useCallback(() => {
    if (localStorageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(localStorageKey)
      } catch (error) {
        console.warn('Failed to clear localStorage:', error)
      }
    }
  }, [localStorageKey])

  // Debounced save function
  const debouncedSave = useCallback(async (dataToSave: T) => {
    if (!mountedRef.current) return

    setSaveStatus({ status: 'saving' })
    
    try {
      // Save to localStorage immediately
      saveToLocalStorage(dataToSave)
      
      // Save to server if callback provided
      if (onSave) {
        await onSave(dataToSave)
      }
      
      if (mountedRef.current) {
        setSaveStatus({ 
          status: 'saved', 
          lastSaved: new Date() 
        })
        
        // Clear saved status after 3 seconds
        setTimeout(() => {
          if (mountedRef.current) {
            setSaveStatus(prev => ({ ...prev, status: 'idle' }))
          }
        }, 3000)
      }
    } catch (error) {
      if (mountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Save failed'
        setSaveStatus({ 
          status: 'error', 
          error: errorMessage 
        })
        onError?.(error instanceof Error ? error : new Error(errorMessage))
      }
    }
  }, [onSave, onError, saveToLocalStorage])

  // Auto-save effect
  useEffect(() => {
    // Skip if data hasn't changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return
    }

    previousDataRef.current = data

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      debouncedSave(data)
    }, delay)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delay, debouncedSave])

  // Manual save function
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    debouncedSave(data)
  }, [data, debouncedSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    saveStatus,
    saveNow,
    loadFromLocalStorage,
    clearLocalStorage
  }
}