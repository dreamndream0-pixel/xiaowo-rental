import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SOURCE = 'tdx-offstreet-taichung'
const TDX_TOKEN_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token'
const TDX_AVAILABILITY_URL = 'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/ParkingAvailability/City/Taichung?$top=10000&$format=JSON'
const TDX_CARPARK_URL = 'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/CarPark/City/Taichung?$top=10000&$format=JSON'

let cachedToken = null
let cachedTokenExpiresAt = 0

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

function getTdxCredentials() {
  const clientId = process.env.TDX_CLIENT_ID || process.env.TDX_CLIENTID
  const clientSecret = process.env.TDX_CLIENT_SECRET || process.env.TDX_CLIENTSECRET
  if (!clientId || !clientSecret) throw new Error('尚未設定 TDX_CLIENT_ID / TDX_CLIENT_SECRET')
  return { clientId, clientSecret }
}

async function getTdxToken() {
  const now = Date.now()
  if (cachedToken && cachedTokenExpiresAt > now + 60000) return cachedToken

  const { clientId, clientSecret } = getTdxCredentials()
  const body = new URLSearchParams()
  body.set('grant_type', 'client_credentials')
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)

  const res = await fetch(TDX_TOKEN_URL, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`TDX Token 回應 ${res.status}`)

  const data = await res.json()
  if (!data.access_token) throw new Error('TDX Token 回應缺少 access_token')
  cachedToken = data.access_token
  cachedTokenExpiresAt = now + Math.max(60, Number(data.expires_in || 3600) - 60) * 1000
  return cachedToken
}

function normalizeCarParkName(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.Zh_tw || value.ZhTw || value.zh_tw || value.En || value.en || ''
}

function normalizeAvailability(item) {
  const total = Number(item.TotalSpaces ?? 0)
  const available = Number(item.AvailableSpaces ?? -1)
  const occupied = total > 0 && available >= 0 ? Math.max(0, total - available) : 0
  const utilization = total > 0 && available >= 0 ? Math.round((occupied / total) * 1000) / 10 : 0
  const dataTime = item.DataCollectTime || item.UpdateTime || item.SrcUpdateTime || new Date().toISOString()
  return {
    carParkId: item.CarParkID,
    name: normalizeCarParkName(item.CarParkName),
    available,
    total,
    occupied,
    utilization,
    serviceStatus: item.ServiceStatus,
    fullStatus: item.FullStatus,
    chargeStatus: item.ChargeStatus,
    rawUpdatedAt: taipeiDateTime(new Date(dataTime)),
    sampledAt: new Date(dataTime),
    remark: item.Remark || '',
  }
}

function normalizeStaticCarPark(item) {
  const total = Number(item.TotalSpaces ?? item.CarParkSpaces ?? 0)
  return {
    carParkId: item.CarParkID,
    name: normalizeCarParkName(item.CarParkName),
    available: null,
    total,
    occupied: null,
    utilization: null,
    serviceStatus: null,
    fullStatus: null,
    chargeStatus: null,
    rawUpdatedAt: null,
    sampledAt: null,
    remark: item.Description || item.FareDescription || '',
    address: item.Address || '',
    sourceType: 'carpark',
  }
}

async function fetchTdxJson(url, token) {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error(`TDX 回應 ${res.status}`)
  return res.json()
}

async function fetchTdxAvailability() {
  const token = await getTdxToken()
  const data = await fetchTdxJson(TDX_AVAILABILITY_URL, token)
  const items = Array.isArray(data.Items) ? data.Items : []
  return {
    sourceUpdateTime: data.SrcUpdateTime || data.UpdateTime || null,
    count: Number(data.Count ?? items.length),
    items: items.map(normalizeAvailability).filter((row) => row.carParkId && row.total > 0),
  }
}

async function fetchTdxCarParks() {
  const token = await getTdxToken()
  const data = await fetchTdxJson(TDX_CARPARK_URL, token)
  const items = Array.isArray(data.Items) ? data.Items : []
  return {
    sourceUpdateTime: data.SrcUpdateTime || data.UpdateTime || null,
    count: Number(data.Count ?? items.length),
    items: items.map(normalizeStaticCarPark).filter((row) => row.carParkId),
  }
}

function selectPrimaryAvailability(items) {
  const targetId = process.env.TDX_CARPARK_ID
  const targetName = process.env.TDX_CARPARK_NAME
  if (targetId) {
    const hit = items.find((row) => String(row.carParkId) === String(targetId))
    if (hit) return hit
  }
  if (targetName) {
    const hit = items.find((row) => row.name && row.name.includes(targetName))
    if (hit) return hit
  }
  return items.find((row) => row.available >= 0) || items[0] || null
}

