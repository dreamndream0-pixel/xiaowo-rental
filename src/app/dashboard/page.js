// src/app/dashboard/page.js
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import Navbar from '@/components/layout/Navbar'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export const metadata = { title: '房東後台' }

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  // 未登入 → 導向登入頁
  if (!session) redirect('/login?callbackUrl=/dashboard')

  // 取得房東的房源
  const properties = await db.property.findMany({
    where: { landlordId: session.user.id, deletedAt: null },
    include: {
      images:    { where: { isCover: true }, take: 1 },
      amenities: { take: 3 },
      _count:    { select: { favorites: true, bookings: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const stats = {
    total:     properties.length,
    available: properties.filter(p => p.status === 'AVAILABLE').length,
    rented:    properties.filter(p => p.status === 'RENTED').length,
    pending:   properties.filter(p => p.status === 'PENDING').length,
  }

  return (
    <>
      <Navbar />
      <DashboardLayout
        user={session.user}
        properties={properties}
        stats={stats}
      />
    </>
  )
}
