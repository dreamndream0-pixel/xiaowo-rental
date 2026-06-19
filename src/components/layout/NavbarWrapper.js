// src/components/layout/NavbarWrapper.js
// Server Component：從 DB 讀 logo，快取 60 秒
import Navbar from './Navbar'
import { db } from '@/lib/db'
import { unstable_cache } from 'next/cache'

const getCachedLogo = unstable_cache(
  async () => {
    // 確保資料表存在，再讀取
    await db.$queryRawUnsafe(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    const rows = await db.$queryRawUnsafe(
      `SELECT value FROM site_settings WHERE key = 'site_logo'`
    )
    return rows[0]?.value || ''
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
