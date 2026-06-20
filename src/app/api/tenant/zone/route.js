// src/app/api/tenant/zone/route.js
// 租客專區資料：連動 LINE Bot 租客資料
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    // 找用戶的 lineId
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { lineId: true, name: true, email: true, phone: true },
    })

    if (!user?.lineId) {
      return NextResponse.json({ linked: false, user })
    }

    // 用 lineId 找 LINE Bot 租客記錄（多個 source 取最新有 propertyId 的那筆）
    const tenants = await db.tenant.findMany({
      where: { lineUserId: user.lineId },
      include: {
        property: {
          include: {
            images: { where: { isCover: true }, take: 1 },
            owner: { select: { name: true, phone: true, lineOfficialId: true } },
          },
        },
        landlord: { select: { name: true, phone: true, lineOfficialId: true, notifyLineUserId: true } },
        repairs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const activeTenant = tenants.find(t => t.propertyId && t.isActive) || tenants[0] || null

    return NextResponse.json({
      linked: true,
      user,
      tenant: activeTenant,
      allTenants: tenants,
    })
  } catch (e) {
    console.error('tenant zone error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
