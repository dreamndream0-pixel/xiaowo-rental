// src/app/site/[id]/page.js
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { ensureMigrations } from '@/lib/migrations'
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
  await ensureMigrations().catch(()=>{})
  const landlord = await db.landlord.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, siteName: true, siteLogo: true, isActive: true },
  })

  if (!landlord || !landlord.isActive) notFound()

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
