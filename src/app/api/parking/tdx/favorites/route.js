import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await ensureParkingTables()
    const rows = await db.$queryRaw`
      SELECT "carParkId", name, "createdAt"
      FROM parking_tdx_favorites
      ORDER BY "createdAt" ASC
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error('GET /api/parking/tdx/favorites error:', error)
    return NextResponse.json({ error: '讀取 TDX 收藏停車場失敗' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await ensureParkingTables()
    const body = await request.json()
    const carParkId = String(body?.carParkId || '').trim()
    const name = String(body?.name || '').trim()
    if (!carParkId) return NextResponse.json({ error: '缺少停車場 ID' }, { status: 400 })
    if (!name) return NextResponse.json({ error: '缺少停車場名稱' }, { status: 400 })

    const rows = await db.$queryRaw`
      INSERT INTO parking_tdx_favorites ("carParkId", name)
      VALUES (${carParkId}, ${name})
      ON CONFLICT ("carParkId") DO UPDATE SET name = EXCLUDED.name
      RETURNING "carParkId", name, "createdAt"
    `
    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('POST /api/parking/tdx/favorites error:', error)
    return NextResponse.json({ error: '新增 TDX 收藏停車場失敗' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await ensureParkingTables()
    const carParkId = request.nextUrl.searchParams.get('carParkId')
    if (!carParkId) return NextResponse.json({ error: '缺少停車場 ID' }, { status: 400 })

    await db.$executeRaw`
      DELETE FROM parking_tdx_favorites
      WHERE "carParkId" = ${carParkId}
    `
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/parking/tdx/favorites error:', error)
    return NextResponse.json({ error: '移除 TDX 收藏停車場失敗' }, { status: 500 })
  }
}
