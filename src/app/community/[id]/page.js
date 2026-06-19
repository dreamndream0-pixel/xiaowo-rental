export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'

export default async function CommunityPage({ params }) {
  const community = await db.community.findUnique({
    where: { id: params.id },
    include: {
      properties: {
        where: { status: 'AVAILABLE', deletedAt: null },
        select: { id: true, title: true, price: true, ownerId: true },
        take: 10,
      }
    }
  })
  if (!community) notFound()

  const photos = (() => { try { return JSON.parse(community.photos) } catch { return [] } })()

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 80px' }}>
        <Link href="javascript:history.back()" style={{ fontSize: 13, color: 'var(--sage-dark)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>← 返回</Link>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{community.name}</h1>

        {community.description && (
          <p style={{ fontSize: 15, color: 'var(--gray-mid)', lineHeight: 1.8, marginBottom: 28, whiteSpace: 'pre-wrap' }}>{community.description}</p>
        )}

        {photos.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📸 社區照片</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {photos.map((url, i) => (
                <img key={i} src={url} alt={`社區照片 ${i+1}`}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10 }} />
              ))}
            </div>
          </div>
        )}

        {community.mapUrl && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📍 社區位置</h2>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--oat-mid)' }}>
              <iframe src={community.mapUrl} width="100%" height="360" style={{ border: 0, display: 'block' }} allowFullScreen loading="lazy" />
            </div>
          </div>
        )}

        {community.properties.length > 0 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🏠 此社區房源</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {community.properties.map(p => (
                <Link key={p.id} href={`/property/${p.id}${p.ownerId ? '?site='+p.ownerId : ''}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--oat-light)', borderRadius: 10, padding: '12px 16px', textDecoration: 'none', color: 'var(--charcoal)' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</span>
                  <span style={{ fontSize: 13, color: 'var(--sage-dark)', fontWeight: 700 }}>NT${p.price.toLocaleString()}/月</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
