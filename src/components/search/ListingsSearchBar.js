'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ALL_CITIES, getDistricts } from '@/lib/districts'

export default function ListingsSearchBar({ initialParams = {} }) {
  const router = useRouter()
  const [keyword, setKeyword] = useState(initialParams.keyword || '')
  const [city, setCity] = useState(initialParams.city || '')
  const [district, setDistrict] = useState(initialParams.district || '')
  const [type, setType] = useState(initialParams.type || '')

  const districts = city ? getDistricts(city) : []

  const doSearch = () => {
    const p = new URLSearchParams()
    if (keyword) p.set('keyword', keyword)
    if (city) p.set('city', city)
    if (district) p.set('district', district)
    if (type) p.set('type', type)
    if (initialParams.minPrice) p.set('minPrice', initialParams.minPrice)
    if (initialParams.maxPrice) p.set('maxPrice', initialParams.maxPrice)
    if (initialParams.tags) p.set('tags', initialParams.tags)
    router.push(`/listings?${p.toString()}`)
  }

  const hasSearch = keyword || city || district || type || initialParams.minPrice || initialParams.maxPrice || initialParams.tags

  const inputStyle = {
    flex: 1, minWidth: 100, padding: '8px 12px',
    border: '1.5px solid var(--oat-mid)', borderRadius: 10,
    fontSize: 13, outline: 'none', fontFamily: 'inherit', background: 'white',
  }
  const selStyle = { ...inputStyle, cursor: 'pointer' }

  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)',
      padding: '14px 18px', marginBottom: 20,
      boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
    }}>
      <span style={{ fontSize: 13, color: 'var(--gray-light)', flexShrink: 0 }}>🔍</span>
      <input
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !e.nativeEvent?.isComposing && doSearch()}
        placeholder="關鍵字搜尋…"
        style={{ ...inputStyle, flex: 2, minWidth: 160 }}
      />
      <select value={city} onChange={e => { setCity(e.target.value); setDistrict('') }} style={selStyle}>
        <option value="">全部縣市</option>
        {ALL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={district} onChange={e => setDistrict(e.target.value)} disabled={!city} style={{ ...selStyle, opacity: city ? 1 : 0.5 }}>
        <option value="">全部行政區</option>
        {districts.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={type} onChange={e => setType(e.target.value)} style={selStyle}>
        <option value="">全部房型</option>
        <option value="SUITE">套房</option>
        <option value="ROOM">雅房</option>
        <option value="WHOLE_FLOOR">整層住家</option>
        <option value="SHARED_SUITE">分租套房</option>
      </select>
      <button onClick={doSearch} style={{
        padding: '8px 20px', background: 'var(--sage)', color: 'white',
        border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
      }}>搜尋</button>
      {hasSearch && (
        <button onClick={() => router.push('/listings')} style={{
          padding: '8px 14px', background: 'none', color: 'var(--gray-mid)',
          border: '1.5px solid var(--oat-mid)', borderRadius: 10, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}>清除</button>
      )}
    </div>
  )
}
