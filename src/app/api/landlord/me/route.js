// src/app/api/landlord/me/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'

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

  const realEmail = user.email?.endsWith('@xiaowo.local') ? null : user.email

  // Must have a real email to sync to Landlord table
  if (!realEmail) {
    return NextResponse.json({ ok: true, isLinkedLandlord: false, syncError: 'no_email' })
  }

  // ── Step 1: create / update Landlord record ──────────────────────
  const siteName = body.siteName?.trim() || null
  let landlord = null
  let syncError = null
  try {
    const existing = await db.landlord.findUnique({ where: { email: realEmail } })
    if (existing) {
      landlord = await db.landlord.update({
        where: { email: realEmail },
        data: {
          name:     user.name || existing.name,
          phone:    user.phone || existing.phone || null,
          siteName: siteName ?? existing.siteName,
        },
      })
    } else {
      // 不在此產生 adminKey：明文金鑰寫入 DB 卻從未顯示給任何人看過，純粹是平白
      // 多一份外洩風險。改由總管理員之後在後台用「重新產生金鑰」發給房東（會雜湊儲存）。
      const passwordHash = crypto.createHash('sha256')
        .update(crypto.randomBytes(6).toString('base64url')).digest('hex')
      landlord = await db.landlord.create({
        data: {
          name:     user.name || realEmail,
          email:    realEmail,
          phone:    user.phone || null,
          siteName: siteName,
          passwordHash,
        },
      })
    }
  } catch (e) {
    console.error('sync landlord failed:', e.message, e.code)
    syncError = e.message
  }

  // ── Step 2: link properties (non-blocking, won't fail the response) ──
  if (landlord) {
    db.property.updateMany({
      where: { landlordId: session.user.id, ownerId: null },
      data: { ownerId: landlord.id },
    }).catch(e => console.error('link properties failed:', e.message))
  }

  return NextResponse.json({ ok: true, isLinkedLandlord: !!landlord, syncError })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
  })

  if (!user) return NextResponse.json(null)

  const realEmail = user.email?.endsWith('@xiaowo.local') ? null : user.email

  // Check if this user is already in the linebot landlord management table
  let isLinkedLandlord = false
  if (realEmail) {
    try {
      const landlordRow = await db.landlord.findUnique({
        where: { email: realEmail },
        select: { id: true },
      })
      isLinkedLandlord = !!landlordRow
    } catch (e) {
      console.error('landlord check failed:', e.message)
    }
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: realEmail,
    phone: user.phone,
    avatar: user.avatar,
    isSuper: false, // future: user.role === 'SUPER_LANDLORD'
    isLinkedLandlord,
  })
}
