// src/app/api/parking/import-report/route.js
// 匯入「停車場車牌繳費查詢分析報表」PDF → 存進資料庫
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'
import { parseFeeReport } from '@/lib/parseFeeReport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  try {
    await ensureParkingTables()
    const form = await request.formData()
    const file = form.get('file')
    if (!file) return NextResponse.json({ error: '未選擇報表 PDF' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let parsed
    try {
      parsed = await parseFeeReport(buffer)
    } catch (e) {
      console.error('parseFeeReport error:', e?.message)
      const detail = String(e?.message || e).slice(0, 200)
      return NextResponse.json({ error: 'PDF 解析失敗', detail }, { status: 400 })
    }

    // 日期可由前端覆寫（表單 reportDate），否則用解析出來的
    const reportDate = String(form.get('reportDate') || parsed.reportDate || '').trim()
    if (!reportDate) return NextResponse.json({ error: '無法判斷報表日期，請手動指定' }, { status: 400 })
    if (!parsed.rows.length) return NextResponse.json({ error: '報表中找不到「有金額待繳」明細' }, { status: 400 })

    // 同一天重匯 → 先刪再寫（覆蓋）
    await db.feeRecord.deleteMany({ where: { reportDate } })
    await db.feeRecord.createMany({
      data: parsed.rows.map((r) => ({
        reportDate,
        plate: r.plate,
        entryAt: r.entryAt,
        amount: r.amount,
      })),
    })

    const total = parsed.rows.reduce((s, r) => s + r.amount, 0)
    return NextResponse.json({ reportDate, count: parsed.rows.length, total })
  } catch (e) {
    console.error('POST /api/parking/import-report error:', e?.message)
    return NextResponse.json({ error: '匯入失敗', detail: String(e?.message || e).slice(0, 200) }, { status: 500 })
  }
}
