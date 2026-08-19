// src/lib/migrations.js
// 啟動時的輕量結構遷移。每個 Lambda 只跑一次（_done），且「先檢查再改」：
// 只有在資料表/欄位/enum 值真的缺少時才執行 DDL，避免每次都對 properties / landlords
// 取 ACCESS EXCLUSIVE 鎖 → 在有讀取流量時被鎖等待、觸發 statement timeout（57014）。

import { db } from '@/lib/db'

let _done = false

async function tableExists(name) {
  try {
    const r = await db.$queryRawUnsafe(`SELECT to_regclass($1) AS t`, name)
    return !!(r && r[0] && r[0].t)
  } catch { return false }
}
async function columnExists(table, col) {
  try {
    const r = await db.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
      table, col
    )
    return Array.isArray(r) && r.length > 0
  } catch { return false }
}
async function columnIsNotNull(table, col) {
  try {
    const r = await db.$queryRawUnsafe(
      `SELECT is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
      table, col
    )
    return Array.isArray(r) && r[0] && r[0].is_nullable === 'NO'
  } catch { return false }
}
async function enumHasAll(typeName, values) {
  try {
    const r = await db.$queryRawUnsafe(
      `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1`,
      typeName
    )
    const have = new Set((r || []).map(x => x.enumlabel))
    return values.every(v => have.has(v))
  } catch { return false }
}

export async function ensureMigrations() {
  if (_done) return
  try {
    // 需要鎖的 DDL 若拿不到鎖就快速失敗，不要卡住讀取（連線池不支援則忽略）
    try { await db.$executeRawUnsafe(`SET lock_timeout = '3s'`) } catch (_) {}

    if (!(await tableExists('communities'))) {
      try {
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
        `)
      } catch (_) {}
    }
    if (await columnIsNotNull('communities', 'ownerId')) {
      try { await db.$executeRawUnsafe(`ALTER TABLE communities ALTER COLUMN "ownerId" DROP NOT NULL`) } catch (_) {}
    }
    if (!(await columnExists('properties', 'communityId'))) {
      try { await db.$executeRawUnsafe(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS "communityId" TEXT`) } catch (_) {}
    }
    if (!(await columnExists('properties', 'siteFeatured'))) {
      try { await db.$executeRawUnsafe(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS "siteFeatured" BOOLEAN NOT NULL DEFAULT false`) } catch (_) {}
    }
    if (!(await columnExists('landlords', 'socialConfig'))) {
      try { await db.$executeRawUnsafe(`ALTER TABLE landlords ADD COLUMN IF NOT EXISTS "socialConfig" TEXT`) } catch (_) {}
    }

    const enumVals = ['STUDIO', 'STORE', 'OFFICE', 'LIVE_OFFICE', 'FACTORY', 'PARKING', 'LAND', 'OTHER']
    if (!(await enumHasAll('PropertyType', enumVals))) {
      for (const v of enumVals) {
        try { await db.$executeRawUnsafe(`ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS '${v}'`) } catch (_) {}
      }
    }

    _done = true
  } catch (_) {
    // 遷移失敗不影響頁面；下次再試
  }
}
