// src/app/property/[id]/page.js
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Navbar from '@/components/layout/Navbar'
import LandlordSiteHeader from '@/components/landlord/LandlordSiteHeader'
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

export default async function PropertyPage({ params, searchParams }) {
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
      owner: {
        select: {
          id: true, name: true, siteName: true, siteLogo: true, isActive: true,
          lineOfficialId: true, lineChannelToken: true,
        },
      },
    },
  })

  if (!property) notFound()
  const siteId = searchParams?.site
  const siteLandlord = siteId && property.owner?.id === siteId && property.owner.isActive
    ? property.owner
    : null
  let lineOfficialId = property.owner?.lineOfficialId || null
  if (!lineOfficialId && property.owner?.lineChannelToken) {
    try {
      const botInfoRes = await fetch('https://api.line.me/v2/bot/info', {
        headers: { Authorization: `Bearer ${property.owner.lineChannelToken}` },
        cache: 'no-store',
      })
      if (botInfoRes.ok) {
        const botInfo = await botInfoRes.json()
        lineOfficialId = botInfo.premiumId || botInfo.basicId || null
        if (lineOfficialId) {
          await db.landlord.update({
            where: { id: property.owner.id },
            data: { lineOfficialId },
          })
        }
      }
    } catch (_) {}
  }
  const lineMessage = `您好，我想詢問房源：${property.title}`
  const lineUrl = lineOfficialId
    ? `https://line.me/R/oaMessage/${encodeURIComponent(lineOfficialId)}/?${encodeURIComponent(lineMessage)}`
    : null
  const { owner, ...safeProperty } = property

  // Increment view count
  db.property.update({ where: { id: params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  return (
    <>
      {siteLandlord ? <LandlordSiteHeader landlord={siteLandlord} /> : <Navbar />}
      <PropertyDetail property={{ ...safeProperty, lineUrl }} />
    </>
  )
}
