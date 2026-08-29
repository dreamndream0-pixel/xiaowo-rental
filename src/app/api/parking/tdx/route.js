import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureParkingTables } from '@/lib/parking'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SOURCE = 'tdx-offstreet-taichung'
const AVAILABILITY_CACHE_KEY = `${SOURCE}:availability`
const FAVORITE_AVAILABILITY_CACHE_KEY = `${SOURCE}:favorite-availability`
const SPOT_AVAILABILITY_CACHE_KEY = `${SOURCE}:spot-availability`
const CARPARK_CACHE_KEY = `${SOURCE}:carparks`
const PARKING_SPACE_CACHE_KEY = `${SOURCE}:parking-spaces`
const RATE_LIMIT_CACHE_KEY = `${SOURCE}:rate-limit`
const MANUAL_REFRESH_CACHE_KEY = `${SOURCE}:manual-refresh`
const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000
// 佔用時間軸查詢的上限：只取最近 N 天、最多 M 筆，避免整表狂讀燒光 Supabase egress。
const TIMELINE_WINDOW_DAYS = 7
const TIMELINE_MAX_ROWS = 3000
const CACHE_TTL_MS = 60 * 1000
const FAVORITE_CACHE_TTL_MS = 60 * 1000
const EMPTY_CACHE_TTL_MS = 30 * 60 * 1000
const RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000
const MANUAL_REFRESH_COOLDOWN_MS = 10 * 60 * 1000
const PARSER_VERSION = 4
const TDX_PAGE_SIZE = 1000
const TDX_MAX_PAGES = 10
const TDX_TOKEN_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token'
const TDX_AVAILABILITY_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/ParkingAvailability/City/Taichung'
const TDX_SPOT_AVAILABILITY_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/ParkingSpotAvailability/City/Taichung'
const TDX_CARPARK_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/CarPark/City/Taichung'
const TDX_PARKING_SPACE_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/ParkingSpace/City/Taichung'
const TDX_AVAILABILITY_URL = buildTdxPageUrl(TDX_AVAILABILITY_BASE_URL)
const TDX_SPOT_AVAILABILITY_URL = buildTdxPageUrl(TDX_SPOT_AVAILABILITY_BASE_URL)
const TDX_CARPARK_URL = buildTdxPageUrl(TDX_CARPARK_BASE_URL)
const TDX_PARKING_SPACE_URL = buildTdxPageUrl(TDX_PARKING_SPACE_BASE_URL)

let cachedToken = null
let cachedTokenExpiresAt = 0
let memoryCache = new Map()

