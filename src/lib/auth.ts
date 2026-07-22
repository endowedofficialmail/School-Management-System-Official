import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Production hardening note: add per-IP/email failed-attempt rate limiting
        // before this credential check if this app is exposed publicly.
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.isActive) {
          throw new Error('No active account found with this email')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Incorrect password')
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.id = user.id ?? ''
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false
      }

      // Keep mustChangePassword in sync for portal users (and after session.update)
      if (token.id && (token.role === 'STUDENT' || token.role === 'PARENT' || trigger === 'update')) {
        const dbUser = await prisma.user.findUnique({
          where: { id: Number(token.id) },
          select: { mustChangePassword: true },
        })
        token.mustChangePassword = dbUser?.mustChangePassword ?? false
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role
        session.user.id = token.id
        session.user.mustChangePassword = Boolean(token.mustChangePassword)
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
