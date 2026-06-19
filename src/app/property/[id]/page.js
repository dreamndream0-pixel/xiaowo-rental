// src/app/property/[id]/page.js
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { unstable_cache } from 'next/cache'
import Navbar from '@/components/layout/NavbarWrapper'
import LandlordSiteHeader from '@/components/landlord/LandlordSiteHeader'
import PropertyDetail from '@/components/property/PropertyDetail'

// ISR：房源內容不常變動，60 秒快取；有更新時後台可觸發 revalidate
export const revalidate = 60

// 快取 property 資料（避免 metadata + page 各打一次 DB）
function getCachedProperty(id) {
  return unstable_cache(
    async () => {
      // 三個 DB 查詢並行
      const [property, communityRow] = await Promise.all([
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
                id: true, name: true, siteName: true, siteLogo: true, isActive: true,
                lineOfficialId: true, lineChannelToken: true,
              },
            },
          },
        }),
        // communityId / communityName（不在 Prisma schema，raw SQL）
        db.$queryRawUnsafe(
          `SELECT p."communityId", c.name as "communityName"
           FROM properties p
           LEFT JOIN communities c ON c.id = p."communityId"
           WHERE p.id = $1`, id
        ).catch(() => []),
      ])

      if (!property) return null

      const communityId   = communityRow[0]?.communityId   || null
      const communityName = communityRow[0]?.communityName || null

      // LINE Official Account ID（已存 DB 則直接用，避免每次打外部 API）
      let lineOfficialId = property.owner?.lineOfficialId || null
      if (!lineOfficialId && property.owner?.lineChannelToken) {
        try {
          const res = await fetch('https://api.line.me/v2/bot/info', {
            headers: { Authorization: `Bearer ${property.owner.lineChannelToken}` },
            next: { revalidate: 3600 },  // 快取 1 小時，不是每次都打
          })
          if (res.ok) {
            const info = await res.json()
            lineOfficialId = info.premiumId || info.basicId || null
            if (lineOfficialId) {
              // 存回 DB（fire-and-forget，不阻塞渲染）
              db.landlord.update({
                where: { id: property.owner.id },
                data: { lineOfficialId },
              }).catch(() => {})
            }
          }
        } catch (_) {}
      }

      return { property, communityId, communityName, lineOfficialId }
    },
    [`property-${id}`],
    { revalidate: 60, tags: [`property-${id}`] }
  )()
}

export async function generateMetadata({ params }) {
  const data = await getCachedProperty(params.id)
  if (!data) return { title: '找不到房源' }
  const { property } = data
  return {
    title: property.title,
    description: `${property.city}${property.district} | 月租 $${property.price.toLocaleString()} | 小蝸出租`,
  }
}

export default async function PropertyPage({ params, searchParams }) {
  const data = await getCachedProperty(params.id)
  if (!data) notFound()

  const { property, communityId, communityName, lineOfficialId } = data

  // 瀏覽數累加（fire-and-forget，不阻塞渲染）
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
  safeProperty.communityId    = communityId
  safeProperty.communityName  = communityName

  return (
    <>
      {siteLandlord ? <LandlordSiteHeader landlord={siteLandlord} /> : <Navbar />}
      <PropertyDetail property={{ ...safeProperty, lineUrl }} />
    </>
  )
}
