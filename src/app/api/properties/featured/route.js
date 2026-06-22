// src/app/api/properties/featured/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit = Math.min(24, parseInt(searchParams.get('limit') || '6'))
  const offset = (page - 1) * limit

  const where = { featured: true, status: { in: ['AVAILABLE', 'COMING_SOON'] }, deletedAt: null }

  try {
    const [properties, total] = await Promise.all([
      db.property.findMany({
        where,
        include: {
          landlord: { select: { id: true, name: true, handle: true, avatar: true, verified: true } },
          owner:    { select: { id: true, name: true, siteName: true, avatar: true } },
          images:   { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1 },
          tags:     true,
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      db.property.count({ where }),
    ])

    return NextResponse.json(
      { properties, total, page, totalPages: Math.ceil(total / limit) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('GET /api/properties/featured error:', e)
    return NextResponse.json({ properties: [], total: 0, page, totalPages: 0 }, { status: 500 })
  }
}
