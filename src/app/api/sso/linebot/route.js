// src/app/api/sso/linebot/route.js
// SSO 橋接：已登入的會員 → 簽發一次性票券 → 導向 linebot-rental 會員中心。
// 需設定環境變數：SSO_SHARED_SECRET（與 linebot 後台相同）、LINEBOT_URL（linebot 後台網址）。
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const FRONT_URL = process.env.NEXTAUTH_URL || 'https://xiaowo-rental.vercel.app'
const LINEBOT_URL = (process.env.LINEBOT_URL || 'https://linebot-rental.onrender.com').replace(/\/$/, '')

export async function GET(request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode') || ''
  const tab = url.searchParams.get('tab') || ''
  const extra = new URLSearchParams()
  if (mode === 'landlord') extra.set('mode', 'landlord')
  if (['favorites', 'history', 'support', 'home'].includes(tab)) extra.set('tab', tab)
  const extraQs = extra.toString()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    // 未登入 → 導去登入，登入後再回到本端點（連同 mode/tab）完成 SSO
    const back = '/api/sso/linebot' + (extraQs ? `?${extraQs}` : '')
    return NextResponse.redirect(`${FRONT_URL}/login?callbackUrl=${encodeURIComponent(back)}`)
  }
  const secret = process.env.SSO_SHARED_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SSO_SHARED_SECRET 未設定' }, { status: 500 })
  }
  // 票券只帶 uid（有效 5 分鐘），linebot 端一律以資料庫為準取得會員資料
  const payload = Buffer.from(JSON.stringify({
    uid: session.user.id,
    exp: Date.now() + 5 * 60 * 1000,
  })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  const token = `${payload}.${sig}`
  const q = `token=${encodeURIComponent(token)}` + (extraQs ? `&${extraQs}` : '')
  return NextResponse.redirect(`${LINEBOT_URL}/member/sso?${q}`)
}
