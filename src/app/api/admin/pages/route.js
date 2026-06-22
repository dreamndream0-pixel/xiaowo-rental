// src/app/api/admin/pages/route.js
import { NextResponse } from 'next/server'
import { getAllSitePages, upsertSitePage } from '@/lib/sitePages'
import { revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// 與 LINE Bot 後台（linebot-rental）共用的管理金鑰，兩邊需設定同一組 ADMIN_KEY
function isAuthorized(request) {
  const adminKey = process.env.ADMIN_KEY
  if (!adminKey) return false
  const key = request.nextUrl.searchParams.get('key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return key === adminKey
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: '無權限' }, { status: 401, headers: CORS })
  }
  try {
    const pages = await getAllSitePages()
    return NextResponse.json(pages, { headers: { ...CORS, 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('admin pages GET error:', e)
    return NextResponse.json({ about: {}, guide: {}, privacy: {}, terms: {} }, { headers: CORS })
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: '無權限' }, { status: 401, headers: CORS })
  }
  try {
    const body = await request.json()
    const entries = {
      page_about:   body.about,
      page_guide:   body.guide,
      page_privacy: body.privacy,
      page_terms:   body.terms,
    }
    for (const [key, value] of Object.entries(entries)) {
      if (!value) continue
      await upsertSitePage(key, {
        title: typeof value.title === 'string' ? value.title : '',
        body:  typeof value.body  === 'string' ? value.body  : '',
      })
    }
    revalidateTag('site-pages')
    return NextResponse.json({ ok: true }, { headers: CORS })
  } catch (e) {
    console.error('admin pages POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS })
  }
}
