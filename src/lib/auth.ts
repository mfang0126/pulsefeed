import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        inviteCode: { label: 'Invite Code', type: 'text' },
        email: { label: 'Email', type: 'email' },
        displayName: { label: 'Display Name', type: 'text' },
        mode: { label: 'Mode', type: 'text' }, // 'login' or 'register'
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Username and password required')
        }

        const { username, password, mode, inviteCode, email, displayName } = credentials

        if (mode === 'register') {
          // Registration
          if (!inviteCode || inviteCode !== process.env.INVITE_CODE) {
            throw new Error('Invalid invite code')
          }

          const existing = await prisma.user.findFirst({
            where: { OR: [{ username }, { email: email || '' }] },
          })
          if (existing) {
            throw new Error('Username or email already exists')
          }

          const passwordHash = await bcrypt.hash(password, 12)
          const user = await prisma.user.create({
            data: {
              username,
              email: email || `${username}@pulsefeed.local`,
              passwordHash,
              displayName: displayName || username,
              role: 'reader',
              inviteCode,
            },
          })

          return {
            id: user.id,
            name: user.username,
            email: user.email,
            role: user.role,
          }
        } else {
          // Login
          const user = await prisma.user.findUnique({
            where: { username },
          })
          if (!user) {
            throw new Error('Invalid credentials')
          }

          const isValid = await bcrypt.compare(password, user.passwordHash)
          if (!isValid) {
            throw new Error('Invalid credentials')
          }

          return {
            id: user.id,
            name: user.username,
            email: user.email,
            role: user.role,
          }
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
        (session.user as any).id = token.userId
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
}

declare module 'next-auth' {
  interface User {
    role?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    userId?: string
  }
}
