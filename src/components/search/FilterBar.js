'use client'
// src/components/search/FilterBar.js

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const TAG_INLINE = 8

export default function FilterBar() {
  const router = useRouter()
  const params = useSearchParams()
  const currentType = params.get('type') || 'all'
  const currentTags = params.get('tags') ? params.get('tags').split(',') : []
  const [allTags, setAllTags] = useState([])
  const [tagPopOpen, setTagPopOpen] = useState(false)
  const [tempTags, setTempTags] = useState([])
  const popRef = useRef(null)
  const btnRef = useRef(null)

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(setAllTags).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = e => {
      if (!popRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setTagPopOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const types = [
    { value: 'all',          label: '全部' },
    { value: 'SUITE',        label: '套房' },
    { value: 'ROOM',         label: '雅房' },
    { value: 'WHOLE_FLOOR',  label: '整層住家' },
    { value: 'SHARED_SUITE', label: '分租套房' },
  ]

  const setFilter = (type) => {
    const p = new URLSearchParams(params.toString())
    if (type === 'all') p.delete('type')
    else p.set('type', type)
    p.delete('page')
    router.push(`/listings?${p.toString()}`)
  }

  const applyTags = (selected) => {
    const p = new URLSearchParams(params.toString())
    if (selected.length === 0) p.delete('tags')
    else p.set('tags', selected.join(','))
    p.delete('page')
    router.push(`/listings?${p.toString()}`)
  }

  const toggleTagDirect = (tag) => {
    const next = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag]
    applyTags(next)
  }

  const setSort = (sort) => {
    const p = new URLSearchParams(params.toString())
    p.set('sort', sort)
    router.push(`/listings?${p.toString()}`)
  }

  const extraSelected = currentTags.filter(t => !allTags.slice(0, TAG_INLINE).includes(t)).length

  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)',
      padding: '14px 20px', marginBottom: 24,
      boxShadow: 'var(--shadow-sm)', position: 'relative',
    }}>
      {/* Row 1: type + sort */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {types.map(({ value, label }) => {
          const active = value === currentType || (value === 'all' && !params.get('type'))
          return (
            <button key={value} onClick={() => setFilter(value)} style={{
              padding: '6px 16px', borderRadius: 16, fontSize: 12, fontWeight: active ? 700 : 500,
              border: `1.5px solid ${active ? 'var(--sage)' : 'var(--oat-mid)'}`,
              background: active ? 'var(--sage)' : 'none',
              color: active ? 'white' : 'var(--gray-mid)',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}>{label}</button>
          )
        })}
        <div style={{ width: 1, height: 24, background: 'var(--oat-mid)', flexShrink: 0 }} />
        <select onChange={e => setSort(e.target.value)} defaultValue={params.get('sort') || 'newest'} style={{
          padding: '6px 12px', borderRadius: 16,
          border: '1.5px solid var(--oat-mid)', background: 'none',
          fontSize: 12, color: 'var(--gray-mid)', cursor: 'pointer',
          fontFamily: 'inherit', outline: 'none',
        }}>
          <option value="newest">最新刊登</option>
          <option value="price-asc">價格低到高</option>
          <option value="price-desc">價格高到低</option>
        </select>
      </div>

      {/* Row 2: tag chips */}
      {allTags.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--oat-mid)' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'var(--gray-light)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', lineHeight: '26px' }}>標籤</span>
            {allTags.slice(0, TAG_INLINE).map(tag => {
              const active = currentTags.includes(tag)
              return (
                <button key={tag} onClick={() => toggleTagDirect(tag)} style={{
                  padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: active ? 700 : 400,
                  border: `1.5px solid ${active ? 'var(--sage)' : 'var(--oat-mid)'}`,
                  background: active ? 'var(--sage-bg)' : 'none',
                  color: active ? 'var(--sage-dark)' : 'var(--gray-mid)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                }}>{tag}</button>
              )
            })}
            {allTags.length > TAG_INLINE && (
              <button ref={btnRef} onClick={() => { setTempTags([...currentTags]); setTagPopOpen(o => !o) }} style={{
                padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                border: '1.5px solid var(--sage-light)',
                background: tagPopOpen ? 'var(--sage)' : 'var(--oat-light)',
                color: tagPopOpen ? 'white' : 'var(--sage-dark)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              }}>＋ 更多{extraSelected > 0 ? ` (${extraSelected})` : ''}</button>
            )}
          </div>

          {/* Popup */}
          {tagPopOpen && (
            <div ref={popRef} style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 400,
              background: 'white', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)', border: '1px solid var(--oat-mid)',
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)' }}>選擇標籤（可多選）</div>
                <button onClick={() => setTagPopOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--gray-mid)', padding: '0 4px' }}>×</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {allTags.map(tag => {
                  const sel = tempTags.includes(tag)
                  return (
                    <button key={tag} onClick={() => setTempTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} style={{
                      padding: '5px 14px', borderRadius: 99, fontSize: 13,
                      fontFamily: 'inherit', cursor: 'pointer', fontWeight: sel ? 700 : 400,
                      background: sel ? 'var(--sage-bg)' : 'white',
                      color: sel ? 'var(--sage-dark)' : 'var(--gray-mid)',
                      border: `1.5px solid ${sel ? 'var(--sage)' : 'var(--oat-mid)'}`,
                      transition: 'all 0.15s',
                    }}>{tag}</button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setTempTags([])} style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                  background: 'none', border: '1.5px solid var(--oat-mid)', color: 'var(--gray-mid)', fontFamily: 'inherit',
                }}>清除</button>
                <button onClick={() => { applyTags(tempTags); setTagPopOpen(false) }} style={{
                  padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: 'var(--sage)', border: 'none', color: 'white', fontFamily: 'inherit',
                }}>確認</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
