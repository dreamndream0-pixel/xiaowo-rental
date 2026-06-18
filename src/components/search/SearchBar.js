'use client'
// src/components/search/SearchBar.js

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ALL_CITIES, getDistricts } from '@/lib/districts'

const TYPES = [
  { value: '',             label: '不限' },
  { value: 'SUITE',        label: '套房' },
  { value: 'ROOM',         label: '雅房' },
  { value: 'WHOLE_FLOOR',  label: '整層住家' },
  { value: 'SHARED_SUITE', label: '分租套房' },
]

const TAG_INLINE = 8

export default function SearchBar({ searchBase = '/listings', initialParams = {} }) {
  const router = useRouter()
  const [keyword,  setKeyword]  = useState(initialParams.keyword  || '')
  const [city,     setCity]     = useState(initialParams.city     || '')
  const [district, setDistrict] = useState(initialParams.district || '')
  const [type,     setType]     = useState(initialParams.type     || '')
  const [rentMin,  setRentMin]  = useState(Number(initialParams.minPrice) || 0)
  const [rentMax,  setRentMax]  = useState(Number(initialParams.maxPrice) || 50000)
  const [tags,     setTags]     = useState(initialParams.tags ? initialParams.tags.split(',') : [])
  const [allTags,  setAllTags]  = useState([])
  const [tagExpanded, setTagExpanded] = useState(false)

  // which popover is open: 'rent' | 'city' | 'district' | 'type' | null
  const [activePopover, setActivePopover] = useState(null)
  const containerRef = useRef(null)

  const districts = city ? getDistricts(city) : []

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAllTags(data)
    }).catch(() => {})
  }, [])

  // Close all popovers on outside click
  useEffect(() => {
    const handler = e => {
      if (!containerRef.current?.contains(e.target)) setActivePopover(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const togglePop = (name) => setActivePopover(p => p === name ? null : name)

  // Rent slider
  const fillLeft  = (rentMin / 50000) * 100
  const fillWidth = ((rentMax - rentMin) / 50000) * 100
  const handleMinChange = e => setRentMin(Math.min(Number(e.target.value), rentMax - 2000))
  const handleMaxChange = e => setRentMax(Math.max(Number(e.target.value), rentMin + 2000))
  const rentLabel = rentMin === 0 && rentMax >= 50000
    ? '不限'
    : `$${rentMin.toLocaleString()} – ${rentMax >= 50000 ? '不限' : '$' + rentMax.toLocaleString()}`
  const rentPresets = [
    { label: '8K 以下', min: 0, max: 8000 },
    { label: '8K–12K', min: 8000, max: 12000 },
    { label: '12K–18K', min: 12000, max: 18000 },
    { label: '18K–30K', min: 18000, max: 30000 },
    { label: '不限', min: 0, max: 50000 },
  ]

  const toggleTag = name =>
    setTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name])

  const doSearch = () => {
    const params = new URLSearchParams()
    if (keyword)  params.set('keyword',  keyword)
    if (city)     params.set('city',     city)
    if (district) params.set('district', district)
    if (type)     params.set('type',     type)
    if (rentMin > 0)     params.set('minPrice', rentMin)
    if (rentMax < 50000) params.set('maxPrice', rentMax)
    if (tags.length > 0) params.set('tags', tags.join(','))
    setActivePopover(null)
    router.push(`${searchBase}?${params.toString()}`)
  }

  // ── Shared styles ──────────────────────────────────
  const labelSt = {
    fontSize: 9, fontFamily: 'Montserrat,sans-serif', letterSpacing: '1.5px',
    color: 'var(--gray-light)', fontWeight: 700, textTransform: 'uppercase',
  }
  const valueSt = {
    fontSize: 13, color: 'var(--charcoal)', fontWeight: 600,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }
  const cellSt = {
    display: 'flex', flexDirection: 'column', gap: 3,
    padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s',
    flex: 1, minWidth: 0, position: 'relative',
  }
  const popoverSt = {
    position: 'absolute', top: 'calc(100% + 8px)', left: 0,
    background: 'white', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)', padding: '18px 20px',
    zIndex: 300, border: '1px solid var(--oat-mid)',
  }
  const popTitle = {
    fontSize: 9, fontFamily: 'Montserrat,sans-serif', letterSpacing: '1.5px',
    color: 'var(--gray-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 14,
  }
  const optionBtn = (active) => ({
    padding: '6px 14px', borderRadius: 10, fontSize: 12,
    border: `1.5px solid ${active ? 'var(--sage)' : 'var(--oat-mid)'}`,
    background: active ? 'var(--sage)' : 'none',
    color: active ? 'white' : 'var(--gray-mid)',
    cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 700 : 400,
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  })

  return (
    <div ref={containerRef} style={{ background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', maxWidth: 860 }}>

      {/* 關鍵字 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px 12px', borderBottom: '1px solid var(--oat-mid)' }}>
        <span style={{ fontSize: 16, color: 'var(--gray-light)', flexShrink: 0 }}>🔍</span>
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.nativeEvent?.isComposing && doSearch()}
          placeholder="搜尋關鍵字，例：大安區套房、近捷運、含網路…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, color: 'var(--charcoal)', fontFamily: 'inherit', fontWeight: 500 }}
        />
      </div>

      {/* 縣市 / 行政區 / 月租金 / 房型 row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr 1px 1fr' }}>

        {/* ── 縣市 ── */}
        <div
          style={{ ...cellSt, background: activePopover === 'city' ? 'var(--oat-light)' : '' }}
          onClick={() => togglePop('city')}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--oat-light)'}
          onMouseLeave={e => { if (activePopover !== 'city') e.currentTarget.style.background = '' }}
        >
          <span style={labelSt}>縣市</span>
          <span style={valueSt}>{city || '不限'}</span>
          {activePopover === 'city' && (
            <div onClick={e => e.stopPropagation()} style={{ ...popoverSt, width: 300 }}>
              <div style={popTitle}>選擇縣市</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button style={optionBtn(!city)} onClick={() => { setCity(''); setDistrict(''); setActivePopover(null) }}>不限</button>
                {ALL_CITIES.map(c => (
                  <button key={c} style={optionBtn(city === c)}
                    onClick={() => { setCity(c); setDistrict(''); setActivePopover(null) }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ width: 1, background: 'var(--oat-mid)' }} />

        {/* ── 行政區 ── */}
        <div
          style={{ ...cellSt, opacity: city ? 1 : 0.45, background: activePopover === 'district' ? 'var(--oat-light)' : '' }}
          onClick={() => city && togglePop('district')}
          onMouseEnter={e => { if (city) e.currentTarget.style.background = 'var(--oat-light)' }}
          onMouseLeave={e => { if (activePopover !== 'district') e.currentTarget.style.background = '' }}
        >
          <span style={labelSt}>行政區</span>
          <span style={valueSt}>{district || '不限'}</span>
          {activePopover === 'district' && city && (
            <div onClick={e => e.stopPropagation()} style={{ ...popoverSt, width: 300 }}>
              <div style={popTitle}>選擇行政區</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button style={optionBtn(!district)} onClick={() => { setDistrict(''); setActivePopover(null) }}>不限</button>
                {districts.map(d => (
                  <button key={d} style={optionBtn(district === d)}
                    onClick={() => { setDistrict(d); setActivePopover(null) }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ width: 1, background: 'var(--oat-mid)' }} />

        {/* ── 月租金 ── */}
        <div
          style={{ ...cellSt, background: activePopover === 'rent' ? 'var(--oat-light)' : '' }}
          onClick={() => togglePop('rent')}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--oat-light)'}
          onMouseLeave={e => { if (activePopover !== 'rent') e.currentTarget.style.background = '' }}
        >
          <span style={labelSt}>月租金</span>
          <span style={valueSt}>{rentLabel}</span>
          {activePopover === 'rent' && (
            <div onClick={e => e.stopPropagation()} style={{ ...popoverSt, width: 310 }}>
              <div style={popTitle}>設定租金區間</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                {[
                  [rentMin === 0 ? '不限' : `${(rentMin/1000).toFixed(0)}K`, '最低 / 元'],
                  [rentMax >= 50000 ? '不限' : `${(rentMax/1000).toFixed(0)}K`, '最高 / 元'],
                ].map(([num, unit], i) => (
                  <div key={i} style={{ background: 'var(--sage-bg)', borderRadius: 8, padding: '6px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--sage-dark)', fontFamily: 'Montserrat,sans-serif', lineHeight: 1 }}>{num}</div>
                    <div style={{ fontSize: 9, color: 'var(--gray-light)', marginTop: 3 }}>{unit}</div>
                  </div>
                ))}
              </div>
              <div style={{ position: 'relative', height: 40, marginBottom: 4 }}>
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: 4, background: 'var(--oat-mid)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `${fillLeft}%`, width: `${fillWidth}%`, height: 4, background: 'var(--sage)', borderRadius: 2, pointerEvents: 'none' }} />
                <input type="range" min={0} max={50000} step={1000} value={rentMin} onChange={handleMinChange}
                  style={{ position: 'absolute', width: '100%', top: '50%', transform: 'translateY(-50%)', appearance: 'none', background: 'none', outline: 'none', pointerEvents: 'none', zIndex: 3 }}
                  className="rent-thumb" />
                <input type="range" min={0} max={50000} step={1000} value={rentMax} onChange={handleMaxChange}
                  style={{ position: 'absolute', width: '100%', top: '50%', transform: 'translateY(-50%)', appearance: 'none', background: 'none', outline: 'none', pointerEvents: 'none', zIndex: 4 }}
                  className="rent-thumb" />
              </div>
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--oat-mid)', marginTop: 8 }}>
                <div style={{ ...popTitle, marginBottom: 8 }}>快速選擇</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {rentPresets.map(p => {
                    const active = rentMin === p.min && rentMax === p.max
                    return (
                      <button key={p.label} onClick={() => { setRentMin(p.min); setRentMax(p.max) }}
                        style={optionBtn(active)}>{p.label}</button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ width: 1, background: 'var(--oat-mid)' }} />

        {/* ── 房型 ── */}
        <div
          style={{ ...cellSt, background: activePopover === 'type' ? 'var(--oat-light)' : '' }}
          onClick={() => togglePop('type')}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--oat-light)'}
          onMouseLeave={e => { if (activePopover !== 'type') e.currentTarget.style.background = '' }}
        >
          <span style={labelSt}>房型</span>
          <span style={valueSt}>{TYPES.find(t => t.value === type)?.label || '不限'}</span>
          {activePopover === 'type' && (
            <div onClick={e => e.stopPropagation()} style={{ ...popoverSt, right: 0, left: 'auto', width: 220 }}>
              <div style={popTitle}>選擇房型</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TYPES.map(t => (
                  <button key={t.value} style={{ ...optionBtn(type === t.value), textAlign: 'left' }}
                    onClick={() => { setType(t.value); setActivePopover(null) }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 標籤篩選 */}
      {allTags.length > 0 && (
        <div style={{ borderTop: '1px solid var(--oat-mid)', padding: '10px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...labelSt, flexShrink: 0, lineHeight: '26px' }}>標籤篩選</span>
            {(tagExpanded ? allTags : allTags.slice(0, TAG_INLINE)).map(tag => {
              const selected = tags.includes(tag)
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: 12,
                  fontFamily: 'inherit', cursor: 'pointer', fontWeight: selected ? 700 : 400,
                  background: selected ? 'var(--sage-bg)' : 'white',
                  color: selected ? 'var(--sage-dark)' : 'var(--gray-mid)',
                  border: `1.5px solid ${selected ? 'var(--sage)' : 'var(--oat-mid)'}`,
                  transition: 'all 0.15s',
                }}>{tag}</button>
              )
            })}
            {allTags.length > TAG_INLINE && (
              <button onClick={() => setTagExpanded(o => !o)} style={{
                padding: '4px 12px', borderRadius: 99, fontSize: 12,
                fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600,
                background: 'none', color: 'var(--sage-dark)',
                border: '1.5px solid var(--sage-light)', transition: 'all 0.15s',
              }}>
                {tagExpanded ? '收合 ▲' : `展開 ▼${tags.filter(t => !allTags.slice(0, TAG_INLINE).includes(t)).length > 0 ? ` (${tags.filter(t => !allTags.slice(0, TAG_INLINE).includes(t)).length})` : ''}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 搜尋按鈕 */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--oat-mid)' }}>
        <button onClick={doSearch} style={{
          width: '100%', padding: 13, background: 'var(--sage)', color: 'white',
          border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14,
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--sage-dark)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--sage)'}
        >
          🔍 搜尋房源
        </button>
      </div>

      <style>{`
        .rent-thumb::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 22px; height: 22px; border-radius: 50%;
          background: white; border: 2.5px solid var(--sage);
          box-shadow: 0 2px 8px rgba(78,113,83,0.25);
          pointer-events: all; cursor: grab;
        }
        .rent-thumb::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%;
          background: white; border: 2.5px solid var(--sage);
          pointer-events: all; cursor: grab;
        }
      `}</style>
    </div>
  )
}
