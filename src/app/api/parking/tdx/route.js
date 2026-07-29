import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SOURCE = 'tdx-offstreet-taichung'
const AVAILABILITY_CACHE_KEY = `${SOURCE}:availability`
const SPOT_AVAILABILITY_CACHE_KEY = `${SOURCE}:spot-availability`
const CARPARK_CACHE_KEY = `${SOURCE}:carparks`
const PARKING_SPACE_CACHE_KEY = `${SOURCE}:parking-spaces`
const CACHE_TTL_MS = 10 * 60 * 1000
const EMPTY_CACHE_TTL_MS = 60 * 1000
const TDX_TOKEN_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token'
const TDX_AVAILABILITY_URL = 'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/ParkingAvailability/City/Taichung?$top=1000&$format=JSON'
const TDX_SPOT_AVAILABILITY_URL = 'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/ParkingSpotAvailability/City/Taichung?$top=1000&$format=JSON'
const TDX_CARPARK_URL = 'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/CarPark/City/Taichung?$top=1000&$format=JSON'
const TDX_PARKING_SPACE_URL = 'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/ParkingSpace/City/Taichung?$top=1000&$format=JSON'

let cachedToken = null
let cachedTokenExpiresAt = 0
let memoryCache = new Map()

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

function normalizeParkingSpace(item) {
  const spaces = Array.isArray(item.Spaces) ? item.Spaces : []
  const totalFromSpaces = spaces.reduce((sum, row) => sum + Number(row.NumberOfSpaces || 0), 0)
  const total = Number(item.TotalSpaces ?? totalFromSpaces ?? 0)
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
    remark: '',
    address: '',
    sourceType: 'parking-space',
  }
}

