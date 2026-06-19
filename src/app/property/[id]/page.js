// src/app/property/[id]/page.js
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Navbar from '@/components/layout/NavbarWrapper'
import LandlordSiteHeader from '@/components/landlord/LandlordSiteHeader'
import PropertyDetail from '@/components/property/PropertyDetail'

// ISR：60 秒快取，不用每次都打 DB
export const revalidate = 60

// React.cache：同一個 request 內 generateMetadata 和頁面共用同一次 DB 查詢
const getProperty = cache(async (id) => {
  const [property, communityRows] = await Promise.all([
    db.property.findFirst({
      where: { id, deletedAt: null },
      include: {
        landlord: {
          select: {
            id: true, name: true, handle: true, avatar: true,
            verified: true, bio: true, avgRating: true,
            reviewCount: true, yearsActive: true, totalListings: true,
            lineOfficialId: true,
          },
        },
        images:    { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        amenities: true,
        tags:      true,
        owner: {
          select: {
            id: true, name: true, siteName: true, siteLogo: true,
            isActive: true, lineChannelToken: true,
          },
        },
      },
    }),
    db.$queryRawUnsafe(
      `SELECT p."communityId", c.name as "communityName"
       FROM properties p
       LEFT JOIN communities c ON c.id = p."communityId"
       WHERE p.id = $1`, id
    ).catch(() => []),
  ])

  return { property, communityRows }
})

export async function generateMetadata({ params }) {
  const { property } = await getProperty(params.id)
  if (!property) return { title: '找不到房源' }
  return {
    title: property.title,
    description: `${property.city}${property.district} | 月租 $${property.price.toLocaleString()} | 小蝸出租`,
  }
}

export default async function PropertyPage({ params, searchParams }) {
  const { property, communityRows } = await getProperty(params.id)
  if (!property) notFound()

  // LINE Official Account ID
  let lineOfficialId = property.landlord?.lineOfficialId || null
  if (!lineOfficialId && property.owner?.lineChannelToken) {
    try {
      const res = await fetch('https://api.line.me/v2/bot/info', {
        headers: { Authorization: `Bearer ${property.owner.lineChannelToken}` },
        next: { revalidate: 3600 },
      })
      if (res.ok) {
        const info = await res.json()
        lineOfficialId = info.premiumId || info.basicId || null
        if (lineOfficialId) {
          db.landlord.update({
            where: { id: property.landlord.id },
            data: { lineOfficialId },
          }).catch(() => {})
        }
      }
    } catch (_) {}
  }

  // 瀏覽數累加（fire-and-forget）
  db.property.update({
    where: { id: params.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  const siteId = searchParams?.site
  const siteLandlord = siteId && property.owner?.id === siteId && property.owner.isActive
    ? property.owner : null

  const lineMessage = `您好，我想詢問房源：${property.title}`
  const lineUrl = lineOfficialId
    ? `https://line.me/R/oaMessage/${encodeURIComponent(lineOfficialId)}/?${encodeURIComponent(lineMessage)}`
    : null

  const { owner, ...safeProperty } = property
  safeProperty.ownerSiteName  = owner?.siteName || null
  safeProperty.ownerId        = owner?.id || null
  safeProperty.communityId    = communityRows[0]?.communityId   || null
  safeProperty.communityName  = communityRows[0]?.communityName || null

  return (
    <>
      {siteLandlord ? <LandlordSiteHeader landlord={siteLandlord} /> : <Navbar />}
      <PropertyDetail property={{ ...safeProperty, lineUrl }} />
    </>
  )
}
