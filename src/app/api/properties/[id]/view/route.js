import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const VIEW_WINDOW_SECONDS = 60 * 60 * 6

export async function POST(request, { params }) {
  const id = params.id

  // 記錄「會員個人瀏覽記錄」（每次瀏覽都更新時間，與下方全站計數的節流分開）
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      await db.propertyView.upsert({
        where: { userId_propertyId: { userId: session.user.id, propertyId: id } },
        update: { viewedAt: new Date() },
        create: { userId: session.user.id, propertyId: id },
      })
    }
  } catch (_) { /* 表可能尚未建立或未登入，忽略不影響瀏覽計數 */ }

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
