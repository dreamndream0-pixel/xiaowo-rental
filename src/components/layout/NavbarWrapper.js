// src/components/layout/NavbarWrapper.js
// Server Component：從 DB 讀 logo，傳給 Client Navbar
import Navbar from './Navbar'
import { db } from '@/lib/db'

async function getSiteLogo() {
  try {
    const rows = await db.$queryRawUnsafe(
      `SELECT value FROM site_settings WHERE key = 'site_logo'`
    )
    return rows[0]?.value || ''
  } catch {
    return ''
  }
}

export default async function NavbarWrapper() {
  const logoUrl = await getSiteLogo()
  return <Navbar initialLogoUrl={logoUrl} />
}
