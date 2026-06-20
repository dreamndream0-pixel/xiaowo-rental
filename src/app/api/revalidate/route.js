// src/app/api/revalidate/route.js
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { secret, paths, tags } = await request.json()

    if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const revalidatedPaths = []
    const revalidatedTags  = []

    for (const p of (Array.isArray(paths) ? paths : [])) {
      revalidatePath(p)
      revalidatedPaths.push(p)
    }
    for (const t of (Array.isArray(tags) ? tags : [])) {
      revalidateTag(t)
      revalidatedTags.push(t)
    }

    return NextResponse.json({ ok: true, revalidatedPaths, revalidatedTags })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
