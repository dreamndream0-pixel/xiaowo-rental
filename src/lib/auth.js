// src/lib/auth.js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from './db'

export const authOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    // Email + 密碼登入
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email', type: 'email' },
        password: { label: '密碼',  type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),

    // Google OAuth
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id
        session.user.role = token.role
      }
      return session
    },
  },

  pages: {
    signIn:  '/login',
    signUp:  '/register',
    error:   '/login',
  },

  session: { strategy: 'jwt' },
}

export default NextAuth(authOptions)