function normalizeSpotAvailabilityGroups(items, sourceUpdateTime) {
  const groups = new Map()
  for (const item of items) {
    if (!item.CarParkID) continue
    const key = item.CarParkID
    if (!groups.has(key)) {
      groups.set(key, {
        carParkId: key,
        name: normalizeCarParkName(item.CarParkName),
        available: 0,
        occupied: 0,
        total: 0,
        serviceStatus: null,
        fullStatus: null,
        chargeStatus: null,
        rawDataTime: sourceUpdateTime,
      })
    }
    const group = groups.get(key)
    const spots = Array.isArray(item.SpotAvailabilities) ? item.SpotAvailabilities : []
    for (const spot of spots) {
      const status = Number(spot.SpotStatus)
      if (status === 1 || status === 2 || status === 3) group.total += 1
      if (status === 1 || status === 3) group.occupied += 1
      if (status === 2) group.available += 1
      if (spot.DataCollectTime) group.rawDataTime = spot.DataCollectTime
      if (spot.ServiceStatus != null) group.serviceStatus = spot.ServiceStatus
      if (spot.ChargeStatus != null) group.chargeStatus = spot.ChargeStatus
    }
  }
  return [...groups.values()].map((group) => {
    const total = Number(group.total || 0)
    const occupied = Number(group.occupied || 0)
    const available = Number(group.available || 0)
    const utilization = total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0
    const dataTime = group.rawDataTime || new Date().toISOString()
    return {
      carParkId: group.carParkId,
      name: group.name,
      available,
      total,
      occupied,
      utilization,
      serviceStatus: group.serviceStatus,
      fullStatus: group.fullStatus,
      chargeStatus: group.chargeStatus,
      rawUpdatedAt: taipeiDateTime(new Date(dataTime)),
      sampledAt: new Date(dataTime),
      remark: '由 TDX ParkingSpotAvailability 格位動態加總',
      sourceType: 'spot-availability',
    }
  }).filter((row) => row.carParkId && row.total > 0)
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

async function readCache(key) {
  const memory = memoryCache.get(key)
  if (memory) return memory
  try {
    const rows = await db.$queryRaw`
      SELECT payload, "fetchedAt"
      FROM parking_tdx_cache
      WHERE key = ${key}
      LIMIT 1
    `
    if (!rows.length) return null
    const cached = {
      payload: rows[0].payload,
      fetchedAt: new Date(rows[0].fetchedAt),
    }
    memoryCache.set(key, cached)
    return cached
  } catch {
    return null
  }
}

function isFreshCache(cached) {
  if (!cached?.fetchedAt) return false
  const hasItems = Array.isArray(cached.payload?.items) && cached.payload.items.length > 0
  const ttl = hasItems ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS
  return Date.now() - new Date(cached.fetchedAt).getTime() < ttl
}

async function writeCache(key, payload) {
  const fetchedAt = new Date()
  const payloadJson = JSON.stringify(payload)
  memoryCache.set(key, { payload, fetchedAt })
  await db.$executeRaw`
    INSERT INTO parking_tdx_cache (key, payload, "fetchedAt")
    VALUES (${key}, CAST(${payloadJson} AS JSONB), ${fetchedAt})
    ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, "fetchedAt" = EXCLUDED."fetchedAt"
  `
}

function isTdxRateLimitError(error) {
  return String(error?.message || '').includes('429')
}

async function fetchTdxAvailability({ skipCache = false } = {}) {
  const cached = await readCache(AVAILABILITY_CACHE_KEY)
  if (!skipCache && isFreshCache(cached)) return { ...cached.payload, fromCache: true }

  const token = await getTdxToken()
  const data = await fetchTdxJson(TDX_AVAILABILITY_URL, token)
  const items = Array.isArray(data.Items) ? data.Items : []
  const payload = {
    sourceUpdateTime: data.SrcUpdateTime || data.UpdateTime || null,
    count: Number(data.Count ?? items.length),
    rawItemsLength: items.length,
    endpoint: 'ParkingAvailability',
    items: items.map(normalizeAvailability).filter((row) => row.carParkId && row.total > 0),
  }
  await writeCache(AVAILABILITY_CACHE_KEY, payload)
  return payload
}

async function fetchTdxSpotAvailability({ skipCache = false } = {}) {
  const cached = await readCache(SPOT_AVAILABILITY_CACHE_KEY)
  if (!skipCache && isFreshCache(cached)) return { ...cached.payload, fromCache: true }

  const token = await getTdxToken()
  const data = await fetchTdxJson(TDX_SPOT_AVAILABILITY_URL, token)
  const items = Array.isArray(data.Items) ? data.Items : []
  const payload = {
    sourceUpdateTime: data.SrcUpdateTime || data.UpdateTime || null,
    count: Number(data.Count ?? items.length),
    rawItemsLength: items.length,
    endpoint: 'ParkingSpotAvailability',
    items: normalizeSpotAvailabilityGroups(items, data.SrcUpdateTime || data.UpdateTime || null),
  }
  await writeCache(SPOT_AVAILABILITY_CACHE_KEY, payload)
  return payload
}

async function fetchTdxCarParks({ skipCache = false } = {}) {
  const cached = await readCache(CARPARK_CACHE_KEY)
  if (!skipCache && isFreshCache(cached)) return { ...cached.payload, fromCache: true }

  const token = await getTdxToken()
  const data = await fetchTdxJson(TDX_CARPARK_URL, token)
  const items = Array.isArray(data.Items) ? data.Items : []
  const payload = {
    sourceUpdateTime: data.SrcUpdateTime || data.UpdateTime || null,
    count: Number(data.Count ?? items.length),
    items: items.map(normalizeStaticCarPark).filter((row) => row.carParkId),
  }
  await writeCache(CARPARK_CACHE_KEY, payload)
  return payload
}

async function fetchTdxParkingSpaces({ skipCache = false } = {}) {
  const cached = await readCache(PARKING_SPACE_CACHE_KEY)
  if (!skipCache && isFreshCache(cached)) return { ...cached.payload, fromCache: true }

  const token = await getTdxToken()
  const data = await fetchTdxJson(TDX_PARKING_SPACE_URL, token)
  const items = Array.isArray(data.Items) ? data.Items : []
  const payload = {
    sourceUpdateTime: data.SrcUpdateTime || data.UpdateTime || null,
    count: Number(data.Count ?? items.length),
    rawItemsLength: items.length,
    endpoint: 'ParkingSpace',
    items: items.map(normalizeParkingSpace).filter((row) => row.carParkId),
  }
  await writeCache(PARKING_SPACE_CACHE_KEY, payload)
  return payload
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

export async function GET(request) {
  try {
    await ensureParkingTables()
    const skipCache = request?.nextUrl?.searchParams?.get('refresh') === '1'

    let latest = null
    let saved = false
    let fetchError = null
    let availability = null
    let spotAvailability = null
    let carParks = null
    let parkingSpaces = null
    let carParkFetchError = null
    let spotFetchError = null
    let parkingSpaceFetchError = null
    let fallbackNotice = null

    try {
      availability = await fetchTdxAvailability({ skipCache })
      latest = selectPrimaryAvailability(availability.items)
      saved = await saveSnapshot(latest)
    } catch (error) {
      fetchError = error?.message || 'TDX 停車場剩餘格數抓取失敗'
      const cached = await readCache(AVAILABILITY_CACHE_KEY)
      if (cached?.payload) {
        availability = { ...cached.payload, fromCache: true, stale: true }
        latest = selectPrimaryAvailability(availability.items || [])
        fallbackNotice = 'TDX 目前回應 429 限流，暫時顯示上次成功抓取的快取資料。'
      }
    }

    if (!availability?.items?.length && !isTdxRateLimitError({ message: fetchError })) {
      try {
        spotAvailability = await fetchTdxSpotAvailability({ skipCache })
        if (spotAvailability.items?.length) {
          availability = spotAvailability
          latest = selectPrimaryAvailability(availability.items)
          saved = await saveSnapshot(latest)
        }
      } catch (error) {
        spotFetchError = error?.message || 'TDX 停車場格位動態抓取失敗'
        const cached = await readCache(SPOT_AVAILABILITY_CACHE_KEY)
        if (cached?.payload?.items?.length) {
          spotAvailability = { ...cached.payload, fromCache: true, stale: true }
          availability = spotAvailability
          latest = selectPrimaryAvailability(availability.items || [])
          fallbackNotice = fallbackNotice || 'TDX 目前無法取得最新剩餘格，暫時顯示上次成功抓取的格位動態快取。'
        }
      }
    }

    if (!availability?.items?.length && !isTdxRateLimitError({ message: fetchError })) {
      try {
        carParks = await fetchTdxCarParks({ skipCache })
      } catch (error) {
        carParkFetchError = error?.message || 'TDX 停車場基本資料抓取失敗'
        const cached = await readCache(CARPARK_CACHE_KEY)
        if (cached?.payload) {
          carParks = { ...cached.payload, fromCache: true, stale: true }
          fallbackNotice = fallbackNotice || 'TDX 目前無法取得最新資料，暫時顯示上次成功抓取的停車場清單快取。'
        }
      }
    }

    if (!availability?.items?.length && !carParks?.items?.length && !isTdxRateLimitError({ message: fetchError })) {
      try {
        parkingSpaces = await fetchTdxParkingSpaces({ skipCache })
      } catch (error) {
        parkingSpaceFetchError = error?.message || 'TDX 停車場車位數資料抓取失敗'
        const cached = await readCache(PARKING_SPACE_CACHE_KEY)
        if (cached?.payload) {
          parkingSpaces = { ...cached.payload, fromCache: true, stale: true }
          fallbackNotice = fallbackNotice || 'TDX 目前無法取得最新資料，暫時顯示上次成功抓取的車位數清單快取。'
        }
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
    const lots = availability?.items?.length ? availability.items : (carParks?.items?.length ? carParks.items : (parkingSpaces?.items || []))
    const dataStatus = availability?.items?.length
      ? 'live'
      : (carParks?.items?.length || parkingSpaces?.items?.length ? 'carpark-list-only' : 'empty')
    const notice = dataStatus === 'live'
      ? fallbackNotice
      : (dataStatus === 'carpark-list-only'
        ? (fallbackNotice || 'TDX 台中路外停車場剩餘位目前回傳 0 筆，已改顯示官方停車場清單/車位數資料供查詢 ID。')
        : (fallbackNotice || (isTdxRateLimitError({ message: fetchError })
          ? 'TDX 目前回應 429 限流，請稍後再更新；系統已避免連續重試，防止額度繼續被消耗。'
          : 'TDX 台中路外停車場剩餘位、格位動態、停車場清單與車位數資料目前都回傳 0 筆。')))

    return NextResponse.json({
      source: SOURCE,
      url: TDX_AVAILABILITY_URL,
      spotAvailabilityUrl: TDX_SPOT_AVAILABILITY_URL,
      carParkUrl: TDX_CARPARK_URL,
      parkingSpaceUrl: TDX_PARKING_SPACE_URL,
      saved,
      fetchError,
      spotFetchError,
      carParkFetchError,
      parkingSpaceFetchError,
      historyFetchError: null,
      latest: latestRow,
      daily: daily.sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
      timeline: timeline.slice(-2500).reverse(),
      lots,
      count: availability?.count || 0,
      carParkCount: carParks?.count || 0,
      parkingSpaceCount: parkingSpaces?.count || 0,
      dataStatus,
      notice,
      fromCache: Boolean(availability?.fromCache || carParks?.fromCache || parkingSpaces?.fromCache),
      cacheTtlSeconds: CACHE_TTL_MS / 1000,
      emptyCacheTtlSeconds: EMPTY_CACHE_TTL_MS / 1000,
      diagnostics: {
        availability: {
          endpoint: availability?.endpoint || 'ParkingAvailability',
          count: availability?.count || 0,
          rawItemsLength: availability?.rawItemsLength || 0,
          normalizedItemsLength: availability?.items?.length || 0,
          fromCache: Boolean(availability?.fromCache),
        },
        spotAvailability: {
          endpoint: spotAvailability?.endpoint || 'ParkingSpotAvailability',
          count: spotAvailability?.count || 0,
          rawItemsLength: spotAvailability?.rawItemsLength || 0,
          normalizedItemsLength: spotAvailability?.items?.length || 0,
          fromCache: Boolean(spotAvailability?.fromCache),
        },
        carParks: {
          endpoint: carParks?.endpoint || 'CarPark',
          count: carParks?.count || 0,
          rawItemsLength: carParks?.rawItemsLength || 0,
          normalizedItemsLength: carParks?.items?.length || 0,
          fromCache: Boolean(carParks?.fromCache),
        },
        parkingSpaces: {
          endpoint: parkingSpaces?.endpoint || 'ParkingSpace',
          count: parkingSpaces?.count || 0,
          rawItemsLength: parkingSpaces?.rawItemsLength || 0,
          normalizedItemsLength: parkingSpaces?.items?.length || 0,
          fromCache: Boolean(parkingSpaces?.fromCache),
        },
      },
      sourceUpdateTime: availability?.sourceUpdateTime || null,
    })
  } catch (error) {
    console.error('GET /api/parking/tdx error:', error)
    return NextResponse.json({ error: 'TDX 停車場剩餘格數讀取失敗', detail: error?.message }, { status: 500 })
  }
}
