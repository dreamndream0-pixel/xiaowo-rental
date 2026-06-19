// src/lib/migrations.js
// 確保 communities 資料表存在，每個 Lambda 執行一次

import { db } from '@/lib/db'

let _done = false

export async function ensureMigrations() {
  if (_done) return
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
  } catch(_) {}
  try { await db.$queryRawUnsafe(`ALTER TABLE communities ALTER COLUMN "ownerId" DROP NOT NULL`) } catch(_) {}
  try { await db.$queryRawUnsafe(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS "communityId" TEXT`) } catch(_) {}
  _done = true
}
