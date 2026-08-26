// src/app/listings/page.js
import { Suspense } from 'react'
import Navbar from '@/components/layout/NavbarWrapper'
import Footer from '@/components/layout/Footer'
import MapListingsView from '@/components/property/MapListingsView'
import ListingsBackButton from '@/components/property/ListingsBackButton'
import MapFilterStrip from '@/components/search/MapFilterStrip'
import FilterBar from '@/components/search/FilterBar'
import SearchBar from '@/components/search/SearchBar'
import { db } from '@/lib/db'
import { attachAvailableFrom } from '@/lib/propertyReleaseDates'

const TYPE_LABELS = {
  SUITE: '套房',
  ROOM: '雅房',
  WHOLE_FLOOR: '整層住家',
  SHARED_SUITE: '分租套房',
  STUDIO: '獨立套房',
  STORE: '店面',
  OFFICE: '辦公',
  LIVE_OFFICE: '住辦',
  FACTORY: '廠房',
  PARKING: '車位',
  LAND: '土地',
  OTHER: '其他',
}

export const metadata = { title: '搜尋房源' }
export const dynamic = 'force-dynamic'

async function getProperties(searchParams) {
  const {
    city, district, keyword, type, landlord, tags,
    minPrice = 0, maxPrice = 999999,
  } = searchParams

  const limit = 600

  const where = {
    deletedAt: null,
    status: { in: ['AVAILABLE', 'COMING_SOON'] },
    ...(city && { city }),
    ...(district && { district: { in: district.split(',') } }),
    ...(type && { type: { in: type.split(',') } }),
    ...(landlord && { ownerId: landlord }),
    price: { gte: Number(minPrice), lte: Number(maxPrice) },
    ...(tags && { tags: { some: { name: { in: tags.split(',') } } } }),
    ...(keyword && {
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { city: { contains: keyword, mode: 'insensitive' } },
        { district: { contains: keyword, mode: 'insensitive' } },
        { address: { contains: keyword, mode: 'insensitive' } },
        { amenities: { some: { name: { contains: keyword, mode: 'insensitive' } } } },
        { tags: { some: { name: { contains: keyword, mode: 'insensitive' } } } },
      ],
    }),
  }

  const [properties, total] = await Promise.all([
    db.property.findMany({
      where,
      include: {
        landlord: { select: { id: true, name: true, handle: true, avatar: true, verified: true } },
        owner: { select: { id: true, name: true, siteName: true, avatar: true } },
        images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1 },
        tags: true,
      },
      orderBy: [{ boostPlan: 'desc' }, { featured: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    }),
    db.property.count({ where }),
  ])

  return {
    properties: await attachAvailableFrom(db, properties),
    total,
  }
}

function cleanList(value) {
  return String(value || '').split(',').filter(Boolean)
}

function resultTitle(searchParams) {
  const district = cleanList(searchParams.district)
  const area = district[0] || searchParams.city || searchParams.keyword || '全部地區'
  return `${area}的房源`
}

function resultLabel(searchParams) {
  const parts = [
    searchParams.city,
    cleanList(searchParams.district).join('、'),
    searchParams.keyword,
    cleanList(searchParams.type).map(type => TYPE_LABELS[type] || type).join('、'),
    priceLabel(searchParams),
  ].filter(Boolean)
  return parts.join(' · ') || '全部房源'
}

function priceLabel(searchParams) {
  const min = Number(searchParams.minPrice || 0)
  const max = Number(searchParams.maxPrice || 0)
  if (!min && !max) return ''
  if (min && max) return `NT$ ${min.toLocaleString()}-${max.toLocaleString()}`
  if (min) return `NT$ ${min.toLocaleString()} 以上`
  return `NT$ ${max.toLocaleString()} 以下`
}

function SearchControls({ searchParams, total }) {
  const hasFilters = resultLabel(searchParams) !== '全部房源'
  return (
    <>
      {/* 手機：維持原本的地區膠囊搜尋列（此版本僅改桌機） */}
      <div className="listings-topbar-mobile">
        <div className="merged-map-topbar">
          <ListingsBackButton />
          <details className="merged-control-card map-search-control">
            <summary className="map-area-pill">
              <span className="map-area-pill-content">
                <strong>{resultTitle(searchParams)}</strong>
                <span>{resultLabel(searchParams)}</span>
              </span>
            </summary>
            <div className="merged-control-body">
              <SearchBar initialParams={searchParams} />
            </div>
          </details>
          <span aria-hidden="true" />
        </div>
        <MapFilterStrip />
      </div>

      {/* 桌機：新版標頭（左＝搜尋膠囊，右＝篩選；皆為懸浮開合、不推擠版面） */}
      <div className="listings-hero-desktop">
        <div className="listings-hero">
          <ListingsBackButton />
          <details className="merged-control-card listings-search listings-popover">
            <summary className="listings-search-summary">
              <span className="listings-search-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              </span>
              <span className="listings-search-text">{hasFilters ? resultLabel(searchParams) : '搜尋社區、房號、租金…'}</span>
            </summary>
            <div className="merged-control-body listings-popover-panel">
              <SearchBar initialParams={searchParams} />
            </div>
          </details>
          <details className="merged-control-card listings-filter-toggle listings-popover listings-popover-right">
            <summary className="listings-filter-summary">
              <span className="listings-filter-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
              </span>
              <span>篩選</span>
            </summary>
            <div className="merged-control-body listings-popover-panel">
              <div className="listings-filter-quick">
                <MapFilterStrip showMoreFilter={false} />
              </div>
              <FilterBar />
            </div>
          </details>
        </div>
      </div>
    </>
  )
}

async function PropertiesSection({ searchParams }) {
  const { properties, total } = await getProperties(searchParams)

  return (
    <>
      <SearchControls searchParams={searchParams} total={total} />
      <MapListingsView properties={properties} total={total} />
    </>
  )
}

function PropertySkeleton() {
  // 骨架比照新版版面：桌機左清單／右地圖雙欄、平板與手機為清單堆疊，避免載入時版面跳動
  return (
    <div className="listings-skeleton" aria-hidden="true">
      <div className="listings-skeleton-list">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="listings-skeleton-card">
            <div className="listings-skeleton-thumb" />
            <div className="listings-skeleton-lines">
              <span /><span /><span />
            </div>
          </div>
        ))}
      </div>
      <div className="listings-skeleton-map" />
    </div>
  )
}

export default function ListingsPage({ searchParams }) {
  return (
    <>
      <Navbar />
      <main className="section-wrap listings-map-main">
        <Suspense fallback={<PropertySkeleton />}>
          <PropertiesSection searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
