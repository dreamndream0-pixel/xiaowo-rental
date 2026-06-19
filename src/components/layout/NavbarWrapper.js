// src/components/layout/NavbarWrapper.js
// Server Component：從 DB 讀 logo，快取 60 秒
import Navbar from './Navbar'
import { db } from '@/lib/db'
import { unstable_cache } from 'next/cache'

const getCachedLogo = unstable_cache(
  async () => {
    try {
      const rows = await db.$queryRawUnsafe(
        `SELECT value FROM site_settings WHERE key = 'site_logo'`
      )
      return rows[0]?.value || ''
    } catch {
      return ''
    }
  },
  ['site-logo'],
  { revalidate: 60 }  // 60 秒快取，上傳新 logo 後最多 60 秒生效
)

export default async function NavbarWrapper() {
  const logoUrl = await getCachedLogo()
  return <Navbar initialLogoUrl={logoUrl} />
}
