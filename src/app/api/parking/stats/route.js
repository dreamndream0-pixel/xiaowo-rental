// src/app/api/parking/stats/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables, calcFee } from '@/lib/parking'

export const dynamic = 'force-dynamic'

// 今日 00:00（台北時間）對應的 UTC Date
function taipeiTodayStart() {
  const now = new Date()
  const taipei = new Date(now.getTime() + 8 * 3600 * 1000)
  taipei.setUTCHours(0, 0, 0, 0)
  return new Date(taipei.getTime() - 8 * 3600 * 1000)
}

// 停車場即時統計
export async function GET(request) {
  try {
    await ensureParkingTables()
    const { searchParams } = new URL(request.url)
    const lotId = searchParams.get('lotId')
    if (!lotId) return NextResponse.json({ error: '缺少 lotId' }, { status: 400 })

    const lot = await db.parkingLot.findUnique({ where: { id: lotId } })
    if (!lot) return NextResponse.json({ error: '停車場不存在' }, { status: 404 })

    const now = new Date()
    const todayStart = taipeiTodayStart()

    // 在場車輛
    const onsiteSessions = await db.parkingSession.findMany({
      where: { lotId, exitAt: null },
    })
    const onsite = onsiteSessions.length

    // 現場待繳總金額（在場車輛即時試算加總）
    const dueTotal = onsiteSessions.reduce((sum, s) => sum + calcFee(lot, s.entryAt, now), 0)
    // 現場尚未繳費車輛數
    const unpaidCount = onsiteSessions.filter((s) => !s.paid).length

    // 今日進場車次（周轉率分子）
    const todayEntries = await db.parkingSession.count({
      where: { lotId, entryAt: { gte: todayStart } },
    })
    // 今日出場車次
    const todayExits = await db.parkingSession.count({
      where: { lotId, exitAt: { gte: todayStart } },
    })
    // 今日已收營收（今日出場且已繳）
    const paidToday = await db.parkingSession.findMany({
      where: { lotId, exitAt: { gte: todayStart }, paid: true },
      select: { amount: true },
    })
    const revenueToday = paidToday.reduce((sum, s) => sum + s.amount, 0)

    const totalSpaces = lot.totalSpaces || 1
    const utilization = Math.round((onsite / totalSpaces) * 1000) / 10   // 使用率 %
    const turnover = Math.round((todayEntries / totalSpaces) * 100) / 100 // 周轉率（每車格）

    return NextResponse.json({
      lot,
      onsite,                      // 在場車輛數
      totalSpaces,                 // 總車格
      available: Math.max(0, totalSpaces - onsite), // 剩餘車格
      utilization,                 // 使用率 %
      turnover,                    // 今日周轉率
      todayEntries,                // 今日進場車次
      todayExits,                  // 今日出場車次
      dueTotal,                    // 現場待繳總金額
      unpaidCount,                 // 現場未繳車輛數
      revenueToday,                // 今日已收營收
    })
  } catch (e) {
    console.error('GET /api/parking/stats error:', e)
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 })
  }
}
