// src/app/api/admin/hero/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { unstable_cache, revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

// ⚠️ 錯誤時直接 throw，不 return 空值
// → unstable_cache 不會快取失敗結果，下次請求自動重試
const getCachedSettings = unstable_cache(
  async () => {
    const [slidesRow, logoRow] = await Promise.all([
      db.siteSetting.findUnique({ where: { key: 'hero_slides' } }),
      db.siteSetting.findUnique({ where: { key: 'site_logo' } }),
    ])
    const slides = slidesRow?.value
      ? JSON.parse(slidesRow.value).filter(s => s && s.url)
      : []
    return { slides, logoUrl: logoRow?.value || '' }
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

export async function GET() {
  try {
    const settings = await getCachedSettings()
    return NextResponse.json(settings, {
      headers: { ...CORS, 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    })
  } catch (e) {
    console.error('hero GET error:', e)
    // 回傳空值但不快取（已在 getCachedSettings 層拋出）
    return NextResponse.json({ slides: [], logoUrl: '' }, { headers: CORS })
  }
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

    // 用 Prisma upsert 取代 raw SQL
    await Promise.all([
      db.siteSetting.upsert({
        where: { key: 'hero_slides' },
        create: { key: 'hero_slides', value: JSON.stringify(slides) },
        update: { value: JSON.stringify(slides) },
      }),
      ...(typeof body.logoUrl === 'string' ? [
        db.siteSetting.upsert({
          where: { key: 'site_logo' },
          create: { key: 'site_logo', value: body.logoUrl },
          update: { value: body.logoUrl },
        }),
      ] : []),
    ])

    revalidateTag('hero-settings')
    revalidateTag('site-logo')
    return NextResponse.json({ ok: true, count: slides.length }, { headers: CORS })
  } catch (e) {
    console.error('hero POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS })
  }
}
