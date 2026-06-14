// src/app/api/revalidate/route.js
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { secret, paths } = await request.json()

    if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const targets = Array.isArray(paths) ? paths : [paths].filter(Boolean)
    for (const p of targets) {
      revalidatePath(p)
    }

    return NextResponse.json({ ok: true, revalidated: targets })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