async function saveSnapshot(snapshot) {
  if (!snapshot) return false
  const rawUpdatedAt = `${snapshot.carParkId}:${snapshot.rawUpdatedAt}`
  const existing = await db.$queryRaw`
    SELECT id FROM parking_occupancy_snapshots
    WHERE source = ${SOURCE} AND "rawUpdatedAt" = ${rawUpdatedAt}
    LIMIT 1
  `
  if (existing.length) return false

  await db.$executeRaw`
    INSERT INTO parking_occupancy_snapshots
      (id, source, "sampledAt", "rawUpdatedAt", available, total, occupied, utilization)
    VALUES
      (${crypto.randomUUID()}, ${SOURCE}, ${snapshot.sampledAt}, ${rawUpdatedAt}, ${snapshot.available}, ${snapshot.total}, ${snapshot.occupied}, ${snapshot.utilization})
  `
  return true
}

function buildTimeline(rows) {
  return rows.map((row, index) => {
    const prev = index > 0 ? rows[index - 1] : null
    const diff = prev ? row.available - prev.available : 0
    const minutes = prev ? Math.round((new Date(row.sampledAt).getTime() - new Date(prev.sampledAt).getTime()) / 60000) : null
    const anomaly = prev && Math.abs(diff) > Math.max(100, Math.round(row.total * 0.4)) && minutes != null && minutes <= 10
    const rawUpdatedAt = String(row.rawUpdatedAt || '').split(':').slice(1).join(':') || row.rawUpdatedAt
    return {
      sampledAt: row.sampledAt,
      rawUpdatedAt,
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
    if (!byDate.has(reportDate)) byDate.set(reportDate, { reportDate, entries: 0, exits: 0, samples: 0, anomalies: 0, avgUtilization: 0, lastAvailable: null, note: 'TDX 官方路外停車場剩餘格數推算' })
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

export async function GET() {
  try {
    await ensureParkingTables()

    let latest = null
    let saved = false
    let fetchError = null
    let availability = null
    let carParks = null
    let carParkFetchError = null

    try {
      availability = await fetchTdxAvailability()
      latest = selectPrimaryAvailability(availability.items)
      saved = await saveSnapshot(latest)
    } catch (error) {
      fetchError = error?.message || 'TDX 停車場剩餘格數抓取失敗'
    }

    if (!availability?.items?.length) {
      try {
        carParks = await fetchTdxCarParks()
      } catch (error) {
        carParkFetchError = error?.message || 'TDX 停車場基本資料抓取失敗'
      }
    }

    const rows = await db.$queryRaw`
      SELECT "sampledAt", "rawUpdatedAt", available, total, occupied, utilization
      FROM parking_occupancy_snapshots
      WHERE source = ${SOURCE}
      ORDER BY "sampledAt" ASC
    `
    const timeline = buildTimeline(rows)
    const latestRow = latest
      ? { ...latest, entries: 0, exits: 0, anomaly: false }
      : (timeline[timeline.length - 1] || null)
    const daily = summarizeTimeline(timeline)
    const lots = availability?.items?.length ? availability.items : (carParks?.items || [])
    const dataStatus = availability?.items?.length
      ? 'live'
      : (carParks?.items?.length ? 'carpark-list-only' : 'empty')
    const notice = dataStatus === 'live'
      ? null
      : (dataStatus === 'carpark-list-only'
        ? 'TDX 台中路外停車場剩餘位目前回傳 0 筆，已改顯示官方停車場清單供查詢 ID。'
        : 'TDX 台中路外停車場剩餘位目前回傳 0 筆，且停車場清單也未取得資料。')

    return NextResponse.json({
      source: SOURCE,
      url: TDX_AVAILABILITY_URL,
      carParkUrl: TDX_CARPARK_URL,
      saved,
      fetchError,
      carParkFetchError,
      historyFetchError: null,
      latest: latestRow,
      daily: daily.sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
      timeline: timeline.slice(-2500).reverse(),
      lots,
      count: availability?.count || 0,
      carParkCount: carParks?.count || 0,
      dataStatus,
      notice,
      sourceUpdateTime: availability?.sourceUpdateTime || null,
    })
  } catch (error) {
    console.error('GET /api/parking/tdx error:', error)
    return NextResponse.json({ error: 'TDX 停車場剩餘格數讀取失敗', detail: error?.message }, { status: 500 })
  }
}
