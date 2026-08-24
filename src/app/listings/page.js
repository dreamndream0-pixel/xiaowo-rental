// src/app/listings/page.js
import { Suspense } from 'react'
import Navbar from '@/components/layout/NavbarWrapper'
import Footer from '@/components/layout/Footer'
import MapListingsView from '@/components/property/MapListingsView'
import ListingsBackButton from '@/components/property/ListingsBackButton'
import MapFilterStrip from '@/components/search/MapFilterStrip'
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
  return (
    <>
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
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)', background: 'white',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ height: 190, background: 'var(--oat-mid)' }} />
          <div style={{ padding: '16px 18px 18px' }}>
            <div style={{ height: 28, background: 'var(--oat-mid)', borderRadius: 6, marginBottom: 10, width: '60%' }} />
            <div style={{ height: 18, background: 'var(--oat-mid)', borderRadius: 6, marginBottom: 6, width: '80%' }} />
            <div style={{ height: 14, background: 'var(--oat-mid)', borderRadius: 6, width: '50%' }} />
          </div>
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
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
