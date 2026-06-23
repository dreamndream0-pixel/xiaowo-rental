// src/app/listings/page.js
import { Suspense } from 'react'
import Navbar from '@/components/layout/NavbarWrapper'
import Footer from '@/components/layout/Footer'
import PropertyGrid from '@/components/property/PropertyGrid'
import FilterBar from '@/components/search/FilterBar'
import SearchBar from '@/components/search/SearchBar'
import { db } from '@/lib/db'
import { attachAvailableFrom } from '@/lib/propertyReleaseDates'

export const metadata = { title: '全部房源' }
export const dynamic = 'force-dynamic'

async function getProperties(searchParams) {
  const {
    city, district, keyword, type, landlord, tags,
    minPrice = 0, maxPrice = 999999,
    page = 1,
  } = searchParams

  const limit  = 20
  const offset = (Number(page) - 1) * limit

  const where = {
    deletedAt: null,
    status:    { in: ['AVAILABLE', 'COMING_SOON'] },
    ...(city     && { city }),
    ...(district && { district: { in: district.split(',') } }),
    ...(type     && { type: { in: type.split(',') } }),
    ...(landlord && { ownerId: landlord }),
    price: { gte: Number(minPrice), lte: Number(maxPrice) },
    ...(tags && { tags: { some: { name: { in: tags.split(',') } } } }),
    ...(keyword && {
      OR: [
        { title:       { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { city:        { contains: keyword, mode: 'insensitive' } },
        { district:    { contains: keyword, mode: 'insensitive' } },
        { address:     { contains: keyword, mode: 'insensitive' } },
        { amenities:   { some: { name: { contains: keyword, mode: 'insensitive' } } } },
        { tags:        { some: { name: { contains: keyword, mode: 'insensitive' } } } },
      ],
    }),
  }

  const [properties, total] = await Promise.all([
    db.property.findMany({
      where,
      include: {
        landlord: { select: { id: true, name: true, handle: true, avatar: true, verified: true } },
        owner:    { select: { id: true, name: true, siteName: true, avatar: true } },
        images:   { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1 },
        tags:     true,
      },
      orderBy: [{ boostPlan: 'desc' }, { featured: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
    db.property.count({ where }),
  ])

  return { properties: await attachAvailableFrom(db, properties), total, page: Number(page), totalPages: Math.ceil(total / limit) }
}

// 房源列表（非同步，Suspense 串流）
async function PropertiesSection({ searchParams }) {
  const { properties, total, page, totalPages } = await getProperties(searchParams)
  const hasSearch = !!(
    searchParams.city || searchParams.district || searchParams.keyword ||
    searchParams.type || searchParams.tags ||
    Number(searchParams.minPrice) > 0 || Number(searchParams.maxPrice) < 999999
  )
  const label = [searchParams.city, searchParams.district?.replace(/,/g, '、'), searchParams.keyword]
    .filter(Boolean).join(' · ')

  return (
    <>
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h1 className="section-title-main">{hasSearch ? '搜尋房源' : '全部房源'}</h1>
          <span style={{ fontSize: 13, color: 'var(--gray-light)', fontFamily: 'Montserrat,sans-serif' }}>
            {label ? `${label}・` : ''}共 {total} 筆
          </span>
        </div>
      </div>
      <PropertyGrid properties={properties} />
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <a key={i}
              href={`/listings?page=${i + 1}&${new URLSearchParams({
                ...(searchParams.city     && { city: searchParams.city }),
                ...(searchParams.district && { district: searchParams.district }),
                ...(searchParams.keyword  && { keyword: searchParams.keyword }),
                ...(searchParams.type     && { type: searchParams.type }),
              }).toString()}`}
              style={{
                padding: '8px 16px', borderRadius: 12,
                background: i + 1 === page ? 'var(--sage)' : 'white',
                color: i + 1 === page ? 'white' : 'var(--gray-mid)',
                border: '1.5px solid var(--oat-mid)',
                fontWeight: i + 1 === page ? 700 : 400,
              }}>{i + 1}</a>
          ))}
        </div>
      )}
    </>
  )
}

// 讀取中骨架
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
          <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--oat-mid)', paddingTop: 12 }}>
            <div style={{ height: 14, background: 'var(--oat-mid)', borderRadius: 6, width: '40%' }} />
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
      <main className="section-wrap">
        <div style={{ marginBottom: 20 }}>
          <SearchBar initialParams={searchParams} />
        </div>
        <FilterBar />

        {/* Suspense：搜尋欄瞬間顯示，房源卡串流載入 */}
        <Suspense fallback={<PropertySkeleton />}>
          <PropertiesSection searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
