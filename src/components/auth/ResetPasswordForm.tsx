'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { CheckCircle, AlertCircle } from 'lucide-react'

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    validateToken()
  }, [token])

  const validateToken = async () => {
    if (!token) {
      setTokenError('No reset token provided. Please request a new password reset.')
      setIsValidating(false)
      return
    }

    try {
      const response = await fetch(`/api/auth/reset-password?token=${token}`)
      const result = await response.json()

      if (response.ok && result.valid) {
        setUserEmail(result.email)
        setIsValidating(false)
      } else {
        setTokenError(result.error || 'Invalid or expired reset token')
        setIsValidating(false)
      }
    } catch (error) {
      setTokenError('Something went wrong validating the reset token')
      setIsValidating(false)
    }
  }

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword
        })
      })

      const result = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?message=Password reset successfully. Please sign in with your new password.')
        }, 3000)
      } else {
        setError(result.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-3xl font-bold text-gray-900">Validating Reset Link</h1>
          <p className="mt-2 text-gray-600">Please wait while we validate your reset token...</p>
        </div>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Invalid Reset Link</h1>
          <p className="mt-2 text-gray-600">{tokenError}</p>
        </div>

        <div className="space-y-3">
          <Link href="/forgot-password">
            <Button className="w-full">
              Request New Reset Link
            </Button>
          </Link>
          
          <div className="text-center">
            <Link 
              href="/login" 
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Password Reset Successfully</h1>
          <p className="mt-2 text-gray-600">
            Your password has been reset. You will be redirected to the sign-in page in a few seconds.
          </p>
        </div>

        <div className="text-center">
          <Link href="/login">
            <Button className="w-full">
              Continue to Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Reset Your Password</h1>
        <p className="mt-2 text-gray-600">
          Enter a new password for <strong>{userEmail}</strong>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="Enter your new password"
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500">
            Password must be at least 8 characters long
          </p>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            placeholder="Confirm your new password"
          />
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full">
          Reset Password
        </Button>
      </form>

      <div className="text-center">
        <Link 
          href="/login" 
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-3xl font-bold text-gray-900">Loading...</h1>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}