// src/app/api/user/properties/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const properties = await db.property.findMany({
    where: { landlordId: session.user.id, deletedAt: null },
    include: {
      images: { where: { isCover: true }, take: 1 },
      _count: { select: { favorites: true, bookings: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(properties)
}
