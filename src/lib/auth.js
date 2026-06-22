// src/lib/auth.js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import LineProvider from 'next-auth/providers/line'
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

        // 支援 email 或手機號碼登入
        const isPhone = /^[0-9\+\-\s]{8,15}$/.test(credentials.email.trim())
        const cleanId = credentials.email.replace(/[\s\-]/g, '')
        const user = await db.user.findFirst({
          where: isPhone
            ? { phone: cleanId }
            : { email: credentials.email },
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
      // 同 email 若已用密碼註冊，允許自動連結（Google email 已驗證，安全）
      allowDangerousEmailAccountLinking: true,
      // 自訂 profile：User 表沒有 image 欄位（只有 avatar），
      // 預設 profile 會回傳 image → Prisma createUser 會因未知欄位而失敗，導致登入/註冊整個掛掉
      profile(profile) {
        return {
          id:     profile.sub,
          name:   profile.name,
          email:  profile.email,
          avatar: profile.picture,
          role:   'TENANT',
        }
      },
    }),

    // LINE OAuth
    LineProvider({
      clientId:     process.env.LINE_CLIENT_ID     || '',
      clientSecret: process.env.LINE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
      // LINE 預設 scope（openid profile）不回傳 email，而 User.email 為必填唯一鍵；
      // 用 line_<sub>@line.local 補一個唯一 email，並避免回傳 image 欄位
      profile(profile) {
        return {
          id:     profile.sub,
          name:   profile.name || 'LINE 用戶',
          email:  profile.email || `line_${profile.sub}@line.local`,
          avatar: profile.picture || null,
          lineId: profile.sub,
          role:   'TENANT',
        }
      },
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
