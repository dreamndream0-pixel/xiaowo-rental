// src/app/landlord/[handle]/page.js
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Navbar from '@/components/layout/Navbar'
import LandlordProfile from '@/components/landlord/LandlordProfile'

export async function generateMetadata({ params }) {
  const landlord = await db.user.findFirst({
    where: { handle: params.handle, role: 'LANDLORD', deletedAt: null },
    select: { name: true, bio: true },
  })
  if (!landlord) return { title: '找不到此房東' }
  return {
    title: `${landlord.name} · 房東個人頁面`,
    description: landlord.bio || `${landlord.name} 的房源列表 | 小蝸出租`,
  }
}

export default async function LandlordPage({ params }) {
  const landlord = await db.user.findFirst({
    where: { handle: params.handle, role: 'LANDLORD', deletedAt: null },
    include: {
      properties: {
        where:   { status: 'AVAILABLE', deletedAt: null },
        include: {
          images:    { where: { isCover: true }, take: 1 },
          amenities: { take: 5 },
        },
        orderBy: [{ boostPlan: 'desc' }, { createdAt: 'desc' }],
      },
    },
  })

  if (!landlord) notFound()

  return (
    <>
      <Navbar />
      <LandlordProfile landlord={landlord} />
    </>
  )
}
