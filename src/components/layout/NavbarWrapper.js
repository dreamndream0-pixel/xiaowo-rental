// src/components/layout/NavbarWrapper.js
// Server Component：從 DB 讀 logo，快取 60 秒
import Navbar from './Navbar'
import { db } from '@/lib/db'
import { unstable_cache } from 'next/cache'

const getCachedLogo = unstable_cache(
  async () => {
    // 拋出錯誤讓 unstable_cache 不快取失敗結果
    const row = await db.siteSetting.findUnique({ where: { key: 'site_logo' } })
    return row?.value || ''
  },
  ['site-logo'],
  { revalidate: 60, tags: ['site-logo'] }
)

export default async function NavbarWrapper() {
  // 在元件層 catch：DB 失敗時 Navbar 仍能正常渲染（只是沒有 logo）
  let logoUrl = ''
  try {
    logoUrl = await getCachedLogo()
  } catch {}
  return <Navbar initialLogoUrl={logoUrl} />
}
