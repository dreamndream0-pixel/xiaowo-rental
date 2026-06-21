// src/app/api/landlord/me/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()

  // Build update data
  const updateData = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.phone !== undefined) updateData.phone = body.phone
  // Allow overwriting fake @xiaowo.local email with a real one
  if (body.email && body.email.includes('@') && !body.email.endsWith('@xiaowo.local')) {
    // Check uniqueness first
    const existing = await db.user.findUnique({ where: { email: body.email } })
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: '此 Email 已被其他帳號使用' }, { status: 400 })
    }
    updateData.email = body.email.trim().toLowerCase()
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true, phone: true },
  })

  // Determine email to send to linebot (skip @xiaowo.local phantom emails)
  const userEmail = user.email?.endsWith('@xiaowo.local') ? null : user.email

  // Sync to linebot-rental
  const LINEBOT_URL = process.env.LINEBOT_URL
  const INTERNAL_SECRET = process.env.INTERNAL_SECRET
  if (LINEBOT_URL && INTERNAL_SECRET && userEmail) {
    await fetch(`${LINEBOT_URL}/api/internal/create-landlord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: INTERNAL_SECRET,
        name: user.name,
        email: userEmail,
        phone: user.phone,
        userId: session.user.id,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, image: true, role: true },
  })

  if (!user) return NextResponse.json(null)

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email?.endsWith('@xiaowo.local') ? null : user.email,
    phone: user.phone,
    avatar: user.image,
    isSuper: false, // future: user.role === 'SUPER_LANDLORD'
  })
}
