// src/app/property/[id]/page.js
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { cache } from 'react'
import Navbar from '@/components/layout/NavbarWrapper'
import Footer from '@/components/layout/Footer'
import LandlordSiteHeader from '@/components/landlord/LandlordSiteHeader'
import PropertyDetail from '@/components/property/PropertyDetail'

// React.cache：同一 request 內 generateMetadata 和頁面只打一次 DB
const getProperty = cache(async (id) => {
  const [property, communityRows] = await Promise.all([
    db.property.findFirst({
      where: { id, deletedAt: null },
      include: {
        landlord: {
          // landlord → User model（沒有 lineOfficialId，那在 Landlord/owner model）
          select: {
            id: true, name: true, handle: true, avatar: true,
            verified: true, bio: true, avgRating: true,
            reviewCount: true, yearsActive: true, totalListings: true,
            // Real property count by this user
            _count: { select: { properties: { where: { deletedAt: null } } } },
          },
        },
        images:    { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        amenities: true,
        tags:      true,
        owner: {
          // owner → Landlord model（有 lineOfficialId、lineChannelToken）
          select: {
            id: true, name: true, siteName: true, siteLogo: true,
            isActive: true, lineChannelToken: true, lineOfficialId: true,
            _count: { select: { properties: true } },
          },
        },
      },
    }),
    db.$queryRawUnsafe(
      `SELECT p."communityId", c.name as "communityName"
       FROM properties p
       LEFT JOIN communities c ON c.id = p."communityId"
       WHERE p.id = $1`, id
    ).catch(() => []),  // communities 表不存在時不影響主查詢
  ])
  return { property: property ?? null, communityRows: communityRows ?? [] }
})

export async function generateMetadata({ params }) {
  const { property } = await getProperty(params.id)
  if (!property) return { title: '找不到房源' }
  const coverUrl = property.images?.find(i => i.isCover)?.url ?? property.images?.[0]?.url ?? null
  const title = property.title
  const description = `${property.city}${property.district} | 月租 $${property.price?.toLocaleString()} | 小蝸出租`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://xiaowo-rental.vercel.app/property/${params.id}`,
      siteName: '小蝸出租',
      ...(coverUrl && { images: [{ url: coverUrl, width: 1200, height: 630, alt: title }] }),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(coverUrl && { images: [coverUrl] }),
    },
  }
}

export default async function PropertyPage({ params, searchParams }) {
  const { property, communityRows } = await getProperty(params.id)
  if (!property) notFound()

  // LINE Official Account ID 在 Landlord（owner）model，不在 User（landlord）model
  let lineOfficialId = property.owner?.lineOfficialId || null
  if (!lineOfficialId && property.owner?.lineChannelToken) {
    try {
      const res = await fetch('https://api.line.me/v2/bot/info', {
        headers: { Authorization: `Bearer ${property.owner.lineChannelToken}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const info = await res.json()
        lineOfficialId = info.premiumId || info.basicId || null
        if (lineOfficialId && property.owner?.id) {
          db.landlord.update({
            where: { id: property.owner.id },
            data: { lineOfficialId },
          }).catch(() => {})
        }
      }
    } catch (_) {}
  }

  // 瀏覽數累加（fire-and-forget，不阻塞渲染）
  db.property.update({
    where: { id: params.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  const siteId = searchParams?.site
  const siteLandlord = siteId && property.owner?.id === siteId && property.owner?.isActive
    ? property.owner : null

  const lineMessage = `您好，我想詢問房源：${property.title}`
  const lineUrl = lineOfficialId
    ? `https://line.me/R/oaMessage/${encodeURIComponent(lineOfficialId)}/?${encodeURIComponent(lineMessage)}`
    : null

  const { owner, ...safeProperty } = property
  safeProperty.ownerSiteName   = owner?.siteName || null
  safeProperty.ownerId         = owner?.id       || null
  // Prefer Landlord count (ownerId linked), fallback to User count (landlordId), never show 0 if there's real data
  safeProperty.ownerPropCount  = owner?._count?.properties ?? property.landlord?._count?.properties ?? 0
  safeProperty.communityId    = communityRows[0]?.communityId   || null
  safeProperty.communityName  = communityRows[0]?.communityName || null

  return (
    <>
      {siteLandlord ? <LandlordSiteHeader landlord={siteLandlord} /> : <Navbar />}
      <PropertyDetail property={{ ...safeProperty, lineUrl }} />
      {!siteLandlord && <Footer />}
    </>
  )
}
