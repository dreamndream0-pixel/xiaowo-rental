import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'
import { parseFeeReport } from '@/lib/parseFeeReport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function normalizeRow(row) {
  const amount = Number(row.amount || 0)
  const status =
    row.status ||
    (amount > 0 ? '待繳' : row.monthlyCandidate ? '月租候選' : row.entryAt ? '0元' : '查無繳費紀錄')

  return {
    reportDate: '',
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

export async function POST(request) {
  try {
    await ensureParkingTables()
    const form = await request.formData()
    const file = form.get('file')
    if (!file) return NextResponse.json({ error: '請上傳 PDF' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let parsed
    try {
      parsed = await parseFeeReport(buffer)
    } catch (error) {
      console.error('parseFeeReport error:', error?.message)
      return NextResponse.json(
        { error: 'PDF 解析失敗', detail: String(error?.message || error).slice(0, 200) },
        { status: 400 }
      )
    }

    const reportDate = String(form.get('reportDate') || parsed.reportDate || '').trim()
    if (!reportDate) {
      return NextResponse.json({ error: '無法判斷報表日期，請重新產生報表或改用 JSON 匯入' }, { status: 400 })
    }

    const rows = (parsed.rows || []).map(normalizeRow).filter((row) => row.plate)
    if (!rows.length) {
      return NextResponse.json({ error: '報表中找不到可匯入的車牌明細' }, { status: 400 })
    }

    await db.feeRecord.deleteMany({ where: { reportDate } })
    await db.feeRecord.createMany({
      data: rows.map((row) => ({ ...row, reportDate })),
    })

    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const dueCount = rows.filter((row) => row.amount > 0).length
    const monthlyCandidateCount = rows.filter((row) => row.monthlyCandidate).length

    return NextResponse.json({
      reportDate,
      count: rows.length,
      dueCount,
      monthlyCandidateCount,
      total,
    })
  } catch (error) {
    console.error('POST /api/parking/import-report error:', error?.message)
    return NextResponse.json(
      { error: '匯入失敗', detail: String(error?.message || error).slice(0, 200) },
      { status: 500 }
    )
  }
}
