// src/app/landlord/[id]/page.js
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import LandlordSite from '@/components/landlord/LandlordSite'

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
  const where = {
    ownerId: landlord.id,
    status: 'AVAILABLE',
    deletedAt: null,
    ...(city && { city }),
    ...(district && { district }),
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

  // 該房東的房源
  const properties = await db.property.findMany({
    where,
    include: { images: { where: { isCover: true }, take: 1 }, tags: true, amenities: true },
    orderBy: [{ boostPlan: 'desc' }, { createdAt: 'desc' }],
  })

  // 其他房東的推薦房源（排除自己，最多 6 間）
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
