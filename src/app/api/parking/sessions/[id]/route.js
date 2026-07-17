// src/app/api/parking/sessions/[id]/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables, calcFee } from '@/lib/parking'

export const dynamic = 'force-dynamic'

// 更新紀錄：車輛出場（action=exit）、標記已繳/未繳（action=pay/unpay）、或編輯欄位
export async function PATCH(request, { params }) {
  try {
    await ensureParkingTables()
    const body = await request.json()
    const session = await db.parkingSession.findUnique({ where: { id: params.id } })
    if (!session) return NextResponse.json({ error: '紀錄不存在' }, { status: 404 })

    const data = {}

    if (body.action === 'exit') {
      const lot = await db.parkingLot.findUnique({ where: { id: session.lotId } })
      const exitAt = body.exitAt ? new Date(body.exitAt) : new Date()
      data.exitAt = exitAt
      // 出場時定版金額（可由前端覆寫）
      data.amount = body.amount !== undefined
        ? Math.max(0, parseInt(body.amount) || 0)
        : calcFee(lot, session.entryAt, exitAt)
    } else if (body.action === 'pay') {
      data.paid = true
      data.paidAt = new Date()
    } else if (body.action === 'unpay') {
      data.paid = false
      data.paidAt = null
    }

    // 一般欄位編輯
    if (body.plate !== undefined) data.plate = String(body.plate).trim().toUpperCase()
    if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl || null
    if (body.amount !== undefined && body.action !== 'exit') data.amount = Math.max(0, parseInt(body.amount) || 0)
    if (body.note !== undefined) data.note = body.note || null
    if (body.entryAt !== undefined) data.entryAt = new Date(body.entryAt)

    const updated = await db.parkingSession.update({ where: { id: params.id }, data })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('PATCH /api/parking/sessions/[id] error:', e)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}

// 刪除紀錄
export async function DELETE(_request, { params }) {
  try {
    await ensureParkingTables()
    await db.parkingSession.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/parking/sessions/[id] error:', e)
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  }
}
