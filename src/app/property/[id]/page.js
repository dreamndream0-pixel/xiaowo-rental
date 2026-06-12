// src/app/property/[id]/page.js
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Navbar from '@/components/layout/Navbar'
import PropertyDetail from '@/components/property/PropertyDetail'

export async function generateMetadata({ params }) {
  const property = await db.property.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { title: true, city: true, district: true, price: true },
  })
  if (!property) return { title: '找不到房源' }

  return {
    title: property.title,
    description: `${property.city}${property.district} | 月租 $${property.price.toLocaleString()} | 小蝸出租`,
  }
}

export default async function PropertyPage({ params }) {
  const property = await db.property.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      landlord: {
        select: {
          id: true, name: true, handle: true, avatar: true,
          verified: true, bio: true, avgRating: true,
          reviewCount: true, yearsActive: true, totalListings: true,
        },
      },
      images:    { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
      amenities: true,
    },
  })

  if (!property) notFound()

  // Increment view count
  db.property.update({ where: { id: params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  return (
    <>
      <Navbar />
      <PropertyDetail property={property} />
    </>
  )
}
