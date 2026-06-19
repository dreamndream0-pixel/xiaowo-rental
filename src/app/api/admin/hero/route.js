// src/app/api/admin/hero/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { unstable_cache, revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

const getCachedSettings = unstable_cache(
  async () => {
    try {
      await ensureTable()
      const [slidesRaw, logoUrl] = await Promise.all([
        getSetting('hero_slides'),
        getSetting('site_logo'),
      ])
      const slides = slidesRaw ? JSON.parse(slidesRaw).filter(s => s && s.url) : []
      return { slides, logoUrl: logoUrl || '' }
    } catch (e) {
      return { slides: [], logoUrl: '' }
    }
  },
  ['hero-settings'],
  { revalidate: 30, tags: ['hero-settings', 'site-logo'] }
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// 確保資料表存在（首次自動建立）
async function ensureTable() {
  await db.$queryRawUnsafe(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function getSetting(key) {
  const rows = await db.$queryRawUnsafe(
    `SELECT value FROM site_settings WHERE key = $1`,
    key
  )
  return rows[0]?.value ?? null
}

async function setSetting(key, value) {
  await db.$queryRawUnsafe(
    `INSERT INTO site_settings (key, value, "updatedAt") VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, "updatedAt" = NOW()`,
    key,
    value
  )
}

async function readSettings() {
  try {
    await ensureTable()
    const [slidesRaw, logoUrl] = await Promise.all([
      getSetting('hero_slides'),
      getSetting('site_logo'),
    ])
    const slides = slidesRaw ? JSON.parse(slidesRaw).filter(s => s && s.url) : []
    return { slides, logoUrl: logoUrl || '' }
  } catch (e) {
    console.error('readSettings error:', e)
    return { slides: [], logoUrl: '' }
  }
}

export async function GET() {
  const settings = await getCachedSettings()
  return NextResponse.json(settings, {
    headers: { ...CORS, 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
  })
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
    await setSetting('hero_slides', JSON.stringify(slides))

    if (typeof body.logoUrl === 'string') {
      await setSetting('site_logo', body.logoUrl)
    }

    revalidateTag('hero-settings')
    revalidateTag('site-logo')
    return NextResponse.json({ ok: true, count: slides.length }, { headers: CORS })
  } catch (e) {
    console.error('hero POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS })
  }
}
