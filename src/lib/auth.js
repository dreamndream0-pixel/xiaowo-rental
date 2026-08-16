// src/lib/auth.js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import LineProvider from 'next-auth/providers/line'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from './db'

const baseAdapter = PrismaAdapter(db)

function normalizeUserData(data = {}) {
  const { image, ...rest } = data
  const email = rest.email || (rest.id ? `oauth_${rest.id}@oauth.local` : undefined)
  return {
    ...rest,
    ...(email ? { email } : {}),
    name: rest.name || email || '小蝸用戶',
    role: rest.role || 'TENANT',
    ...(image && !rest.avatar ? { avatar: image } : {}),
  }
}

// 正式環境（HTTPS）用 Secure cookie；LINE 行動裝置登入會經由 LINE App 跨站導回，
// 預設 SameSite=Lax 的 state/pkce/nonce cookie 不會被帶回 → 「State cookie was missing」。
// 將這三個 OAuth 交握用的短期 cookie 設為 SameSite=None; Secure 以修正 LINE 登入。
const useSecureCookies = process.env.NODE_ENV === 'production'
const cookiePrefix = useSecureCookies ? '__Secure-' : ''
const oauthFlowCookie = {
  httpOnly: true,
  sameSite: useSecureCookies ? 'none' : 'lax',
  path: '/',
  secure: useSecureCookies,
}

export const authOptions = {
  cookies: {
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: oauthFlowCookie,
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code_verifier`,
      options: oauthFlowCookie,
    },
    nonce: {
      name: `${cookiePrefix}next-auth.nonce`,
      options: oauthFlowCookie,
    },
  },
  adapter: {
    ...baseAdapter,
    createUser: data => db.user.create({ data: normalizeUserData(data) }),
    updateUser: ({ id, ...data }) => db.user.update({ where: { id }, data: normalizeUserData(data) }),
  },
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
          name:   profile.name || profile.email || 'Google 用戶',
          email:  profile.email || `google_${profile.sub}@oauth.local`,
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
      // 保留 LINE App 跳轉登入（app-to-app）。iOS Safari 的防追蹤機制會在 LINE App
      // 導回時丟掉 OAuth 的 state cookie（即使 SameSite=None）→「State cookie was missing」。
      // 為了讓 App 跳轉在 iPhone 上可靠，LINE 這個 provider 不依賴 state/pkce/nonce cookie
      // （checks: none）。代價是少了登入 CSRF 防護；LINE 為機密用戶端且走 HTTPS，風險有限。
      checks: ['none'],
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
        token.role = user.role || 'TENANT'
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id   = token.id
        session.user.role = token.role || 'TENANT'
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

  logger: {
    error(code, metadata) {
      console.error('[next-auth]', code, metadata)
    },
    warn(code) {
      console.warn('[next-auth]', code)
    },
  },
}

export default NextAuth(authOptions)
