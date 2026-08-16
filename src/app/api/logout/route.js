// src/app/api/logout/route.js
// 統一登出：清除前站 NextAuth session cookie，讓 linebot 後台/會員中心登出時前站也同步登出。
// 支援 ?next= 導回指定網址（僅限白名單網域，避免開放轉址）。
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_ORIGINS = [
  'https://linebot-rental.onrender.com',
  'https://xiaowo-rental.vercel.app',
]

export async function GET(request) {
  const url = new URL(request.url)
  let dest = new URL('/', url.origin)
  const next = url.searchParams.get('next')
  if (next) {
    try {
      const n = new URL(next)
      if (ALLOWED_ORIGINS.includes(n.origin) || n.origin === url.origin) dest = n
    } catch (_) { /* 忽略非法 next */ }
  }

  const res = NextResponse.redirect(dest)
  // NextAuth v4 cookie（含 __Secure- 前綴與可能的分段 .0/.1）
  const bases = ['next-auth.session-token', 'next-auth.callback-url']
  bases.forEach(base => {
    ;['', '.0', '.1', '.2'].forEach(suffix => {
      res.cookies.set(`${base}${suffix}`, '', { path: '/', maxAge: 0 })
      res.cookies.set(`__Secure-${base}${suffix}`, '', { path: '/', maxAge: 0, secure: true })
    })
  })
  return res
}
