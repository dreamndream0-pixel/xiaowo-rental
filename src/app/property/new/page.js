// src/app/property/new/page.js  (Server Component)
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Navbar from '@/components/layout/NavbarWrapper'
import NewPropertyForm from '@/components/property/form/NewPropertyForm'

export const metadata = { title: '新增房源 | 小蝸出租' }

export default async function NewPropertyPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?callbackUrl=/property/new')

  return (
    <>
      <Navbar />
      <NewPropertyForm />
    </>
  )
}
