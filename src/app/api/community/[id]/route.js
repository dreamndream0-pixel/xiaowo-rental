// src/app/api/community/[id]/route.js
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const rows = await db.$queryRawUnsafe(
      `SELECT * FROM communities WHERE id = $1`, id
    )
    if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const c = rows[0]

    // 解析照片陣列
    let photos = []
    try { photos = JSON.parse(c.photos || '[]') } catch {}

    // 此社區可租房源
    const props = await db.$queryRawUnsafe(
      `SELECT id, title, price, "ownerId" FROM properties
       WHERE "communityId" = $1 AND status = 'AVAILABLE' AND "deletedAt" IS NULL
       ORDER BY price ASC LIMIT 10`,
      id
    )

    return NextResponse.json({
      id: c.id,
      name: c.name,
      description: c.description || '',
      photos,
      mapUrl: c.mapUrl || '',
      properties: props,
    })
  } catch (e) {
    console.error('community API error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
