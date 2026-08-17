// src/instrumentation.js
// Next.js instrumentation hook — 伺服器啟動時跑一次輕量遷移。
// 實際邏輯集中在 lib/migrations.js（先檢查再改，避免每次都取表鎖造成 57014 timeout）。

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { ensureMigrations } = await import('@/lib/migrations')
      await ensureMigrations()
      console.log('[instrumentation] DB migration OK')
    } catch (e) {
      console.error('[instrumentation] DB migration error:', e.message)
    }
  }
}
