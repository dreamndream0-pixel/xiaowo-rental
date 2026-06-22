// src/app/api/admin/pages/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllSitePages, upsertSitePage } from '@/lib/sitePages'
import { revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: '無權限' }, { status: 403 })

  try {
    const pages = await getAllSitePages()
    return NextResponse.json(pages, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('admin pages GET error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: '無權限' }, { status: 403 })

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
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('admin pages POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
