import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import LinkedInProvider from 'next-auth/providers/linkedin'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

// Custom Indeed OAuth provider
const IndeedProvider = {
  id: 'indeed',
  name: 'Indeed',
  type: 'oauth' as const,
  version: '2.0',
  authorization: {
    url: 'https://secure.indeed.com/oauth/v2/authorize',
    params: {
      scope: 'employer_access email',
      response_type: 'code',
    },
  },
  token: 'https://apis.indeed.com/oauth/v2/tokens',
  userinfo: 'https://secure.indeed.com/v2/api/userinfo',
  clientId: process.env.INDEED_CLIENT_ID,
  clientSecret: process.env.INDEED_CLIENT_SECRET,
  profile(profile: any) {
    return {
      id: profile.sub || profile.id,
      name: profile.name || `${profile.given_name} ${profile.family_name}`.trim(),
      email: profile.email,
      image: profile.picture,
    }
  },
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'r_liteprofile r_emailaddress',
        },
      },
    }),
    IndeedProvider,
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Auto-import profile data after OAuth signup
      if (account && (account.provider === 'linkedin' || account.provider === 'indeed')) {
        // We'll handle the import in a separate API call after user creation
        // to avoid blocking the login process
        console.log(`${account.provider} OAuth login detected for user:`, user.email)
      }
      return true
    },
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.image = token.picture as string
      }

      return session
    },
    async jwt({ token, user }) {
      const dbUser = await prisma.user.findFirst({
        where: {
          email: token.email!,
        },
      })

      if (!dbUser) {
        if (user) {
          token.id = user.id
        }
        return token
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      }
    },
  },
}