export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'

async function ensureTable() {
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
  await db.$executeRawUnsafe(`
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS "communityId" TEXT REFERENCES communities(id)
  `)
}

async function getCommunity(id) {
  try {
    await ensureTable()
    const rows = await db.$queryRawUnsafe(
      `SELECT * FROM communities WHERE id = $1`, id
    )
    if (!rows[0]) return null
    const c = rows[0]
    // get properties in this community
    const props = await db.$queryRawUnsafe(
      `SELECT id, title, price, "ownerId" FROM properties WHERE "communityId"=$1 AND status='AVAILABLE' AND "deletedAt" IS NULL LIMIT 10`,
      id
    )
    c.properties = props
    return c
  } catch (e) {
    console.error('getCommunity error:', e)
    return null
  }
}

export default async function CommunityPage({ params }) {
  const community = await getCommunity(params.id)
  if (!community) notFound()

  const photos = (() => { try { return JSON.parse(community.photos) } catch { return [] } })()

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* 返回 */}
        <a href="javascript:history.back()" style={{
          fontSize: 13, color: 'var(--sage-dark)', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24,
        }}>← 返回</a>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
          🏘️ {community.name}
        </h1>

        {community.description && (
          <p style={{ fontSize: 15, color: 'var(--gray-mid)', lineHeight: 1.9, marginBottom: 32, whiteSpace: 'pre-wrap' }}>
            {community.description}
          </p>
        )}

        {/* 社區照片 */}
        {photos.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--charcoal)' }}>📸 社區照片</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {photos.map((url, i) => (
                <img key={i} src={url} alt={`社區照片 ${i + 1}`}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12 }} />
              ))}
            </div>
          </div>
        )}

        {/* 地圖 */}
        {community.mapUrl && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--charcoal)' }}>📍 社區位置</h2>
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--oat-mid)' }}>
              <iframe
                src={community.mapUrl}
                width="100%" height="380"
                style={{ border: 0, display: 'block' }}
                allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        )}

        {/* 社區內房源 */}
        {community.properties?.length > 0 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--charcoal)' }}>🏠 此社區可租房源</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {community.properties.map(p => (
                <a key={p.id}
                  href={`/property/${p.id}${p.ownerId ? '?site=' + p.ownerId : ''}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--oat-light)', borderRadius: 12,
                    padding: '14px 18px', textDecoration: 'none', color: 'var(--charcoal)',
                    border: '1px solid var(--oat-mid)',
                  }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</span>
                  <span style={{ fontSize: 13, color: 'var(--sage-dark)', fontWeight: 700 }}>
                    NT${Number(p.price).toLocaleString()}/月 ›
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
