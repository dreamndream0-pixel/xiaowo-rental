// src/app/api/parking/sessions/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables, calcFee } from '@/lib/parking'

export const dynamic = 'force-dynamic'

// 取得車輛進出紀錄
// query: lotId（必填）, status = 'onsite' | 'history' | 'all'（預設 all）
export async function GET(request) {
  try {
    await ensureParkingTables()
    const { searchParams } = new URL(request.url)
    const lotId = searchParams.get('lotId')
    const status = searchParams.get('status') || 'all'
    if (!lotId) return NextResponse.json({ error: '缺少 lotId' }, { status: 400 })

    const where = { lotId }
    if (status === 'onsite') where.exitAt = null
    else if (status === 'history') where.exitAt = { not: null }

    const lot = await db.parkingLot.findUnique({ where: { id: lotId } })
    const sessions = await db.parkingSession.findMany({
      where,
      orderBy: [{ exitAt: 'asc' }, { entryAt: 'desc' }],
      take: 500,
    })

    // 在場車輛即時試算目前應繳金額
    const now = new Date()
    const result = sessions.map((s) => ({
      ...s,
      liveAmount: s.exitAt ? s.amount : calcFee(lot, s.entryAt, now),
    }))
    return NextResponse.json(result)
  } catch (e) {
    console.error('GET /api/parking/sessions error:', e)
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 })
  }
}

// 車輛進場
export async function POST(request) {
  try {
    await ensureParkingTables()
    const { lotId, plate, photoUrl, entryAt, note } = await request.json()
    if (!lotId) return NextResponse.json({ error: '缺少 lotId' }, { status: 400 })
    if (!plate?.trim()) return NextResponse.json({ error: '請輸入車牌號碼' }, { status: 400 })

    // 檢查是否還有空位
    const lot = await db.parkingLot.findUnique({ where: { id: lotId } })
    if (!lot) return NextResponse.json({ error: '停車場不存在' }, { status: 404 })
    const onsite = await db.parkingSession.count({ where: { lotId, exitAt: null } })
    if (onsite >= lot.totalSpaces) {
      return NextResponse.json({ error: '車格已滿，無法進場' }, { status: 400 })
    }

    const session = await db.parkingSession.create({
      data: {
        lotId,
        plate: plate.trim().toUpperCase(),
        photoUrl: photoUrl || null,
        entryAt: entryAt ? new Date(entryAt) : new Date(),
        note: note || null,
      },
    })
    return NextResponse.json(session, { status: 201 })
  } catch (e) {
    console.error('POST /api/parking/sessions error:', e)
    return NextResponse.json({ error: '進場登記失敗' }, { status: 500 })
  }
}
