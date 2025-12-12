import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, password: true }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'No account found with that email address.'
      }, { status: 404 })
    }

    // Check if user has a password (not OAuth-only account)
    if (!user.password) {
      return NextResponse.json({ 
        success: false, 
        error: 'This account was created using social login (Google/LinkedIn). Please sign in using your social account instead.'
      }, { status: 400 })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Clean up any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: email.toLowerCase() }
    })

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        email: email.toLowerCase(),
        token: resetToken,
        expires
      }
    })

    // Send email (using console.log for now - you can integrate with your email service)
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`
    
    console.log('Password reset email would be sent to:', email)
    console.log('Reset URL:', resetUrl)
    console.log('Reset token expires at:', expires)

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // Example:
    // await sendPasswordResetEmail({
    //   to: email,
    //   resetUrl: resetUrl,
    //   userName: user.name || 'User'
    // })

    return NextResponse.json({ 
      success: true, 
      message: 'Password reset link sent to your email. Check your inbox and click the link to reset your password.'
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}