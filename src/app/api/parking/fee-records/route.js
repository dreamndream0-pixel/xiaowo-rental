import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'

export const dynamic = 'force-dynamic'

function normalizeRecord(row, fallbackDate) {
  const amount = Number(row.amount || 0)
  const status =
    row.status ||
    (amount > 0 ? '待繳' : row.monthlyCandidate ? '月租候選' : row.entryTime || row.entryAt ? '0元' : '查無繳費紀錄')

  return {
    reportDate: String(row.reportDate || row.date || fallbackDate || '').trim(),
    plate: String(row.plate || '').toUpperCase().replace(/[^A-Z0-9-]/g, ''),
    entryAt: row.entryAt || row.entryTime || null,
    queryTime: row.queryTime || null,
    amount: Number.isFinite(amount) ? amount : 0,
    status,
    monthlyCandidate: Boolean(row.monthlyCandidate || status === '月租候選'),
    parkedMinutes: row.parkedMinutes == null ? null : Number(row.parkedMinutes),
    sourceRow: row.sourceRow == null ? null : Number(row.sourceRow),
    note: row.note || null,
  }
}

function summarize(rows) {
  return rows.reduce(
    (acc, row) => {
      acc.count += 1
      acc.total += Number(row.amount || 0)
      if (row.amount > 0) acc.dueCount += 1
      if (row.monthlyCandidate) acc.monthlyCandidateCount += 1
      if (row.status === '查無繳費紀錄') acc.noPaymentCount += 1
      return acc
    },
    { count: 0, dueCount: 0, monthlyCandidateCount: 0, noPaymentCount: 0, total: 0 }
  )
}

export async function GET(request) {
  try {
    await ensureParkingTables()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (date) {
      const rows = await db.feeRecord.findMany({
        where: { reportDate: date },
        orderBy: [{ amount: 'desc' }, { plate: 'asc' }],
      })
      return NextResponse.json({ reportDate: date, ...summarize(rows), rows })
    }

    const grouped = await db.feeRecord.groupBy({
      by: ['reportDate'],
      _count: { _all: true },
      _sum: { amount: true },
      orderBy: { reportDate: 'desc' },
    })

    const days = await Promise.all(
      grouped.map(async (group) => {
        const rows = await db.feeRecord.findMany({ where: { reportDate: group.reportDate } })
        return {
          reportDate: group.reportDate,
          count: group._count._all,
          total: group._sum.amount || 0,
          dueCount: rows.filter((row) => row.amount > 0).length,
          monthlyCandidateCount: rows.filter((row) => row.monthlyCandidate).length,
          noPaymentCount: rows.filter((row) => row.status === '查無繳費紀錄').length,
        }
      })
    )

    return NextResponse.json({ days })
  } catch (error) {
    console.error('GET /api/parking/fee-records error:', error?.message)
    return NextResponse.json({ error: '讀取失敗', detail: String(error?.message || error).slice(0, 200) }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await ensureParkingTables()
    const body = await request.json()
    const inputRows = Array.isArray(body) ? body : Array.isArray(body.rows) ? body.rows : []
    const rows = inputRows.map((row) => normalizeRecord(row, body.reportDate)).filter((row) => row.reportDate && row.plate)
    if (!rows.length) return NextResponse.json({ error: '沒有可匯入的明細' }, { status: 400 })

    const dates = [...new Set(rows.map((row) => row.reportDate))]
    for (const reportDate of dates) {
      const dayRows = rows.filter((row) => row.reportDate === reportDate)
      await db.feeRecord.deleteMany({ where: { reportDate } })
      await db.feeRecord.createMany({ data: dayRows })
    }

    return NextResponse.json({ ok: true, dates, ...summarize(rows) })
  } catch (error) {
    console.error('POST /api/parking/fee-records error:', error?.message)
    return NextResponse.json({ error: '匯入失敗', detail: String(error?.message || error).slice(0, 200) }, { status: 500 })
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
  } catch (error) {
    console.error('DELETE /api/parking/fee-records error:', error?.message)
    return NextResponse.json({ error: '刪除失敗', detail: String(error?.message || error).slice(0, 200) }, { status: 500 })
  }
}
