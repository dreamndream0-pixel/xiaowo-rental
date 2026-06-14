'use client'
// src/components/landlord/LandlordSite.js
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PropertyCard from '@/components/property/PropertyCard'
import LandlordSiteHeader from '@/components/landlord/LandlordSiteHeader'

export default function LandlordSite({ landlord, properties, recommendations, searchParams }) {
  const router = useRouter()
  const siteName = landlord.siteName || `${landlord.name} 的租屋`
  const [kw, setKw] = useState(searchParams.keyword || '')
  const [city, setCity] = useState(searchParams.city || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.maxPrice || '')

  function toCard(p) {
    return {
      id: p.id, title: p.title, type: p.type, status: p.status,
      city: p.city, district: p.district, size: p.size, price: p.price,
      coverUrl: p.images?.[0]?.url || null,
    }
  }

  function doSearch() {
    const params = new URLSearchParams()
    if (kw) params.set('keyword', kw)
    if (city) params.set('city', city)
    if (maxPrice) params.set('maxPrice', maxPrice)
    router.push(`/site/${landlord.id}?${params.toString()}`)
  }

  function resetSearch() {
    setKw(''); setCity(''); setMaxPrice('')
    router.push(`/site/${landlord.id}`)
  }

  return (
    <>
      <LandlordSiteHeader landlord={landlord} />

      {/* Hero + 搜尋 */}
      <section style={{ background: 'var(--oat-light)', padding: '40px 20px 32px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, color: 'var(--charcoal)', marginBottom: 8 }}>
            {siteName}
          </h1>
          <p style={{ color: 'var(--gray-mid)', fontSize: 14, marginBottom: 24 }}>共 {properties.length} 間房源</p>

          {/* 搜尋列 */}
          <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={kw} onChange={e => setKw(e.target.value)} placeholder="關鍵字（如：採光、近捷運）"
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              style={{ flex: 2, minWidth: 160, padding: '10px 14px', border: '1.5px solid var(--oat-mid)', borderRadius: 10, fontSize: 14, outline: 'none' }} />
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="城市"
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              style={{ flex: 1, minWidth: 90, padding: '10px 14px', border: '1.5px solid var(--oat-mid)', borderRadius: 10, fontSize: 14, outline: 'none' }} />
            <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="租金上限" type="number"
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              style={{ flex: 1, minWidth: 90, padding: '10px 14px', border: '1.5px solid var(--oat-mid)', borderRadius: 10, fontSize: 14, outline: 'none' }} />
            <button onClick={doSearch} style={{ padding: '10px 24px', background: 'var(--sage)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>搜尋</button>
            {(searchParams.keyword || searchParams.city || searchParams.maxPrice) && (
              <button onClick={resetSearch} style={{ padding: '10px 16px', background: 'none', color: 'var(--gray-mid)', border: '1.5px solid var(--oat-mid)', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>清除</button>
            )}
          </div>
        </div>
      </section>

      {/* 房源列表 */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px' }}>
        {properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-light)', background: 'var(--oat-light)', borderRadius: 18 }}>
            😔 找不到符合條件的房源，試試其他關鍵字
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {properties.map(p => <PropertyCard key={p.id} property={toCard(p)} detailHref={`/property/${p.id}?site=${landlord.id}`} />)}
          </div>
        )}
      </section>

      {/* 其他房東推薦 */}
      {recommendations.length > 0 && (
        <section style={{ background: 'var(--oat-light)', padding: '40px 20px' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--charcoal)', margin: 0 }}>探索更多好房</h2>
                <p style={{ fontSize: 13, color: 'var(--gray-light)', margin: '4px 0 0' }}>來自小蝸出租其他房東的推薦</p>
              </div>
              <Link href="/listings" style={{ fontSize: 13, fontWeight: 600, color: 'var(--sage-dark)', textDecoration: 'none', padding: '8px 18px', border: '1.5px solid var(--sage-light)', borderRadius: 99 }}>
                前往小蝸主站 →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {recommendations.map(p => <PropertyCard key={p.id} property={toCard(p)} />)}
            </div>
          </div>
        </section>
      )}

      {/* 頁尾 */}
      <footer style={{ background: 'var(--charcoal)', color: 'rgba(255,255,255,0.7)', padding: '28px 20px', textAlign: 'center', fontSize: 13 }}>
        <p style={{ margin: 0 }}>{siteName} · 由 🐌 小蝸出租 提供技術支援</p>
        <Link href="/listings" style={{ color: 'var(--sage-light)', textDecoration: 'none', fontSize: 13 }}>瀏覽全部房源 →</Link>
      </footer>
    </>
  )
}
