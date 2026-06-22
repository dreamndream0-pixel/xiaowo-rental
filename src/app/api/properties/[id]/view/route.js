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
    await db.property.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
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
