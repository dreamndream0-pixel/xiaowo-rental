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

async function readSlides() {
  try {
    await ensureTable()
    const rows = await db.$queryRawUnsafe(
      `SELECT value FROM site_settings WHERE key = 'hero_slides' LIMIT 1`
    )
    if (!rows.length) return []
    return JSON.parse(rows[0].value)
  } catch {
    return []
  }
}

export async function GET() {
  const slides = await readSlides()
  return NextResponse.json(slides, { headers: CORS })
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
    return NextResponse.json({ ok: true, count: slides.length }, { headers: CORS })
  } catch (e) {
    console.error('hero POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS })
  }
}
