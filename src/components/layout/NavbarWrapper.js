// src/components/layout/NavbarWrapper.js
// Server Component：從 DB 讀 logo，快取 60 秒
import Navbar from './Navbar'
import { db } from '@/lib/db'
import { unstable_cache } from 'next/cache'

const getCachedLogo = unstable_cache(
  async () => {
    // ⚠️ 不 catch：錯誤直接拋出，unstable_cache 不快取失敗結果
    const row = await db.siteSetting.findUnique({ where: { key: 'site_logo' } })
    return row?.value || ''
  },
  ['site-logo'],
  { revalidate: 60, tags: ['site-logo'] }
)

export default async function NavbarWrapper() {
  const logoUrl = await getCachedLogo()
  return <Navbar initialLogoUrl={logoUrl} />
}
