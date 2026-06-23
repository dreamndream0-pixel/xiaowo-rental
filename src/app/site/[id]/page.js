// src/app/site/[id]/page.js
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import LandlordSite from '@/components/landlord/LandlordSite'
import { attachAvailableFrom } from '@/lib/propertyReleaseDates'

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

  // 一次讀取 features（raw SQL，避免 Prisma client 未重新生成的問題）
  // 同時用於：個人官網開關檢查 + 首頁輪播圖 siteSlides
  let siteEnabled = true
  let siteSlides = []
  try {
    const featRows = await db.$queryRawUnsafe(`SELECT features FROM landlords WHERE id = $1`, params.id)
    const features = featRows[0]?.features ? JSON.parse(featRows[0].features) : {}
    if (features.site === false) siteEnabled = false
    if (Array.isArray(features.siteSlides)) siteSlides = features.siteSlides
  } catch (_) {}

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

  // 是否啟用搜尋/篩選；沒有的話＝首頁，只顯示精選房源
  const hasSearch = !!(
    city || district || keyword || type || tags ||
    Number(minPrice) > 0 || Number(maxPrice) < 999999
  )

  const baseWhere = {
    ownerId: landlord.id,
    status: { in: ['AVAILABLE', 'COMING_SOON'] },
    deletedAt: null,
    ...(city && { city }),
    ...(district && { district: { in: district.split(',') } }),
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

  const include = { images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1 }, tags: true }
  const orderBy = [{ boostPlan: 'desc' }, { createdAt: 'desc' }]

  // 精選首頁放寬狀態：房東勾選的精選房（含「已出租」當招牌）也要顯示，
  // 仍排除審核中/已下架/退回等不該公開的狀態。
  const featuredWhere = {
    ...baseWhere,
    status: { in: ['AVAILABLE', 'COMING_SOON', 'RENTED'] },
    siteFeatured: true,
  }

  // 房東官網只查詢該房東自己的房源；首頁無搜尋時優先顯示官網精選。
  const rawProps = await db.property.findMany({
    where: hasSearch ? baseWhere : featuredWhere,
    include,
    orderBy,
  })

  // 首頁但房東尚未勾選任何精選房源 → 退回顯示全部可租，避免首頁空白
  let properties = await attachAvailableFrom(db, rawProps)
  const featuredMode = !hasSearch && rawProps.length > 0
  if (!hasSearch && rawProps.length === 0) {
    properties = await attachAvailableFrom(db, await db.property.findMany({ where: baseWhere, include, orderBy }))
  }

  return (
    <LandlordSite
      landlord={landlord}
      properties={properties}
      recommendations={[]}
      searchParams={searchParams || {}}
      siteSlides={siteSlides}
      featuredMode={featuredMode}
    />
  )
}
