// src/app/site/[id]/page.js
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import LandlordSite from '@/components/landlord/LandlordSite'

export async function generateMetadata({ params }) {
  const landlord = await db.landlord.findUnique({
    where: { id: params.id },
    select: { name: true, siteName: true },
  })
  if (!landlord) return { title: '找不到此房東' }
  const title = landlord.siteName || `${landlord.name} 的租屋`
  return {
    title: `${title} | 小蝸出租`,
    description: `${title} — 提供優質房源`,
  }
}

export default async function LandlordSitePage({ params, searchParams }) {
  const landlord = await db.landlord.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, siteName: true, siteLogo: true, isActive: true },
  })

  if (!landlord || !landlord.isActive) notFound()

  // 檢查「個人官網」功能是否被停用（用 raw SQL 避免 Prisma client 未重新生成的問題）
  let siteEnabled = true
  try {
    const featRows = await db.$queryRawUnsafe(`SELECT features FROM landlords WHERE id = $1`, params.id)
    const rawFeatures = featRows[0]?.features
    console.log('[site page] landlordId:', params.id, 'raw features:', rawFeatures)
    const features = rawFeatures ? JSON.parse(rawFeatures) : {}
    console.log('[site page] parsed features.site:', features.site)
    if (features.site === false) siteEnabled = false
  } catch (e) {
    console.log('[site page] features read error:', e.message)
  }

  if (!siteEnabled) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--oat-light, #f9f7f3)', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🐌</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#3d3d3d', marginBottom: 12 }}>
            {landlord.siteName || landlord.name}
          </h1>
          <p style={{ fontSize: 15, color: '#888', lineHeight: 1.8 }}>
            此官網目前暫停使用<br />如有需要請直接聯絡房東
          </p>
        </div>
      </main>
    )
  }

  const {
    city, district, keyword,
    minPrice = 0, maxPrice = 999999,
    tags, type,
  } = searchParams || {}

  const where = {
    ownerId: landlord.id,
    status: 'AVAILABLE',
    deletedAt: null,
    ...(city && { city }),
    ...(district && { district }),
    ...(type && { type: { in: type.split(',') } }),
    ...(keyword && {
      OR: [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { address: { contains: keyword } },
      ],
    }),
    ...(tags && {
      tags: { some: { name: { in: tags.split(',') } } },
    }),
    price: { gte: Number(minPrice), lte: Number(maxPrice) },
  }

  const properties = await db.property.findMany({
    where,
    include: { images: { where: { isCover: true }, take: 1 }, tags: true },
    orderBy: [{ boostPlan: 'desc' }, { createdAt: 'desc' }],
  })

  const recommendations = await db.property.findMany({
    where: {
      ownerId: { not: landlord.id },
      status: 'AVAILABLE',
      deletedAt: null,
    },
    include: { images: { where: { isCover: true }, take: 1 } },
    orderBy: [{ boostPlan: 'desc' }, { createdAt: 'desc' }],
    take: 6,
  })

  return (
    <LandlordSite
      landlord={landlord}
      properties={properties}
      recommendations={recommendations}
      searchParams={searchParams || {}}
    />
  )
}
