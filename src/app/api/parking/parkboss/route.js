import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SOURCE = 'parkboss-txg-1497'
const PARKBOSS_URL = 'https://parkboss.tw/parking-space/txg-1497'
const TOTAL_SPACES = 970
const KNOWN_DAILY = {
  '2026-07-14': { reportDate: '2026-07-14', entries: 358, exits: 221, samples: 474, note: 'ParkBoss API 歷史統計，已排除 15:01-15:04 剩餘格數 +445 系統跳點' },
  '2026-07-15': { reportDate: '2026-07-15', entries: 395, exits: 162, samples: 471, note: 'ParkBoss API 歷史統計' },
}

function taipeiDate(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function parseParkBoss(html) {
  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const tableMatch = text.match(/汽車\s+(\d+)\s+(\d+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/)
  const metaMatch = text.match(/目前汽車即時剩餘車位還有(\d+)個.*?汽車:(\d+)個/)
  const timeMatch = text.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/)
  if (!tableMatch && !metaMatch) throw new Error('ParkBoss 汽車資料解析失敗')

  const available = Number(tableMatch?.[1] ?? metaMatch?.[1])
  const total = Number(tableMatch?.[2] ?? metaMatch?.[2]) || TOTAL_SPACES
  const rawUpdatedAt = tableMatch?.[3] || timeMatch?.[1] || new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()).replace('T', ' ')
  const sampledAt = new Date(rawUpdatedAt.replace(' ', 'T') + '+08:00')
  const occupied = Math.max(0, total - available)
  const utilization = Math.round((occupied / total) * 1000) / 10

  return { available, total, occupied, utilization, rawUpdatedAt, sampledAt }
}

function buildTimeline(rows) {
  return rows.map((row, index) => {
    const prev = index > 0 ? rows[index - 1] : null
    const diff = prev ? row.available - prev.available : 0
    const minutes = prev ? Math.round((new Date(row.sampledAt).getTime() - new Date(prev.sampledAt).getTime()) / 60000) : null
    const anomaly = prev && Math.abs(diff) > 200 && minutes != null && minutes <= 10
    return {
      sampledAt: row.sampledAt,
      rawUpdatedAt: row.rawUpdatedAt,
      available: row.available,
      total: row.total,
      occupied: row.occupied,
      utilization: row.utilization,
      entries: !prev || anomaly ? 0 : Math.max(0, -diff),
      exits: !prev || anomaly ? 0 : Math.max(0, diff),
      anomaly,
    }
  })
}

function summarizeTimeline(timeline) {
  const byDate = new Map()
  for (const row of timeline) {
    const reportDate = taipeiDate(new Date(row.sampledAt))
    if (!byDate.has(reportDate)) byDate.set(reportDate, { reportDate, entries: 0, exits: 0, samples: 0, anomalies: 0, avgUtilization: 0, lastAvailable: null })
    const item = byDate.get(reportDate)
    item.entries += row.entries
    item.exits += row.exits
    item.samples += 1
    item.anomalies += row.anomaly ? 1 : 0
    item.avgUtilization += row.utilization
    item.lastAvailable = row.available
  }
  return [...byDate.values()].map((item) => ({
    ...item,
    avgUtilization: item.samples ? Math.round((item.avgUtilization / item.samples) * 10) / 10 : 0,
  }))
}

async function saveSnapshot(snapshot) {
  const id = crypto.randomUUID()
  const existing = await db.$queryRaw`
    SELECT id FROM parking_occupancy_snapshots
    WHERE source = ${SOURCE} AND "rawUpdatedAt" = ${snapshot.rawUpdatedAt}
    LIMIT 1
  `
  if (existing.length) return false

  await db.$executeRaw`
    INSERT INTO parking_occupancy_snapshots
      (id, source, "sampledAt", "rawUpdatedAt", available, total, occupied, utilization)
    VALUES
      (${id}, ${SOURCE}, ${snapshot.sampledAt}, ${snapshot.rawUpdatedAt}, ${snapshot.available}, ${snapshot.total}, ${snapshot.occupied}, ${snapshot.utilization})
  `
  return true
}

export async function GET() {
  try {
    await ensureParkingTables()

    let latest = null
    let saved = false
    let fetchError = null
    try {
      const res = await fetch(PARKBOSS_URL, {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 parking-dashboard/1.0' },
      })
      if (!res.ok) throw new Error(`ParkBoss 回應 ${res.status}`)
      latest = parseParkBoss(await res.text())
      saved = await saveSnapshot(latest)
    } catch (error) {
      fetchError = error?.message || 'ParkBoss 抓取失敗'
    }

    const rows = await db.$queryRaw`
      SELECT "sampledAt", "rawUpdatedAt", available, total, occupied, utilization
      FROM parking_occupancy_snapshots
      WHERE source = ${SOURCE}
      ORDER BY "sampledAt" ASC
    `
    const timeline = buildTimeline(rows)
    const latestRow = timeline[timeline.length - 1] || (latest ? { ...latest, entries: 0, exits: 0, anomaly: false } : null)
    const liveDaily = summarizeTimeline(timeline)
    const dailyByDate = new Map(Object.values(KNOWN_DAILY).map((item) => [item.reportDate, item]))
    for (const item of liveDaily) dailyByDate.set(item.reportDate, { ...dailyByDate.get(item.reportDate), ...item })

    return NextResponse.json({
      source: SOURCE,
      url: PARKBOSS_URL,
      saved,
      fetchError,
      latest: latestRow,
      daily: [...dailyByDate.values()].sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
      timeline: timeline.slice(-120).reverse(),
    })
  } catch (error) {
    console.error('GET /api/parking/parkboss error:', error)
    return NextResponse.json({ error: 'ParkBoss 資料讀取失敗', detail: error?.message }, { status: 500 })
  }
}
