'use client'
// src/components/search/SearchBar.js

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ALL_CITIES, getDistricts } from '@/lib/districts'

export default function SearchBar() {
  const router = useRouter()
  const [keyword,  setKeyword]  = useState('')
  const [city,     setCity]     = useState('')
  const [district, setDistrict] = useState('')
  const [type,     setType]     = useState('')
  const [rentMin,  setRentMin]  = useState(0)
  const [rentMax,  setRentMax]  = useState(50000)
  const [popOpen,  setPopOpen]  = useState(false)
  const popRef = useRef(null)
  const triggerRef = useRef(null)

  const districts = city ? getDistricts(city) : []

  // Close popover on outside click
  useEffect(() => {
    const handler = e => {
      if (!popRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) {
        setPopOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Dual-range slider fill
  const fillLeft  = (rentMin / 50000) * 100
  const fillWidth = ((rentMax - rentMin) / 50000) * 100

  const handleMinChange = e => {
    const v = Math.min(Number(e.target.value), rentMax - 2000)
    setRentMin(v)
  }
  const handleMaxChange = e => {
    const v = Math.max(Number(e.target.value), rentMin + 2000)
    setRentMax(v)
  }

  const rentLabel = rentMin === 0 && rentMax >= 50000
    ? '不限'
    : `$${rentMin.toLocaleString()} – ${rentMax >= 50000 ? '不限' : '$' + rentMax.toLocaleString()}`

  const presets = [
    { label: '8K 以下',    min: 0,     max: 8000  },
    { label: '8K–12K',    min: 8000,  max: 12000 },
    { label: '12K–18K',   min: 12000, max: 18000 },
    { label: '18K–30K',   min: 18000, max: 30000 },
    { label: '不限',       min: 0,     max: 50000 },
  ]

  const doSearch = () => {
    const params = new URLSearchParams()
    if (keyword)  params.set('keyword',  keyword)
    if (city)     params.set('city',     city)
    if (district) params.set('district', district)
    if (type)     params.set('type',     type)
    if (rentMin > 0)      params.set('minPrice', rentMin)
    if (rentMax < 50000)  params.set('maxPrice', rentMax)
    router.push(`/listings?${params.toString()}`)
  }

  const selStyle = { border: 'none', outline: 'none', background: 'none', fontSize: 13, color: 'var(--charcoal)', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', width: '100%' }
  const labelStyle = { fontSize: 9, fontFamily: 'Montserrat,sans-serif', letterSpacing: '1.5px', color: 'var(--gray-light)', fontWeight: 700, textTransform: 'uppercase' }
  const cellStyle = { display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 18px', cursor: 'pointer', transition: 'background 0.2s', flex: 1, minWidth: 0 }

  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', maxWidth: 860 }}>

      {/* Keyword row */}
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

      {/* Selects row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr 1px 1fr' }}>

        {/* 縣市 */}
        <div style={cellStyle} onMouseEnter={e => e.currentTarget.style.background = 'var(--oat-light)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
          <span style={labelStyle}>縣市</span>
          <select value={city} onChange={e => { setCity(e.target.value); setDistrict('') }} style={selStyle}>
            <option value="">不限</option>
            {ALL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ width: 1, background: 'var(--oat-mid)' }} />

        {/* 行政區 */}
        <div style={{ ...cellStyle, opacity: city ? 1 : 0.5 }} onMouseEnter={e => e.currentTarget.style.background = city ? 'var(--oat-light)' : ''} onMouseLeave={e => e.currentTarget.style.background = ''}>
          <span style={labelStyle}>行政區</span>
          <select value={district} onChange={e => setDistrict(e.target.value)} disabled={!city} style={selStyle}>
            <option value="">不限</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ width: 1, background: 'var(--oat-mid)' }} />

        {/* 月租金 */}
        <div ref={triggerRef} style={{ ...cellStyle, position: 'relative' }}
          onClick={() => setPopOpen(o => !o)}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--oat-light)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
        >
          <span style={labelStyle}>月租金</span>
          <span style={{ fontSize: 13, color: 'var(--charcoal)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rentLabel}</span>

          {/* Rent Popover */}
          {popOpen && (
            <div ref={popRef} onClick={e => e.stopPropagation()} style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0,
              background: 'white', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)', padding: '20px 22px',
              width: 310, zIndex: 300, border: '1px solid var(--oat-mid)',
            }}>
              <div style={{ fontSize: 9, fontFamily: 'Montserrat,sans-serif', letterSpacing: '1.5px', color: 'var(--gray-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>設定租金區間</div>

              {/* Display */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                {[
                  [rentMin === 0 ? '不限' : `${(rentMin/1000).toFixed(0)}K`, '最低 / 元'],
                  [rentMax >= 50000 ? '不限' : `${(rentMax/1000).toFixed(0)}K`, '最高 / 元'],
                ].map(([num, unit], i) => (
                  <div key={i} style={{ background: 'var(--sage-bg)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--sage-dark)', fontFamily: 'Montserrat,sans-serif', lineHeight: 1 }}>{num}</div>
                    <div style={{ fontSize: 9, color: 'var(--gray-light)', marginTop: 2 }}>{unit}</div>
                  </div>
                ))}
              </div>

              {/* Dual slider */}
              <div style={{ position: 'relative', height: 40, marginBottom: 4 }}>
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: 4, background: 'var(--oat-mid)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `${fillLeft}%`, width: `${fillWidth}%`, height: 4, background: 'var(--sage)', borderRadius: 2, pointerEvents: 'none' }} />
                <input type="range" min={0} max={50000} step={1000} value={rentMin} onChange={handleMinChange}
                  style={{ position: 'absolute', width: '100%', top: '50%', transform: 'translateY(-50%)', appearance: 'none', background: 'none', outline: 'none', pointerEvents: 'none', zIndex: 3 }}
                  className="rent-thumb"
                />
                <input type="range" min={0} max={50000} step={1000} value={rentMax} onChange={handleMaxChange}
                  style={{ position: 'absolute', width: '100%', top: '50%', transform: 'translateY(-50%)', appearance: 'none', background: 'none', outline: 'none', pointerEvents: 'none', zIndex: 4 }}
                  className="rent-thumb"
                />
              </div>

              {/* Presets */}
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--oat-mid)', marginTop: 8 }}>
                <div style={{ fontSize: 9, fontFamily: 'Montserrat,sans-serif', letterSpacing: '1.5px', color: 'var(--gray-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>快速選擇</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {presets.map(p => {
                    const active = rentMin === p.min && rentMax === p.max
                    return (
                      <button key={p.label} onClick={() => { setRentMin(p.min); setRentMax(p.max) }} style={{
                        padding: '4px 10px', borderRadius: 10, fontSize: 11,
                        border: `1.5px solid ${active ? 'var(--sage)' : 'var(--oat-mid)'}`,
                        background: active ? 'var(--sage)' : 'none',
                        color: active ? 'white' : 'var(--gray-mid)',
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 700 : 400,
                      }}>{p.label}</button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ width: 1, background: 'var(--oat-mid)' }} />

        {/* 房型 */}
        <div style={cellStyle} onMouseEnter={e => e.currentTarget.style.background = 'var(--oat-light)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
          <span style={labelStyle}>房型</span>
          <select value={type} onChange={e => setType(e.target.value)} style={selStyle}>
            <option value="">不限</option>
            <option value="SUITE">套房</option>
            <option value="ROOM">雅房</option>
            <option value="WHOLE_FLOOR">整層住家</option>
            <option value="SHARED_SUITE">分租套房</option>
          </select>
        </div>
      </div>

      {/* Search button */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--oat-mid)' }}>
        <button onClick={doSearch} style={{
          width: '100%', padding: 13, background: 'var(--sage)', color: 'white',
          border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14,
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => e.target.style.background = 'var(--sage-dark)'}
          onMouseLeave={e => e.target.style.background = 'var(--sage)'}
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
