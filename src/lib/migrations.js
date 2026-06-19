// src/lib/migrations.js
// 確保資料庫欄位存在（Prisma schema 新增欄位但尚未 db push 時使用）
// 用 module-level promise 確保每個 Lambda 只執行一次

import { db } from '@/lib/db'

let migrationPromise = null

export async function ensureMigrations() {
  if (migrationPromise) return migrationPromise
  migrationPromise = (async () => {
    // 不加 FK 約束，確保 CREATE TABLE 一定成功
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS communities (
        id           TEXT PRIMARY KEY,
        "ownerId"    TEXT,
        name         TEXT NOT NULL,
        description  TEXT NOT NULL DEFAULT '',
        photos       TEXT NOT NULL DEFAULT '[]',
        "mapUrl"     TEXT,
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).catch(e => console.error('[migrations] create communities:', e.message))

    // properties.communityId 欄位（不加 FK）
    await db.$executeRawUnsafe(
      `ALTER TABLE properties ADD COLUMN IF NOT EXISTS "communityId" TEXT`
    ).catch(() => {})

    // 移除舊版 NOT NULL 約束（若存在）
    await db.$executeRawUnsafe(
      `ALTER TABLE communities ALTER COLUMN "ownerId" DROP NOT NULL`
    ).catch(() => {})
  })()
  return migrationPromise
}
