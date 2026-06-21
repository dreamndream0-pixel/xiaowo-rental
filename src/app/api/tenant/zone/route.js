// src/app/api/tenant/zone/route.js
// 租客專區資料：用電話號碼比對租客記錄（不依賴 LINE）
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, name: true, email: true },
    })

    if (!user?.phone) {
      return NextResponse.json({ status: 'no_phone', user })
    }

    // 用電話號碼比對 Tenant 記錄（房東後台建立的，或 LINE Bot 用戶填過電話）
    const tenants = await db.tenant.findMany({
      where: { phone: user.phone, isActive: true },
      include: {
        property: {
          include: {
            images: { where: { isCover: true }, take: 1 },
            owner: { select: { name: true, phone: true, lineOfficialId: true } },
          },
        },
        landlord: { select: { name: true, phone: true, lineOfficialId: true } },
        repairs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!tenants.length) {
      return NextResponse.json({ status: 'not_found', user })
    }

    const active = tenants.find(t => t.propertyId) || tenants[0]
    return NextResponse.json({ status: 'found', user, tenant: active, allTenants: tenants })
  } catch (e) {
    console.error('tenant zone error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// 更新電話號碼
export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { phone } = await request.json()
  if (!phone) return NextResponse.json({ error: '請填寫電話' }, { status: 400 })

  // 標準化電話（移除空格/符號）
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')

  try {
    await db.user.update({ where: { id: session.user.id }, data: { phone: cleanPhone } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ error: '此電話已被其他帳號使用' }, { status: 400 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
