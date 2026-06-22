import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const VIEW_WINDOW_SECONDS = 60 * 60 * 6

export async function POST(request, { params }) {
  const id = params.id
  const cookieName = `pv_${id}`

  if (request.cookies.get(cookieName)?.value === '1') {
    return NextResponse.json({ counted: false, reason: 'recent-view' })
  }

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS property_view_stats (
        "propertyId" TEXT NOT NULL,
        "date" DATE NOT NULL,
        "count" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY ("propertyId", "date")
      )
    `)

    await db.$transaction(async tx => {
      await tx.property.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      })
      await tx.$executeRawUnsafe(
        `INSERT INTO property_view_stats ("propertyId", "date", "count", "createdAt", "updatedAt")
         VALUES ($1, (now() AT TIME ZONE 'Asia/Taipei')::date, 1, now(), now())
         ON CONFLICT ("propertyId", "date")
         DO UPDATE SET "count" = property_view_stats."count" + 1, "updatedAt" = now()`,
        id
      )
    })

    const res = NextResponse.json({ counted: true })
    res.cookies.set(cookieName, '1', {
      maxAge: VIEW_WINDOW_SECONDS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
    return res
  } catch (_) {
    return NextResponse.json({ counted: false }, { status: 404 })
  }
}
