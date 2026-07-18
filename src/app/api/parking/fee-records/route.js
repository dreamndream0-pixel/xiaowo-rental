import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'

export const dynamic = 'force-dynamic'

function normalizeRecord(row, fallbackDate) {
  const amount = Number(row.amount || 0)
  const entryAt = row.entryAt || row.entryTime || null
  const monthlyCandidate = Boolean(row.monthlyCandidate)
  const status =
    row.status ||
    (amount > 0 ? '待繳' : monthlyCandidate ? '月租候選' : entryAt ? '0元' : '查無繳費紀錄')

  return {
    reportDate: String(row.reportDate || row.date || fallbackDate || '').trim(),
    plate: String(row.plate || '').toUpperCase().replace(/[^A-Z0-9-]/g, ''),
    entryAt,
    queryTime: row.queryTime || null,
    amount: Number.isFinite(amount) ? amount : 0,
    status,
    monthlyCandidate,
    parkedMinutes: row.parkedMinutes == null ? null : Number(row.parkedMinutes),
    sourceRow: row.sourceRow == null ? null : Number(row.sourceRow),
    note: row.note || null,
  }
}

function displayStatus(row) {
  if (row.status === '查詢異常') return '查詢異常'
  if (row.monthlyCandidate) return '月租候選'
  if (row.amount > 0) return '待繳'
  if (!row.entryAt) return '查無繳費紀錄'
  if (row.parkedMinutes != null && row.parkedMinutes <= 15) return '0元未滿15分鐘'
  return '0元無法判斷'
}

function decorate(row) {
  const status = displayStatus(row)
  return { ...row, status }
}

function summarize(rows) {
  return rows.reduce(
    (acc, row) => {
      const status = displayStatus(row)
      acc.count += 1
      acc.total += Number(row.amount || 0)
      if (row.amount > 0) acc.dueCount += 1
      if (row.monthlyCandidate) acc.monthlyCandidateCount += 1
      if (status === '查無繳費紀錄') acc.noPaymentCount += 1
      if (status === '0元未滿15分鐘') acc.zeroUnder15Count += 1
      if (status === '0元無法判斷') acc.zeroUnknownCount += 1
      if (status === '查詢異常') acc.errorCount += 1
      return acc
    },
    {
      count: 0,
      dueCount: 0,
      monthlyCandidateCount: 0,
      noPaymentCount: 0,
      zeroUnder15Count: 0,
      zeroUnknownCount: 0,
      errorCount: 0,
      total: 0,
    }
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
      const decorated = rows.map(decorate)
      return NextResponse.json({ reportDate: date, ...summarize(rows), rows: decorated })
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
          ...summarize(rows),
          count: group._count._all,
          total: group._sum.amount || 0,
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
