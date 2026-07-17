// src/lib/parking.js
// 停車場管理：資料表自動建立（lazy migration）＋ 費用計算工具

import { db } from '@/lib/db'

let _done = false

// 確保停車場資料表存在（每個 Lambda 執行一次）
// 用 raw SQL CREATE TABLE IF NOT EXISTS，部署後自動建立，不需另跑 prisma migrate
export async function ensureParkingTables() {
  if (_done) return
  try {
    await db.$queryRawUnsafe(`
      CREATE TABLE IF NOT EXISTS parking_lots (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        "totalSpaces" INTEGER NOT NULL DEFAULT 100,
        "hourlyRate"  INTEGER NOT NULL DEFAULT 30,
        "freeMinutes" INTEGER NOT NULL DEFAULT 0,
        "dailyMax"    INTEGER NOT NULL DEFAULT 0,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await db.$queryRawUnsafe(`
      CREATE TABLE IF NOT EXISTS parking_sessions (
        id          TEXT PRIMARY KEY,
        "lotId"     TEXT NOT NULL,
        plate       TEXT NOT NULL,
        "photoUrl"  TEXT,
        "entryAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "exitAt"    TIMESTAMPTZ,
        amount      INTEGER NOT NULL DEFAULT 0,
        paid        BOOLEAN NOT NULL DEFAULT FALSE,
        "paidAt"    TIMESTAMPTZ,
        note        TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await db.$queryRawUnsafe(`CREATE INDEX IF NOT EXISTS parking_sessions_lot_idx ON parking_sessions ("lotId")`)
    await db.$queryRawUnsafe(`CREATE INDEX IF NOT EXISTS parking_sessions_plate_idx ON parking_sessions (plate)`)
    await db.$queryRawUnsafe(`CREATE INDEX IF NOT EXISTS parking_sessions_exit_idx ON parking_sessions ("exitAt")`)
  } catch (e) {
    console.error('ensureParkingTables error:', e?.message)
  }
  _done = true
}

// 計算停車費用
// lot: { hourlyRate, freeMinutes, dailyMax }
// entryAt, until（出場時間或現在）
// 規則：免費分鐘內免費；超過免費時段以「不足一小時以一小時計」計費；單日上限封頂
export function calcFee(lot, entryAt, until = new Date()) {
  const rate = Number(lot?.hourlyRate ?? 0)
  const freeMin = Number(lot?.freeMinutes ?? 0)
  const dailyMax = Number(lot?.dailyMax ?? 0)

  const start = new Date(entryAt).getTime()
  const end = new Date(until).getTime()
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000))

  if (totalMinutes <= freeMin) return 0

  const billableMinutes = totalMinutes - freeMin
  const hours = Math.ceil(billableMinutes / 60)

  // 依跨越的日曆天數套用單日上限
  const dayCount = Math.max(1, Math.ceil(totalMinutes / (60 * 24)))
  let fee = hours * rate
  if (dailyMax > 0) {
    fee = Math.min(fee, dailyMax * dayCount)
  }
  return fee
}

// 已停時長（分鐘 → 中文字串）
export function durationLabel(entryAt, until = new Date()) {
  const mins = Math.max(0, Math.floor((new Date(until).getTime() - new Date(entryAt).getTime()) / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} 分鐘`
  return `${h} 小時 ${m} 分`
}
