// src/app/api/parking/lots/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'

export const dynamic = 'force-dynamic'

// 取得所有停車場
export async function GET() {
  try {
    await ensureParkingTables()
    const lots = await db.parkingLot.findMany({ orderBy: { createdAt: 'asc' } })
    // 若尚無任何停車場，建立一個預設場站方便直接使用
    if (lots.length === 0) {
      const lot = await db.parkingLot.create({
        data: { name: '我的停車場', totalSpaces: 100, hourlyRate: 30 },
      })
      return NextResponse.json([lot])
    }
    return NextResponse.json(lots)
  } catch (e) {
    console.error('GET /api/parking/lots error:', e)
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 })
  }
}

// 新增停車場
export async function POST(request) {
  try {
    await ensureParkingTables()
    const { name, totalSpaces, hourlyRate, freeMinutes, dailyMax } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: '請輸入停車場名稱' }, { status: 400 })

    const lot = await db.parkingLot.create({
      data: {
        name: name.trim(),
        totalSpaces: Math.max(1, parseInt(totalSpaces) || 100),
        hourlyRate: Math.max(0, parseInt(hourlyRate) || 0),
        freeMinutes: Math.max(0, parseInt(freeMinutes) || 0),
        dailyMax: Math.max(0, parseInt(dailyMax) || 0),
      },
    })
    return NextResponse.json(lot, { status: 201 })
  } catch (e) {
    console.error('POST /api/parking/lots error:', e)
    return NextResponse.json({ error: '建立失敗' }, { status: 500 })
  }
}
