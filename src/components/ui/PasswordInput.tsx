'use client'

import { useState, InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string
  showToggle?: boolean
  showStrengthIndicator?: boolean
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, showToggle = true, showStrengthIndicator = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    return (
      <div className="w-full">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className={cn(
              'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus-visible:ring-red-500',
              showToggle && 'pr-10', // Add padding for the toggle button
              className
            )}
            ref={ref}
            {...props}
          />
          
          {showToggle && (
            <button
              type="button"
              className={cn(
                'absolute inset-y-0 right-0 flex items-center pr-3',
                'text-gray-400 hover:text-gray-600 transition-colors duration-200',
                'focus:outline-none focus:text-gray-600',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
              onClick={togglePasswordVisibility}
              disabled={props.disabled}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1} // Prevents tab focus, but still clickable
            >
              {showPassword ? (
                <EyeOff 
                  className="h-4 w-4" 
                  aria-hidden="true"
                />
              ) : (
                <Eye 
                  className="h-4 w-4" 
                  aria-hidden="true"
                />
              )}
            </button>
          )}
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        
        {/* Password strength indicator (optional) */}
        {showStrengthIndicator && props.value && typeof props.value === 'string' && props.value.length > 0 && (
          <div className="mt-1 flex space-x-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-300',
                  getPasswordStrengthColor(props.value as string, level)
                )}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)

// Helper function to determine password strength color
function getPasswordStrengthColor(password: string, level: number): string {
  const strength = getPasswordStrength(password)
  
  if (level <= strength) {
    if (strength >= 4) return 'bg-green-500' // Strong
    if (strength >= 3) return 'bg-yellow-500' // Medium
    if (strength >= 2) return 'bg-orange-500' // Weak
    return 'bg-red-500' // Very weak
  }
  
  return 'bg-gray-200'
}

// Helper function to calculate password strength
function getPasswordStrength(password: string): number {
  let strength = 0
  
  if (password.length >= 8) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password)) strength++
  
  return Math.min(strength, 4)
}

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }