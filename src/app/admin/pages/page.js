// src/app/admin/pages/page.js  (Server Component)
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getAllSitePages } from '@/lib/sitePages'
import Navbar from '@/components/layout/NavbarWrapper'
import PagesEditor from '@/components/admin/PagesEditor'

export const metadata = { title: '網站頁面管理 | 小蝸出租' }
export const dynamic = 'force-dynamic'

export default async function AdminPagesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?callbackUrl=/admin/pages')
  if (session.user.role !== 'ADMIN') redirect('/')

  const initData = await getAllSitePages()

  return (
    <>
      <Navbar />
      <PagesEditor initData={initData} />
    </>
  )
}
