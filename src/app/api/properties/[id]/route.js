// src/app/api/properties/[id]/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request, { params }) {
  const { id } = params

  try {
    const property = await db.property.findFirst({
      where: { id, deletedAt: null },
      include: {
        landlord: {
          select: {
            id: true, name: true, handle: true,
            avatar: true, verified: true,
            avgRating: true, reviewCount: true,
            yearsActive: true, bio: true, lineId: true,
          },
        },
        images:    { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        amenities: true,
      },
    })

    if (!property) {
      return NextResponse.json({ error: '找不到此房源' }, { status: 404 })
    }

    // Increment view count (fire-and-forget)
    db.property.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

    return NextResponse.json(property)
  } catch (error) {
    return NextResponse.json({ error: '載入失敗' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  const { id } = params
  // TODO: verify ownership + update
  const body = await request.json()
  const property = await db.property.update({
    where: { id },
    data: body,
  })
  return NextResponse.json(property)
}

export async function DELETE(request, { params }) {
  const { id } = params
  // Soft delete
  await db.property.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'PAUSED' },
  })
  return NextResponse.json({ success: true })
}
