// src/lib/sitePages.js
import { db } from './db'

const KEYS = ['page_about', 'page_guide', 'page_privacy', 'page_terms']

export async function ensureSiteSettingsTable() {
  await db.$queryRawUnsafe(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

// 讀取單一內容頁，無資料時回空白可編輯預設值
export async function getSitePage(key) {
  await ensureSiteSettingsTable()
  const rows = await db.$queryRawUnsafe(
    `SELECT value FROM site_settings WHERE key = $1`,
    key
  )
  if (!rows[0]) return { title: '', body: '' }
  try {
    return JSON.parse(rows[0].value)
  } catch {
    return { title: '', body: '' }
  }
}

// 讀取所有內容頁（後台編輯用）
export async function getAllSitePages() {
  await ensureSiteSettingsTable()
  const rows = await db.$queryRawUnsafe(
    `SELECT key, value FROM site_settings WHERE key IN ('page_about','page_guide','page_privacy','page_terms')`
  )
  const map = {}
  rows.forEach(r => { map[r.key] = r.value })
  const parse = v => { try { return JSON.parse(v) } catch { return { title: '', body: '' } } }
  return {
    about:   map['page_about']   ? parse(map['page_about'])   : { title: '', body: '' },
    guide:   map['page_guide']   ? parse(map['page_guide'])   : { title: '', body: '' },
    privacy: map['page_privacy'] ? parse(map['page_privacy']) : { title: '', body: '' },
    terms:   map['page_terms']   ? parse(map['page_terms'])   : { title: '', body: '' },
  }
}

export async function upsertSitePage(key, value) {
  await db.$queryRawUnsafe(
    `INSERT INTO site_settings (key, value, "updatedAt")
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, "updatedAt" = NOW()`,
    key, JSON.stringify(value)
  )
}

export { KEYS as SITE_PAGE_KEYS }
