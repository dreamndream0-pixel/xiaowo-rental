// src/lib/migrations.js
// 確保資料庫欄位存在（Prisma schema 新增欄位但尚未 db push 時使用）
// 用 module-level promise 確保每個 Lambda 只執行一次

import { db } from '@/lib/db'

let migrationPromise = null

export async function ensureMigrations() {
  if (migrationPromise) return migrationPromise
  migrationPromise = (async () => {
    try {
      // communities 資料表
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS communities (
          id           TEXT PRIMARY KEY,
          "ownerId"    TEXT NOT NULL,
          name         TEXT NOT NULL,
          description  TEXT NOT NULL DEFAULT '',
          photos       TEXT NOT NULL DEFAULT '[]',
          "mapUrl"     TEXT,
          "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      // properties.communityId 欄位
      await db.$executeRawUnsafe(`
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS "communityId" TEXT REFERENCES communities(id)
      `)
    } catch (e) {
      // 欄位已存在時 ALTER TABLE 可能報錯，忽略即可
      if (!e.message?.includes('already exists')) {
        console.error('[migrations] error:', e.message)
      }
    }
  })()
  return migrationPromise
}
