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

async function ensureTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function readSettings() {
  try {
    await ensureTable()
    const rows = await db.$queryRawUnsafe(
      `SELECT key, value FROM site_settings WHERE key IN ('hero_slides', 'site_logo')`
    )
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const slides = map.hero_slides ? JSON.parse(map.hero_slides).filter(s => s && s.url) : []
    const logoUrl = map.site_logo || ''
    return { slides, logoUrl }
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

    await ensureTable()
    await db.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, "updatedAt") VALUES ('hero_slides', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()`,
      JSON.stringify(slides)
    )
    if (typeof body.logoUrl === 'string') {
      await db.$executeRawUnsafe(
        `INSERT INTO site_settings (key, value, "updatedAt") VALUES ('site_logo', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()`,
        body.logoUrl
      )
    }
    return NextResponse.json({ ok: true, count: slides.length }, { headers: CORS })
  } catch (e) {
    console.error('hero POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS })
  }
}
