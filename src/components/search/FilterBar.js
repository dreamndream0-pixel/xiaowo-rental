'use client'
// src/components/search/FilterBar.js

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

const TAG_INLINE = 8

export default function FilterBar() {
  const router = useRouter()
  const params = useSearchParams()
  const currentType = params.get('type') || 'all'
  const currentTags = params.get('tags') ? params.get('tags').split(',') : []
  const [allTags, setAllTags] = useState([])
  const [tagExpanded, setTagExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(setAllTags).catch(() => {})
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
      boxShadow: 'var(--shadow-sm)',
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
            {(tagExpanded ? allTags : allTags.slice(0, TAG_INLINE)).map(tag => {
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
              <button onClick={() => setTagExpanded(o => !o)} style={{
                padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                border: '1.5px solid var(--sage-light)', background: 'none',
                color: 'var(--sage-dark)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              }}>{tagExpanded ? '收合 ▲' : `展開 ▼${extraSelected > 0 ? ` (${extraSelected})` : ''}`}</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
