// src/app/api/register/route.js
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { name, email, phone, password, method } = await request.json()

    if (!name || !password) return NextResponse.json({ error: '請填寫姓名和密碼' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: '密碼至少 6 個字' }, { status: 400 })

    const passwordHash = await bcrypt.hash(password, 10)

    if (method === 'phone') {
      if (!phone) return NextResponse.json({ error: '請填寫手機號碼' }, { status: 400 })
      const cleanPhone = phone.replace(/[\s\-]/g, '')
      const existing = await db.user.findFirst({ where: { phone: cleanPhone } })
      if (existing) return NextResponse.json({ error: '此手機號碼已註冊' }, { status: 400 })

      // 手機註冊需要一個唯一 email（用手機號碼假組）
      const fakeEmail = `phone_${cleanPhone}@xiaowo.local`
      await db.user.create({ data: { name, email: fakeEmail, phone: cleanPhone, passwordHash, role: 'TENANT' } })
    } else {
      if (!email) return NextResponse.json({ error: '請填寫 Email' }, { status: 400 })
      const existing = await db.user.findUnique({ where: { email } })
      if (existing) return NextResponse.json({ error: '此 Email 已註冊' }, { status: 400 })
      await db.user.create({ data: { name, email, passwordHash, role: 'TENANT' } })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('註冊失敗:', e)
    return NextResponse.json({ error: '註冊失敗，請稍後再試' }, { status: 500 })
  }
}
