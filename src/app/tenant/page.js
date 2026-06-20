// src/app/tenant/page.js  (Server Component)
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import Navbar from '@/components/layout/NavbarWrapper'
import TenantDashboard from '@/components/tenant/TenantDashboard'

export const metadata = { title: '租客後台 | 小蝸出租' }

export default async function TenantPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?callbackUrl=/tenant')

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, avatar: true, lineId: true, createdAt: true },
  })

  const favCount = await db.favorite.count({ where: { userId: session.user.id } })

  return (
    <>
      <Navbar />
      <TenantDashboard user={user} favCount={favCount} />
    </>
  )
}
