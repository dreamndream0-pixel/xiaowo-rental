// src/lib/migrations.js
// 確保資料庫欄位存在
// 模組載入時立即執行，用 $queryRawUnsafe（比 $executeRawUnsafe 對 DDL 更相容）

import { db } from '@/lib/db'

export const migrationReady = (async () => {
  try {
    await db.$queryRawUnsafe(`
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
    `)
  } catch(e) { console.error('[migrations] create communities:', e.message) }

  try { await db.$queryRawUnsafe(`ALTER TABLE communities ALTER COLUMN "ownerId" DROP NOT NULL`) } catch(_) {}
  try { await db.$queryRawUnsafe(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS "communityId" TEXT`) } catch(_) {}
})()

export async function ensureMigrations() {
  return migrationReady
}
