'use client'
// src/components/landlord/LandlordSite.js
import { useState, useEffect } from 'react'
import Link from 'next/link'
import PropertyCard from '@/components/property/PropertyCard'
import LandlordSiteHeader from '@/components/landlord/LandlordSiteHeader'
import SearchBar from '@/components/search/SearchBar'

function SiteSlideshow({ slides }) {
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => {
      setFading(true)
      setTimeout(() => { setCurrent(i => (i + 1) % slides.length); setFading(false) }, 400)
    }, 4000)
    return () => clearInterval(t)
  }, [slides.length])

  if (!slides.length) return null
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/6', overflow: 'hidden', background: '#3A5740', minHeight: 200 }}>
      <img
        key={current}
        src={slides[current].url}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: fading ? 0 : 1, transition: 'opacity 0.4s ease' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.35) 100%)' }} />
      {slides.length > 1 && (
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 4, background: i === current ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LandlordSite({ landlord, properties, recommendations, searchParams, siteSlides = [] }) {
  const siteName = landlord.siteName || `${landlord.name} 的租屋`

  function toCard(p) {
    return {
      id: p.id, title: p.title, type: p.type, status: p.status,
      city: p.city, district: p.district, size: p.size, price: p.price,
      coverUrl: p.images?.[0]?.url || null,
      tags: p.tags?.map(t => t.name) ?? [],
    }
  }

  return (
    <>
      <LandlordSiteHeader landlord={landlord} />

      {/* 輪播圖（有設定才顯示） */}
      {siteSlides.length > 0 && <SiteSlideshow slides={siteSlides} />}

      {/* Hero + 搜尋 */}
      <section style={{ background: 'var(--oat-light)', padding: '40px 20px 32px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          {/* logo 已含品牌名，避免重複；沒設 logo 才顯示站名標題 */}
          {!landlord.siteLogo && (
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, color: 'var(--charcoal)', marginBottom: 8 }}>
              {siteName}
            </h1>
          )}
          <p style={{ color: 'var(--gray-mid)', fontSize: 14, marginBottom: 24 }}>共 {properties.length} 間房源</p>

          {/* 與主站完全相同的搜尋欄，搜尋結果導向此房東官網 */}
          <SearchBar
            searchBase={`/site/${landlord.id}`}
            initialParams={{
              landlord: landlord.id,
              keyword:  searchParams.keyword  || '',
              city:     searchParams.city     || '',
              district: searchParams.district || '',
              type:     searchParams.type     || '',
              minPrice: searchParams.minPrice || '',
              maxPrice: searchParams.maxPrice || '',
              tags:     searchParams.tags     || '',
            }}
          />
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
        <Link href="/" style={{ color: 'var(--sage-light)', textDecoration: 'none', fontSize: 13 }}>瀏覽全部房源 →</Link>
      </footer>
    </>
  )
}
