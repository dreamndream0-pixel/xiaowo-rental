// src/app/api/landlords/[handle]/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request, { params }) {
  const { handle } = params

  try {
    const landlord = await db.user.findFirst({
      where: { handle, role: 'LANDLORD', deletedAt: null },
      select: {
        id: true, name: true, handle: true,
        avatar: true, bio: true, verified: true,
        yearsActive: true, avgRating: true,
        reviewCount: true, totalListings: true,
        lineId: true,
        properties: {
          where: { status: 'AVAILABLE', deletedAt: null },
          include: {
            images:    { where: { isCover: true }, take: 1 },
            amenities: { take: 5 },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!landlord) {
      return NextResponse.json({ error: '找不到此房東' }, { status: 404 })
    }

    return NextResponse.json(landlord)
  } catch (error) {
    return NextResponse.json({ error: '載入失敗' }, { status: 500 })
  }
}