function buildTdxPageUrl(baseUrl, skip = 0) {
  const skipQuery = skip > 0 ? `&$skip=${skip}` : ''
  return `${baseUrl}?$top=${TDX_PAGE_SIZE}${skipQuery}&$format=JSON`
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

const CAR_SPACE_TYPES = new Set([1, 5, 6, 7, 8, 9, 11, 13, 15, 17, 19, 21, 23, 24, 25, 26, 27, 28, 29])
const MOTOR_SPACE_TYPES = new Set([2, 3, 10, 12, 14, 16, 18, 20, 22])

function summarizeSpaceTypes(rows) {
  const summary = {
    carAvailable: null,
    carTotal: null,
    carOccupied: null,
    motorAvailable: null,
    motorTotal: null,
    motorOccupied: null,
  }
  const totals = {
    carAvailable: 0,
    carTotal: 0,
    motorAvailable: 0,
    motorTotal: 0,
  }
  let hasCar = false
  let hasMotor = false
  let hasCarAvailable = false
  let hasMotorAvailable = false

  for (const row of rows || []) {
    const type = Number(row.SpaceType)
    const total = Number(row.NumberOfSpaces ?? 0)
    const available = Number(row.AvailableSpaces ?? -1)
    if (CAR_SPACE_TYPES.has(type)) {
      hasCar = true
      totals.carTotal += total
      if (available >= 0) {
        hasCarAvailable = true
        totals.carAvailable += available
      }
    }
    if (MOTOR_SPACE_TYPES.has(type)) {
      hasMotor = true
      totals.motorTotal += total
      if (available >= 0) {
        hasMotorAvailable = true
        totals.motorAvailable += available
      }
    }
  }

  if (hasCar) {
    summary.carTotal = totals.carTotal
    summary.carAvailable = hasCarAvailable ? totals.carAvailable : null
    summary.carOccupied = hasCarAvailable ? Math.max(0, totals.carTotal - totals.carAvailable) : null
  }
  if (hasMotor) {
    summary.motorTotal = totals.motorTotal
    summary.motorAvailable = hasMotorAvailable ? totals.motorAvailable : null
    summary.motorOccupied = hasMotorAvailable ? Math.max(0, totals.motorTotal - totals.motorAvailable) : null
  }
  return summary
}

function normalizeAvailability(item) {
  const total = Number(item.TotalSpaces ?? 0)
  const available = Number(item.AvailableSpaces ?? -1)
  const occupied = total > 0 && available >= 0 ? Math.max(0, total - available) : 0
  const utilization = total > 0 && available >= 0 ? Math.round((occupied / total) * 1000) / 10 : 0
  const dataTime = item.DataCollectTime || item.UpdateTime || item.SrcUpdateTime || new Date().toISOString()
  const detailRows = Array.isArray(item.Availabilities) && item.Availabilities.length
    ? item.Availabilities
    : (Array.isArray(item.AreaAvailabilities) ? item.AreaAvailabilities : [])
  const spaceSummary = summarizeSpaceTypes(detailRows)
  return {
    carParkId: item.CarParkID,
    name: normalizeCarParkName(item.CarParkName),
    available,
    total,
    occupied,
    utilization,
    ...spaceSummary,
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
  const spaceSummary = summarizeSpaceTypes(spaces)
  return {
    carParkId: item.CarParkID,
    name: normalizeCarParkName(item.CarParkName),
    available: null,
    total,
    occupied: null,
    utilization: null,
    ...spaceSummary,
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

function getTdxItems(data, ...keys) {
  for (const key of ['Items', ...keys]) {
    if (Array.isArray(data?.[key])) return data[key]
  }
  return []
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

async function fetchTdxPagedItems(baseUrl, token, ...itemKeys) {
  const items = []
  let sourceUpdateTime = null
  let count = 0
  let pagesFetched = 0

  for (let page = 0; page < TDX_MAX_PAGES; page += 1) {
    const skip = page * TDX_PAGE_SIZE
    const data = await fetchTdxJson(buildTdxPageUrl(baseUrl, skip), token)
    const pageItems = getTdxItems(data, ...itemKeys)
    pagesFetched += 1

    if (!sourceUpdateTime) sourceUpdateTime = data.SrcUpdateTime || data.UpdateTime || null
    count = Math.max(count, Number(data.Count ?? 0))
    items.push(...pageItems)

    if (pageItems.length < TDX_PAGE_SIZE) break
  }

  return {
    sourceUpdateTime,
    count: count || items.length,
    rawItemsLength: items.length,
    pagesFetched,
    items,
  }
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

function isFreshCache(cached, ttlMs = CACHE_TTL_MS) {
  if (!cached?.fetchedAt) return false
  if (cached.payload?.parserVersion !== PARSER_VERSION) return false
  const hasItems = Array.isArray(cached.payload?.items) && cached.payload.items.length > 0
  const ttl = hasItems ? ttlMs : EMPTY_CACHE_TTL_MS
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

async function readRateLimitCooldown() {
  const cached = await readCache(RATE_LIMIT_CACHE_KEY)
  const until = cached?.payload?.until ? new Date(cached.payload.until) : null
  if (!until || Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) return null
  return {
    until,
    message: cached.payload.message || `TDX 回應 429，已暫停自動刷新至 ${taipeiDateTime(until)}`,
  }
}

async function writeRateLimitCooldown() {
  const until = new Date(Date.now() + RATE_LIMIT_COOLDOWN_MS)
  const message = `TDX 回應 429，已暫停自動刷新至 ${taipeiDateTime(until)}`
  await writeCache(RATE_LIMIT_CACHE_KEY, { until: until.toISOString(), message, items: [{ status: 'rate-limited' }] })
  return { until, message }
}

async function assertNoRateLimitCooldown() {
  const cooldown = await readRateLimitCooldown()
  if (cooldown) throw new Error(cooldown.message)
}

async function readManualRefreshStatus() {
  const cached = await readCache(MANUAL_REFRESH_CACHE_KEY)
  const lastRefreshAt = cached?.payload?.lastRefreshAt ? new Date(cached.payload.lastRefreshAt) : null
  if (!lastRefreshAt || Number.isNaN(lastRefreshAt.getTime())) return { allowed: true, lastRefreshAt: null, nextAllowedAt: null, waitSeconds: 0 }

  const nextAllowedAt = new Date(lastRefreshAt.getTime() + MANUAL_REFRESH_COOLDOWN_MS)
  const waitSeconds = Math.max(0, Math.ceil((nextAllowedAt.getTime() - Date.now()) / 1000))
  return {
    allowed: waitSeconds <= 0,
    lastRefreshAt,
    nextAllowedAt,
    waitSeconds,
  }
}

async function writeManualRefreshStatus() {
  const now = new Date()
  await writeCache(MANUAL_REFRESH_CACHE_KEY, {
    parserVersion: PARSER_VERSION,
    lastRefreshAt: now.toISOString(),
    items: [{ status: 'manual-refresh' }],
  })
  return readManualRefreshStatus()
}

async function fetchTdxAvailability({ skipCache = false, cacheKey = AVAILABILITY_CACHE_KEY, cacheTtlMs = CACHE_TTL_MS } = {}) {
  const cached = await readCache(cacheKey)
  if (!skipCache && isFreshCache(cached, cacheTtlMs)) return { ...cached.payload, fromCache: true }

  await assertNoRateLimitCooldown()
  const token = await getTdxToken()
  let data
  try {
    data = await fetchTdxPagedItems(TDX_AVAILABILITY_BASE_URL, token, 'ParkingAvailabilities')
  } catch (error) {
    if (isTdxRateLimitError(error)) {
      const cooldown = await writeRateLimitCooldown()
      throw new Error(cooldown.message)
    }
    throw error
  }
  const items = data.items
  const payload = {
    parserVersion: PARSER_VERSION,
    sourceUpdateTime: data.sourceUpdateTime,
    count: Number(data.count ?? items.length),
    rawItemsLength: data.rawItemsLength,
    pagesFetched: data.pagesFetched,
    endpoint: 'ParkingAvailability',
    items: items.map(normalizeAvailability).filter((row) => row.carParkId && row.total > 0),
  }
  await writeCache(cacheKey, payload)
  return payload
}

async function fetchTdxSpotAvailability({ skipCache = false } = {}) {
  const cached = await readCache(SPOT_AVAILABILITY_CACHE_KEY)
  if (!skipCache && isFreshCache(cached)) return { ...cached.payload, fromCache: true }

  await assertNoRateLimitCooldown()
  const token = await getTdxToken()
  let data
  try {
    data = await fetchTdxPagedItems(TDX_SPOT_AVAILABILITY_BASE_URL, token, 'ParkingSpotAvailabilities')
  } catch (error) {
    if (isTdxRateLimitError(error)) {
      const cooldown = await writeRateLimitCooldown()
      throw new Error(cooldown.message)
    }
    throw error
  }
  const items = data.items
  const payload = {
    parserVersion: PARSER_VERSION,
    sourceUpdateTime: data.sourceUpdateTime,
    count: Number(data.count ?? items.length),
    rawItemsLength: data.rawItemsLength,
    pagesFetched: data.pagesFetched,
    endpoint: 'ParkingSpotAvailability',
    items: normalizeSpotAvailabilityGroups(items, data.sourceUpdateTime),
  }
  await writeCache(SPOT_AVAILABILITY_CACHE_KEY, payload)
  return payload
}

async function fetchTdxCarParks({ skipCache = false } = {}) {
  const cached = await readCache(CARPARK_CACHE_KEY)
  if (!skipCache && isFreshCache(cached)) return { ...cached.payload, fromCache: true }

  await assertNoRateLimitCooldown()
  const token = await getTdxToken()
  let data
  try {
    data = await fetchTdxPagedItems(TDX_CARPARK_BASE_URL, token, 'CarParks')
  } catch (error) {
    if (isTdxRateLimitError(error)) {
      const cooldown = await writeRateLimitCooldown()
      throw new Error(cooldown.message)
    }
    throw error
  }
  const items = data.items
  const payload = {
    parserVersion: PARSER_VERSION,
    sourceUpdateTime: data.sourceUpdateTime,
    count: Number(data.count ?? items.length),
    rawItemsLength: data.rawItemsLength,
    pagesFetched: data.pagesFetched,
    endpoint: 'CarPark',
    items: items.map(normalizeStaticCarPark).filter((row) => row.carParkId),
  }
  await writeCache(CARPARK_CACHE_KEY, payload)
  return payload
}

async function fetchTdxParkingSpaces({ skipCache = false } = {}) {
  const cached = await readCache(PARKING_SPACE_CACHE_KEY)
  if (!skipCache && isFreshCache(cached)) return { ...cached.payload, fromCache: true }

  await assertNoRateLimitCooldown()
  const token = await getTdxToken()
  let data
  try {
    data = await fetchTdxPagedItems(TDX_PARKING_SPACE_BASE_URL, token, 'ParkingSpaces')
  } catch (error) {
    if (isTdxRateLimitError(error)) {
      const cooldown = await writeRateLimitCooldown()
      throw new Error(cooldown.message)
    }
    throw error
  }
  const items = data.items
  const payload = {
    parserVersion: PARSER_VERSION,
    sourceUpdateTime: data.sourceUpdateTime,
    count: Number(data.count ?? items.length),
    rawItemsLength: data.rawItemsLength,
    pagesFetched: data.pagesFetched,
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

async function readFavorites() {
  try {
    return await db.$queryRaw`
      SELECT "carParkId", name, "createdAt"
      FROM parking_tdx_favorites
      ORDER BY "createdAt" ASC
    `
  } catch {
    return []
  }
}

function favoriteSource(carParkId) {
  return `${SOURCE}:${carParkId}`
}

function applyFavorites(items, favorites) {
  const favoriteIds = new Set((favorites || []).map((row) => String(row.carParkId)))
  if (!favoriteIds.size) return { tracked: items, hasFavorites: false }
  return {
    tracked: items.filter((row) => favoriteIds.has(String(row.carParkId))),
    hasFavorites: true,
  }
}

async function saveSnapshot(snapshot, source = SOURCE) {
  if (!snapshot) return false
  const rawUpdatedAt = `${snapshot.carParkId}:${snapshot.rawUpdatedAt}`
  const sampledAt = new Date().toISOString()
  const latest = await db.$queryRaw`
    SELECT id FROM parking_occupancy_snapshots
    WHERE source = ${source}
      AND "sampledAt" > NOW() - (${SNAPSHOT_INTERVAL_MS / 1000} * INTERVAL '1 second')
    ORDER BY "sampledAt" DESC
    LIMIT 1
  `
  if (latest.length) return false
  const carAvailable = snapshot.carAvailable ?? null
  const carTotal = snapshot.carTotal ?? null
  const carOccupied = snapshot.carOccupied ?? null
  const motorAvailable = snapshot.motorAvailable ?? null
  const motorTotal = snapshot.motorTotal ?? null
  const motorOccupied = snapshot.motorOccupied ?? null

  await db.$executeRaw`
    INSERT INTO parking_occupancy_snapshots
      (id, source, "sampledAt", "rawUpdatedAt", available, total, occupied, utilization, "carAvailable", "carTotal", "carOccupied", "motorAvailable", "motorTotal", "motorOccupied")
    VALUES
      (${crypto.randomUUID()}, ${source}, CAST(${sampledAt} AS TIMESTAMPTZ), ${rawUpdatedAt}, ${snapshot.available}, ${snapshot.total}, ${snapshot.occupied}, ${snapshot.utilization}, ${carAvailable}, ${carTotal}, ${carOccupied}, ${motorAvailable}, ${motorTotal}, ${motorOccupied})
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
      carAvailable: row.carAvailable,
      carTotal: row.carTotal,
      carOccupied: row.carOccupied,
      motorAvailable: row.motorAvailable,
      motorTotal: row.motorTotal,
      motorOccupied: row.motorOccupied,
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
    const wantsRefresh = request?.nextUrl?.searchParams?.get('refresh') === '1'
    const debug = request?.nextUrl?.searchParams?.get('debug') === '1'
    const selectedCarParkId = String(request?.nextUrl?.searchParams?.get('carParkId') || '').trim()
    const favorites = await readFavorites()
    let manualRefresh = await readManualRefreshStatus()
    const skipCache = wantsRefresh && manualRefresh.allowed
    let manualRefreshNotice = null
    if (wantsRefresh && !manualRefresh.allowed) {
      manualRefreshNotice = `TDX 手動更新每 10 分鐘一次，請 ${manualRefresh.waitSeconds} 秒後再更新。`
    }

    let latest = null
    let saved = false
    let fetchError = null
    let availability = null
    let listAvailability = null
    let spotAvailability = null
    let carParks = null
    let parkingSpaces = null
    let carParkFetchError = null
    let spotFetchError = null
    let parkingSpaceFetchError = null
    let fallbackNotice = null

    try {
      listAvailability = await fetchTdxAvailability({
        skipCache,
        cacheKey: AVAILABILITY_CACHE_KEY,
        cacheTtlMs: CACHE_TTL_MS,
      })
      if (favorites.length && skipCache) {
        availability = listAvailability
        await writeCache(FAVORITE_AVAILABILITY_CACHE_KEY, listAvailability)
      } else {
        availability = favorites.length
          ? await fetchTdxAvailability({
              skipCache: false,
              cacheKey: FAVORITE_AVAILABILITY_CACHE_KEY,
              cacheTtlMs: FAVORITE_CACHE_TTL_MS,
            })
          : listAvailability
      }
      if (wantsRefresh && skipCache && !availability.fromCache) manualRefresh = await writeManualRefreshStatus()
      const { tracked } = applyFavorites(availability.items || [], favorites)
      latest = selectedCarParkId
        ? (tracked.find((row) => String(row.carParkId) === selectedCarParkId) || listAvailability.items?.find((row) => String(row.carParkId) === selectedCarParkId) || null)
        : (favorites.length ? (tracked[0] || null) : selectPrimaryAvailability(availability.items))
      const snapshots = favorites.length ? tracked : (latest ? [latest] : [])
      const results = await Promise.all(snapshots.map((snapshot) => saveSnapshot(snapshot, favoriteSource(snapshot.carParkId))))
      saved = results.some(Boolean)
    } catch (error) {
      fetchError = error?.message || 'TDX 停車場剩餘格數抓取失敗'
      const cached = await readCache(favorites.length ? FAVORITE_AVAILABILITY_CACHE_KEY : AVAILABILITY_CACHE_KEY)
      if (cached?.payload) {
        availability = { ...cached.payload, fromCache: true, stale: true }
        listAvailability = listAvailability || availability
        const { tracked } = applyFavorites(availability.items || [], favorites)
        latest = selectedCarParkId
          ? (tracked.find((row) => String(row.carParkId) === selectedCarParkId) || listAvailability.items?.find((row) => String(row.carParkId) === selectedCarParkId) || null)
          : (favorites.length ? (tracked[0] || null) : selectPrimaryAvailability(availability.items || []))
        const snapshots = favorites.length ? tracked : (latest ? [latest] : [])
        const results = await Promise.all(snapshots.map((snapshot) => saveSnapshot(snapshot, favoriteSource(snapshot.carParkId))))
        saved = results.some(Boolean)
        fallbackNotice = 'TDX 目前回應 429 限流，暫時顯示上次成功抓取的快取資料。'
      }
    }

    if (debug && !availability?.items?.length && !isTdxRateLimitError({ message: fetchError })) {
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

    const timelineCarParkId = selectedCarParkId || latest?.carParkId || ''
    const timelineSource = timelineCarParkId ? favoriteSource(timelineCarParkId) : SOURCE
    // 只取最近 TIMELINE_WINDOW_DAYS 天、最多 TIMELINE_MAX_ROWS 筆（取最新的再反轉成由舊到新），
    // 避免整表撈出（此表會持續成長）。走 (source, "sampledAt") 索引，速度快、egress 有上限。
    const recentRows = await db.$queryRaw`
      SELECT "sampledAt", "rawUpdatedAt", available, total, occupied, utilization, "carAvailable", "carTotal", "carOccupied", "motorAvailable", "motorTotal", "motorOccupied"
      FROM parking_occupancy_snapshots
      WHERE source = ${timelineSource}
        AND "sampledAt" >= NOW() - (${TIMELINE_WINDOW_DAYS} * INTERVAL '1 day')
      ORDER BY "sampledAt" DESC
      LIMIT ${TIMELINE_MAX_ROWS}
    `
    const rows = recentRows.slice().reverse()
    const timeline = buildTimeline(rows)
    const latestRow = latest
      ? { ...latest, entries: 0, exits: 0, anomaly: false }
      : (timeline[timeline.length - 1] || null)
    const daily = summarizeTimeline(timeline)
    const candidateSource = listAvailability?.items?.length ? listAvailability : availability
    const candidates = candidateSource?.items?.length ? candidateSource.items : (carParks?.items?.length ? carParks.items : (parkingSpaces?.items || []))
    const { tracked: trackedLots, hasFavorites } = applyFavorites(candidates, favorites)
    const lots = hasFavorites ? trackedLots : candidates
    const dataStatus = availability?.items?.length
      ? 'live'
      : (carParks?.items?.length || parkingSpaces?.items?.length ? 'carpark-list-only' : 'empty')
    const notice = dataStatus === 'live'
      ? (manualRefreshNotice || fallbackNotice)
      : (dataStatus === 'carpark-list-only'
        ? (manualRefreshNotice || fallbackNotice || 'TDX 台中路外停車場剩餘位目前回傳 0 筆，已改顯示官方停車場清單/車位數資料供查詢 ID。')
        : (manualRefreshNotice || fallbackNotice || (isTdxRateLimitError({ message: fetchError })
          ? 'TDX 目前回應 429 限流，請稍後再更新；系統已避免連續重試，防止額度繼續被消耗。'
          : 'TDX 台中路外停車場剩餘位、停車場清單與車位數資料目前都回傳 0 筆。')))

    return NextResponse.json({
      source: SOURCE,
      checkedAt: new Date().toISOString(),
      url: TDX_AVAILABILITY_URL,
      spotAvailabilityUrl: TDX_SPOT_AVAILABILITY_URL,
      carParkUrl: TDX_CARPARK_URL,
      parkingSpaceUrl: TDX_PARKING_SPACE_URL,
      saved,
      fetchError,
      spotFetchError: debug ? spotFetchError : null,
      carParkFetchError,
      parkingSpaceFetchError,
      historyFetchError: null,
      latest: latestRow,
      daily: daily.sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
      timeline: timeline.slice(-2500).reverse(),
      lots,
      candidates,
      favorites,
      trackedOnly: hasFavorites,
      timelineCarParkId,
      manualRefresh: {
        allowed: manualRefresh.allowed,
        waitSeconds: manualRefresh.waitSeconds,
        lastRefreshAt: manualRefresh.lastRefreshAt?.toISOString?.() || null,
        nextAllowedAt: manualRefresh.nextAllowedAt?.toISOString?.() || null,
        cooldownSeconds: MANUAL_REFRESH_COOLDOWN_MS / 1000,
      },
      count: availability?.count || 0,
      carParkCount: carParks?.count || 0,
      parkingSpaceCount: parkingSpaces?.count || 0,
      dataStatus,
      notice,
      fromCache: Boolean(availability?.fromCache || carParks?.fromCache || parkingSpaces?.fromCache),
      cacheTtlSeconds: CACHE_TTL_MS / 1000,
      favoriteCacheTtlSeconds: FAVORITE_CACHE_TTL_MS / 1000,
      manualRefreshCooldownSeconds: MANUAL_REFRESH_COOLDOWN_MS / 1000,
      emptyCacheTtlSeconds: EMPTY_CACHE_TTL_MS / 1000,
      diagnostics: {
        availability: {
          endpoint: availability?.endpoint || 'ParkingAvailability',
          count: availability?.count || 0,
          rawItemsLength: availability?.rawItemsLength || 0,
          normalizedItemsLength: availability?.items?.length || 0,
          pagesFetched: availability?.pagesFetched || 0,
          fromCache: Boolean(availability?.fromCache),
        },
        ...(debug ? { spotAvailability: {
          endpoint: spotAvailability?.endpoint || 'ParkingSpotAvailability',
          count: spotAvailability?.count || 0,
          rawItemsLength: spotAvailability?.rawItemsLength || 0,
          normalizedItemsLength: spotAvailability?.items?.length || 0,
          pagesFetched: spotAvailability?.pagesFetched || 0,
          fromCache: Boolean(spotAvailability?.fromCache),
        } } : {}),
        carParks: {
          endpoint: carParks?.endpoint || 'CarPark',
          count: carParks?.count || 0,
          rawItemsLength: carParks?.rawItemsLength || 0,
          normalizedItemsLength: carParks?.items?.length || 0,
          pagesFetched: carParks?.pagesFetched || 0,
          fromCache: Boolean(carParks?.fromCache),
        },
        parkingSpaces: {
          endpoint: parkingSpaces?.endpoint || 'ParkingSpace',
          count: parkingSpaces?.count || 0,
          rawItemsLength: parkingSpaces?.rawItemsLength || 0,
          normalizedItemsLength: parkingSpaces?.items?.length || 0,
          pagesFetched: parkingSpaces?.pagesFetched || 0,
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
