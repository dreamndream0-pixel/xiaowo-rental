// src/app/api/user/link-line/route.js
// 連結 LINE User ID 到網站帳號
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { lineId } = await request.json()
  if (!lineId || !lineId.startsWith('U')) {
    return NextResponse.json({ error: 'LINE User ID 格式不正確（應以 U 開頭）' }, { status: 400 })
  }

  try {
    // 檢查此 lineId 是否已被其他帳號綁定
    const existing = await db.user.findFirst({ where: { lineId, NOT: { id: session.user.id } } })
    if (existing) return NextResponse.json({ error: '此 LINE 帳號已被其他用戶連結' }, { status: 400 })

    await db.user.update({ where: { id: session.user.id }, data: { lineId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
