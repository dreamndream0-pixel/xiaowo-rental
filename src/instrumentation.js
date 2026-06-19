// src/instrumentation.js
// Next.js instrumentation hook — runs once on server startup
// Used to apply DB migrations that can't wait for prisma db push

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { db } = await import('@/lib/db')

      // 建立 communities 資料表（若不存在）
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

      // 為 properties 加入 communityId 欄位（若不存在）
      await db.$executeRawUnsafe(`
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS "communityId" TEXT REFERENCES communities(id)
      `)

      console.log('[instrumentation] DB migration OK')
    } catch (e) {
      console.error('[instrumentation] DB migration error:', e.message)
    }
  }
}
