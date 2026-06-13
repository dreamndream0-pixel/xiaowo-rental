// src/app/api/register/route.js
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密碼至少 6 個字' }, { status: 400 })
    }

    // 檢查 email 是否已註冊
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: '此 Email 已註冊' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'TENANT',
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('註冊失敗:', e)
    return NextResponse.json({ error: '註冊失敗，請稍後再試' }, { status: 500 })
  }
}
