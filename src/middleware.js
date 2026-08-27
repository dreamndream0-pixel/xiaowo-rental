import { NextResponse } from 'next/server'

const WINDOW_MS = 60_000
const MAX_BUCKETS = 5000
const buckets = new Map()

const SCRAPER_UA =
  /(aiohttp|curl|go-http-client|headlesschrome|httpclient|httpunit|java\/|libwww-perl|okhttp|phantomjs|python-requests|scrapy|wget)/i

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.ip || 'unknown'
}

function isApiPath(pathname) {
  return pathname.startsWith('/api/')
}

function limitFor(pathname) {
  if (pathname.startsWith('/api/properties')) return 60
  if (isApiPath(pathname)) return 90
  return 120
}

function pruneBuckets(now) {
  if (buckets.size < MAX_BUCKETS) return

  for (const [key, value] of buckets) {
    if (value.resetAt <= now) buckets.delete(key)
  }

  if (buckets.size <= MAX_BUCKETS) return

  const targetSize = Math.floor(MAX_BUCKETS * 0.8)
  for (const key of buckets.keys()) {
    buckets.delete(key)
    if (buckets.size <= targetSize) break
  }
}

function hitLimit(request, pathname) {
  const now = Date.now()
  pruneBuckets(now)

  const ip = getClientIp(request)
  const scope = isApiPath(pathname) ? 'api' : 'page'
  const key = `${scope}:${ip}`
  const max = limitFor(pathname)
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: max - 1, resetAt: now + WINDOW_MS }
  }

  current.count += 1
  buckets.set(key, current)

  return {
    allowed: current.count <= max,
    remaining: Math.max(max - current.count, 0),
    resetAt: current.resetAt,
  }
}

function withHeaders(response, pathname, limitState) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')

  if (isApiPath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  }

  if (limitState) {
    response.headers.set('X-RateLimit-Remaining', String(limitState.remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(limitState.resetAt / 1000)))
  }

  return response
}

function blockedResponse(pathname) {
  const response = isApiPath(pathname)
    ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    : new NextResponse('Forbidden', { status: 403 })

  return withHeaders(response, pathname)
}

function rateLimitResponse(pathname, limitState) {
  const retryAfter = Math.max(Math.ceil((limitState.resetAt - Date.now()) / 1000), 1)
  const response = isApiPath(pathname)
    ? NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    : new NextResponse('Too many requests', { status: 429 })

  response.headers.set('Retry-After', String(retryAfter))
  return withHeaders(response, pathname, limitState)
}

export function middleware(request) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''

  if (SCRAPER_UA.test(userAgent)) {
    return blockedResponse(pathname)
  }

  const limitState = hitLimit(request, pathname)
  if (!limitState.allowed) {
    return rateLimitResponse(pathname, limitState)
  }

  return withHeaders(NextResponse.next(), pathname, limitState)
}

export const config = {
  matcher: [
    '/listings',
    '/property/:path*',
    '/api/properties/:path*',
    '/api/tags',
    '/api/bookings/:path*',
  ],
}
