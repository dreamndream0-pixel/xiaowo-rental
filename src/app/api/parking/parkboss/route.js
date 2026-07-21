import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'
import parkbossHistory from '@/data/parkboss-txg-1497-history.json'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SOURCE = 'parkboss-txg-1497'
const PARKBOSS_URL = 'https://parkboss.tw/parking-space/txg-1497'
const PARKBOSS_HISTORY_URL = 'https://parkboss.tw/api/v1/query-parking-space-history-by-id?id=txg-1497'
const TOTAL_SPACES = 970
const KNOWN_DAILY = {
  ...Object.fromEntries((parkbossHistory.daily || []).map((item) => [item.reportDate, item])),
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

function taipeiDateTime(value) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value).replace('T', ' ')
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
      officialHistory: Boolean(row.officialHistory),
      historical: Boolean(row.historical),
    }
  })
}

async function fetchOfficialHistory() {
  const res = await fetch(PARKBOSS_HISTORY_URL, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 parking-dashboard/1.0',
    },
  })
  if (!res.ok) throw new Error(`ParkBoss 歷史回應 ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('ParkBoss 歷史資料格式錯誤')

  const rows = data
    .filter((item) => Array.isArray(item) && Number.isFinite(Number(item[0])) && Number.isFinite(Number(item[1])))
    .map((item) => {
      const sampledAt = new Date(Number(item[0]) * 1000)
      const available = Number(item[1])
      const occupied = Math.max(0, TOTAL_SPACES - available)
      return {
        sampledAt,
        rawUpdatedAt: taipeiDateTime(sampledAt),
        available,
        total: TOTAL_SPACES,
        occupied,
        utilization: Math.round((occupied / TOTAL_SPACES) * 1000) / 10,
        officialHistory: true,
      }
    })
    .sort((a, b) => a.sampledAt.getTime() - b.sampledAt.getTime())

  return buildTimeline(rows)
}

function normalizeHistoricalTimeline(rows) {
  return (rows || []).map((row) => ({
    sampledAt: row.sampledAt,
    rawUpdatedAt: row.rawUpdatedAt,
    available: Number(row.available || 0),
    total: Number(row.total || TOTAL_SPACES),
    occupied: Number(row.occupied || 0),
    utilization: Number(row.utilization || 0),
    entries: Number(row.entries || 0),
    exits: Number(row.exits || 0),
    turnover: Number(row.turnover || 0),
    entryTurnoverRate: Number(row.entryTurnoverRate || 0),
    totalTurnoverRate: Number(row.totalTurnoverRate || 0),
    anomaly: Boolean(row.anomaly),
    historical: true,
  }))
}

function mergeTimeline(...groups) {
  const byTime = new Map()
  for (const group of groups) {
    for (const row of group || []) {
      const key = row.rawUpdatedAt || row.sampledAt
      if (key) byTime.set(key, row)
    }
  }
  return [...byTime.values()].sort((a, b) => new Date(a.sampledAt).getTime() - new Date(b.sampledAt).getTime())
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
    if (row.officialHistory) item.note = 'ParkBoss 歷史 API 統計'
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

async function saveSnapshots(snapshots) {
  const payload = (snapshots || [])
    .filter((row) => row?.rawUpdatedAt && row?.sampledAt)
    .map((row) => ({
      id: crypto.randomUUID(),
      sampledAt: new Date(row.sampledAt).toISOString(),
      rawUpdatedAt: row.rawUpdatedAt,
      available: Number(row.available || 0),
      total: Number(row.total || TOTAL_SPACES),
      occupied: Number(row.occupied || 0),
      utilization: Number(row.utilization || 0),
    }))
  if (!payload.length) return 0

  const inserted = await db.$executeRaw`
    WITH incoming AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb)
      AS x(
        id TEXT,
        "sampledAt" TIMESTAMPTZ,
        "rawUpdatedAt" TEXT,
        available INTEGER,
        total INTEGER,
        occupied INTEGER,
        utilization DOUBLE PRECISION
      )
    )
    INSERT INTO parking_occupancy_snapshots
      (id, source, "sampledAt", "rawUpdatedAt", available, total, occupied, utilization)
    SELECT id, ${SOURCE}, "sampledAt", "rawUpdatedAt", available, total, occupied, utilization
    FROM incoming
    ON CONFLICT (source, "rawUpdatedAt") DO NOTHING
  `

  return Number(inserted || 0)
}

export async function GET() {
  try {
    await ensureParkingTables()

    let latest = null
    let saved = false
    let fetchError = null
    let historyFetchError = null
    let historySaved = 0
    let officialHistoryTimeline = []
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
    try {
      officialHistoryTimeline = await fetchOfficialHistory()
      historySaved = await saveSnapshots(officialHistoryTimeline)
    } catch (error) {
      historyFetchError = error?.message || 'ParkBoss 歷史抓取失敗'
    }

    const rows = await db.$queryRaw`
      SELECT "sampledAt", "rawUpdatedAt", available, total, occupied, utilization
      FROM parking_occupancy_snapshots
      WHERE source = ${SOURCE}
      ORDER BY "sampledAt" ASC
    `
    const historicalTimeline = normalizeHistoricalTimeline(parkbossHistory.timeline)
    const officialHistoryDates = new Set(officialHistoryTimeline.map((row) => taipeiDate(new Date(row.sampledAt))))
    const liveRows = rows.filter((row) => !officialHistoryDates.has(taipeiDate(new Date(row.sampledAt))))
    const liveTimeline = buildTimeline(liveRows)
    const timeline = mergeTimeline(historicalTimeline, officialHistoryTimeline, liveTimeline)
    const latestRow = liveTimeline[liveTimeline.length - 1] || timeline[timeline.length - 1] || (latest ? { ...latest, entries: 0, exits: 0, anomaly: false } : null)
    const liveDaily = summarizeTimeline(timeline)
    const dailyByDate = new Map(liveDaily.map((item) => [item.reportDate, item]))
    // 已知歷史日統計包含人工校正值，優先覆蓋由每 3 分鐘明細加總的結果。
    for (const item of Object.values(KNOWN_DAILY)) dailyByDate.set(item.reportDate, { ...dailyByDate.get(item.reportDate), ...item })

    return NextResponse.json({
      source: SOURCE,
      url: PARKBOSS_URL,
      saved,
      historySaved,
      fetchError,
      historyFetchError,
      latest: latestRow,
      daily: [...dailyByDate.values()].sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
      timeline: timeline.slice(-2500).reverse(),
    })
  } catch (error) {
    console.error('GET /api/parking/parkboss error:', error)
    return NextResponse.json({ error: 'ParkBoss 資料讀取失敗', detail: error?.message }, { status: 500 })
  }
}
