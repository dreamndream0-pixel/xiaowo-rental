// src/app/api/favorites/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      property: {
        include: { images: { where: { isCover: true }, take: 1 }, tags: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(favorites)
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { propertyId } = await request.json()
  await db.favorite.deleteMany({ where: { userId: session.user.id, propertyId } })
  return NextResponse.json({ ok: true })
}
