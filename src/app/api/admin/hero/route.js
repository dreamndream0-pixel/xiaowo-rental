// src/app/api/admin/hero/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { unstable_cache, revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

// 用 raw SQL 讀取，不依賴 Prisma model 是否 generate 成功
// 拋出錯誤讓 unstable_cache 不快取失敗結果
async function readSettingsFromDB() {
  const rows = await db.$queryRawUnsafe(
    `SELECT key, value FROM site_settings WHERE key IN ('hero_slides','site_logo')`
  )
  const map = {}
  rows.forEach(r => { map[r.key] = r.value })
  const slides = map['hero_slides']
    ? JSON.parse(map['hero_slides']).filter(s => s && s.url)
    : []
  return { slides, logoUrl: map['site_logo'] || '' }
}

const getCachedSettings = unstable_cache(
  readSettingsFromDB,   // throw 時不快取，下次自動重試
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

export async function GET() {
  try {
    const settings = await getCachedSettings()
    return NextResponse.json(settings, {
      headers: { ...CORS, 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    })
  } catch (e) {
    console.error('hero GET error:', e)
    return NextResponse.json({ slides: [], logoUrl: '' }, { headers: CORS })
  }
}

async function upsertSetting(key, value) {
  await db.$queryRawUnsafe(
    `INSERT INTO site_settings (key, value, "updatedAt")
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, "updatedAt" = NOW()`,
    key, value
  )
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

    await upsertSetting('hero_slides', JSON.stringify(slides))
    if (typeof body.logoUrl === 'string') {
      await upsertSetting('site_logo', body.logoUrl)
    }

    revalidateTag('hero-settings')
    revalidateTag('site-logo')
    return NextResponse.json({ ok: true, count: slides.length }, { headers: CORS })
  } catch (e) {
    console.error('hero POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS })
  }
}
