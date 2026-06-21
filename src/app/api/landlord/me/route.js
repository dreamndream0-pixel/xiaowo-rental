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

  // Sync directly to shared Landlord table (same Supabase DB)
  let syncError = null
  if (realEmail) {
    try {
      const existing = await db.landlord.findUnique({ where: { email: realEmail } })
      let landlord
      if (existing) {
        landlord = await db.landlord.update({
          where: { email: realEmail },
          data: {
            name: user.name || existing.name,
            phone: user.phone || existing.phone || null,
          },
        })
      } else {
        const adminKey = 'LL-' + crypto.randomBytes(9).toString('base64url')
        const passwordHash = crypto.createHash('sha256')
          .update(crypto.randomBytes(6).toString('base64url')).digest('hex')
        landlord = await db.landlord.create({
          data: {
            name: user.name || realEmail,
            email: realEmail,
            phone: user.phone || null,
            adminKey,
            passwordHash,
          },
        })
      }
      // Link user's properties to this landlord record
      await db.property.updateMany({
        where: { landlordId: session.user.id, ownerId: null },
        data: { ownerId: landlord.id },
      })
    } catch (e) {
      console.error('sync landlord failed:', e.message, e.code)
      syncError = e.message
    }
  } else {
    syncError = 'no_email' // phone-only user needs to add email first
  }

  return NextResponse.json({ ok: true, syncError })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, image: true, role: true },
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
    avatar: user.image,
    isSuper: false, // future: user.role === 'SUPER_LANDLORD'
    isLinkedLandlord,
  })
}
