// src/app/api/parking/fee-records/route.js
// 查詢已匯入的每日繳費報表：無 date → 各日彙總；有 date → 該日明細
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    await ensureParkingTables()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (date) {
      const rows = await db.feeRecord.findMany({
        where: { reportDate: date },
        orderBy: { amount: 'desc' },
      })
      const total = rows.reduce((s, r) => s + r.amount, 0)
      return NextResponse.json({ reportDate: date, count: rows.length, total, rows })
    }

    // 各日彙總
    const grouped = await db.feeRecord.groupBy({
      by: ['reportDate'],
      _count: { _all: true },
      _sum: { amount: true },
      orderBy: { reportDate: 'desc' },
    })
    const days = grouped.map((g) => ({
      reportDate: g.reportDate,
      count: g._count._all,
      total: g._sum.amount || 0,
    }))
    return NextResponse.json({ days })
  } catch (e) {
    console.error('GET /api/parking/fee-records error:', e?.message)
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await ensureParkingTables()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date) return NextResponse.json({ error: '缺少 date' }, { status: 400 })
    await db.feeRecord.deleteMany({ where: { reportDate: date } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/parking/fee-records error:', e?.message)
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  }
}
