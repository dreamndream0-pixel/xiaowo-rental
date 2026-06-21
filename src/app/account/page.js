// src/app/account/page.js  (Server Component)
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import Navbar from '@/components/layout/NavbarWrapper'
import UserDashboard from '@/components/account/UserDashboard'

export const metadata = { title: '我的帳號 | 小蝸出租' }

export default async function AccountPage({ searchParams }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?callbackUrl=/account')

  const [user, favCount, propCount] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
    }),
    db.favorite.count({ where: { userId: session.user.id } }),
    db.property.count({ where: { landlordId: session.user.id, deletedAt: null } }),
  ])

  // Check landlord linked status server-side (avoid client-side flicker / 401)
  const realEmail = user?.email?.endsWith('@xiaowo.local') ? null : user?.email
  let isLinkedLandlord = false
  if (realEmail) {
    try {
      const landlordRow = await db.landlord.findUnique({
        where: { email: realEmail },
        select: { id: true },
      })
      isLinkedLandlord = !!landlordRow
    } catch {}
  }

  return (
    <>
      <Navbar />
      <UserDashboard
        user={user}
        favCount={favCount}
        propCount={propCount}
        initTab={searchParams?.tab || null}
        initSuper={searchParams?.super === '1'}
        initMode={searchParams?.mode || null}
        initLinked={isLinkedLandlord}
      />
    </>
  )
}
