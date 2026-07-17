// src/app/api/parking/lots/[id]/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'

export const dynamic = 'force-dynamic'

// 更新停車場設定（總車格、費率等）
export async function PATCH(request, { params }) {
  try {
    await ensureParkingTables()
    const body = await request.json()
    const data = {}
    if (body.name !== undefined) data.name = String(body.name).trim()
    if (body.totalSpaces !== undefined) data.totalSpaces = Math.max(1, parseInt(body.totalSpaces) || 1)
    if (body.hourlyRate !== undefined) data.hourlyRate = Math.max(0, parseInt(body.hourlyRate) || 0)
    if (body.freeMinutes !== undefined) data.freeMinutes = Math.max(0, parseInt(body.freeMinutes) || 0)
    if (body.dailyMax !== undefined) data.dailyMax = Math.max(0, parseInt(body.dailyMax) || 0)
    if (body.payUrl !== undefined) data.payUrl = String(body.payUrl).trim() || null

    const lot = await db.parkingLot.update({ where: { id: params.id }, data })
    return NextResponse.json(lot)
  } catch (e) {
    console.error('PATCH /api/parking/lots/[id] error:', e)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}

// 刪除停車場（連同紀錄）
export async function DELETE(_request, { params }) {
  try {
    await ensureParkingTables()
    await db.parkingLot.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/parking/lots/[id] error:', e)
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  }
}
