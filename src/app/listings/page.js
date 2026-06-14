// src/app/listings/page.js
import Navbar from '@/components/layout/Navbar'
import PropertyGrid from '@/components/property/PropertyGrid'
import FilterBar from '@/components/search/FilterBar'
import { db } from '@/lib/db'

export const metadata = { title: '全部房源' }

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
    status:    'AVAILABLE',
    ...(city     && { city }),
    ...(district && { district }),
    ...(type     && { type }),
    ...(landlord && { ownerId: landlord }),
    price: {
      gte: Number(minPrice),
      lte: Number(maxPrice),
    },
    ...(tags && {
      tags: { some: { name: { in: tags.split(',') } } },
    }),
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
        owner:    { select: { id: true, name: true, siteName: true } },
        images:   { where: { isCover: true }, take: 1 },
        tags:     true,
      },
      orderBy: [{ boostPlan: 'desc' }, { featured: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
    db.property.count({ where }),
  ])

  return { properties, total, page: Number(page), totalPages: Math.ceil(total / limit) }
}

export default async function ListingsPage({ searchParams }) {
  const { properties, total, page, totalPages } = await getProperties(searchParams)

  const label = [searchParams.city, searchParams.district, searchParams.keyword]
    .filter(Boolean).join(' · ')

  return (
    <>
      <Navbar />
      <main className="section-wrap">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <h1 className="section-title-main">全部房源</h1>
            <p className="section-subtitle">
              {label ? `${label}：` : ''}共 {total} 筆房源
            </p>
          </div>
        </div>

        <FilterBar />
        <PropertyGrid properties={properties} />

        {/* 分頁 */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <a
                key={i}
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
                }}
              >
                {i + 1}
              </a>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
