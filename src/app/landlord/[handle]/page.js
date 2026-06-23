// src/app/landlord/[id]/page.js
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import LandlordSite from '@/components/landlord/LandlordSite'
import { attachAvailableFrom } from '@/lib/propertyReleaseDates'

export async function generateMetadata({ params }) {
  const user = await db.user.findUnique({
    where: { handle: params.handle },
    select: { name: true },
  })
  if (!user) return { title: '找不到此房東' }
  return {
    title: `${user.name} 的房源 | 小蝸出租`,
    description: `${user.name} — 提供優質房源`,
  }
}

export default async function LandlordSitePage({ params, searchParams }) {
  const user = await db.user.findUnique({
    where: { handle: params.handle },
    select: { id: true, name: true, avatar: true },
  })
  if (!user) notFound()

  // 找到這個 User 作為 landlord 的 Landlord 實體（透過 Property.landlordId）
  const firstProp = await db.property.findFirst({
    where: { landlordId: user.id, deletedAt: null, owner: { isActive: true } },
    select: { owner: { select: { id: true, name: true, siteName: true, siteLogo: true, isActive: true } } },
  })
  const landlord = firstProp?.owner

  if (!landlord || !landlord.isActive) notFound()

  // 搜尋條件
  const { city, district, keyword, minPrice = 0, maxPrice = 999999, tags } = searchParams || {}
  // 是否啟用搜尋/篩選；沒有的話＝首頁，只顯示精選房源
  const hasSearch = !!(
    city || district || keyword || tags ||
    Number(minPrice) > 0 || Number(maxPrice) < 999999
  )

  const baseWhere = {
    ownerId: landlord.id,
    status: { in: ['AVAILABLE', 'COMING_SOON'] },
    deletedAt: null,
    ...(city && { city }),
    ...(district && { district: { in: district.split(',') } }),
    ...(keyword && {
      OR: [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { city: { contains: keyword } },
        { district: { contains: keyword } },
        { address: { contains: keyword } },
        { amenities: { some: { name: { contains: keyword } } } },
        { tags: { some: { name: { contains: keyword } } } },
      ],
    }),
    ...(tags && {
      tags: { some: { name: { in: tags.split(',') } } },
    }),
    price: { gte: Number(minPrice), lte: Number(maxPrice) },
  }

  const include = { images: { where: { isCover: true }, take: 1 }, tags: true, amenities: true }
  const orderBy = [{ boostPlan: 'desc' }, { createdAt: 'desc' }]

  // 該房東的房源；首頁（無搜尋）只顯示精選
  let properties = await db.property.findMany({
    where: hasSearch ? baseWhere : { ...baseWhere, siteFeatured: true },
    include,
    orderBy,
  })
  properties = await attachAvailableFrom(db, properties)
  const featuredMode = !hasSearch && properties.length > 0
  // 首頁但尚未勾選精選 → 退回顯示全部可租，避免首頁空白
  if (!hasSearch && properties.length === 0) {
    properties = await attachAvailableFrom(db, await db.property.findMany({ where: baseWhere, include, orderBy }))
  }

  return (
    <LandlordSite
      landlord={landlord}
      properties={properties}
      recommendations={[]}
      searchParams={searchParams || {}}
      featuredMode={featuredMode}
    />
  )
}
