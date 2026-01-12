import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { registerSchema } from '@/lib/validations'
import { createStripeCustomer } from '@/lib/billing'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // Initialize free trial plan
        subscriptionPlan: 'free_trial',
        autoApplicationsUsed: 0,
        autoApplicationsLimit: 5, // Free trial limit
        mockInterviewsUsed: 0,
        mockInterviewsLimit: 1, // Free trial limit
        hasInterviewAddon: false,
        trialEndsAt: trialEndsAt,
        subscriptionPeriodStart: now,
        trialExtensions: 0,
      }
    })

    // Create Stripe customer on signup to establish billing relationship
    try {
      const stripeCustomerId = await createStripeCustomer(user.id, email, name)
      console.log(`Created Stripe customer ${stripeCustomerId} for user ${user.id}`)
    } catch (stripeError) {
      // Log error but don't fail registration - customer can be created later
      console.error('Failed to create Stripe customer during registration:', stripeError)
    }

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}