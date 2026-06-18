// src/app/api/admin/hero/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

async function getSetting(key) {
  try {
    const row = await db.siteSetting.findUnique({ where: { key } })
    return row?.value ?? null
  } catch {
    return null
  }
}

async function setSetting(key, value) {
  await db.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

async function readSettings() {
  try {
    const [slidesRaw, logoUrl] = await Promise.all([
      getSetting('hero_slides'),
      getSetting('site_logo'),
    ])
    const slides = slidesRaw ? JSON.parse(slidesRaw).filter(s => s && s.url) : []
    return { slides, logoUrl: logoUrl || '' }
  } catch {
    return { slides: [], logoUrl: '' }
  }
}

export async function GET() {
  const settings = await readSettings()
  return NextResponse.json(settings, { headers: CORS })
}

export async function POST(request) {
  try {
    const body = await request.json()
    if (!Array.isArray(body.slides)) {
      return NextResponse.json({ error: 'slides must be an array' }, { status: 400, headers: CORS })
    }
    const slides = body.slides
      .filter(s => s && typeof s.url === 'string' && s.url.trim())
      .map(s => ({ url: s.url.trim(), alt: s.alt || '小蝸出租房源' }))

    await setSetting('hero_slides', JSON.stringify(slides))

    if (typeof body.logoUrl === 'string') {
      await setSetting('site_logo', body.logoUrl)
    }

    return NextResponse.json({ ok: true, count: slides.length }, { headers: CORS })
  } catch (e) {
    console.error('hero POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS })
  }
}
