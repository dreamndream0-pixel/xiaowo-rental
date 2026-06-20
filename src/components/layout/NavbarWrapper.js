// src/components/layout/NavbarWrapper.js
// Server Component：每次 request 直接從 DB 讀 logo（頁面已是 force-dynamic，無需額外快取）
import Navbar from './Navbar'
import { db } from '@/lib/db'

async function fetchLogoFromDB() {
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
}

export default async function NavbarWrapper() {
  let logoUrl = ''
  try {
    logoUrl = await fetchLogoFromDB()
  } catch (e) {
    console.error('NavbarWrapper: 讀取 logo 失敗', e.message)
  }
  return <Navbar initialLogoUrl={logoUrl} />
}
