'use client'
// src/components/search/FilterBar.js

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function FilterBar() {
  const router = useRouter()
  const params = useSearchParams()
  const currentType = params.get('type') || 'all'
  const currentTags = params.get('tags') ? params.get('tags').split(',') : []
  const [allTags, setAllTags] = useState([])

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(setAllTags).catch(() => {})
  }, [])

  const types = [
    { value: 'all',        label: '全部' },
    { value: 'SUITE',      label: '套房' },
    { value: 'ROOM',       label: '雅房' },
    { value: 'WHOLE_FLOOR', label: '整層住家' },
    { value: 'SHARED_SUITE', label: '分租套房' },
  ]

  const setFilter = (type) => {
    const p = new URLSearchParams(params.toString())
    if (type === 'all') p.delete('type')
    else p.set('type', type)
    p.delete('page')
    router.push(`/listings?${p.toString()}`)
  }

  const toggleTag = (tag) => {
    const p = new URLSearchParams(params.toString())
    const next = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    if (next.length === 0) p.delete('tags')
    else p.set('tags', next.join(','))
    p.delete('page')
    router.push(`/listings?${p.toString()}`)
  }

  const setSort = (sort) => {
    const p = new URLSearchParams(params.toString())
    p.set('sort', sort)
    router.push(`/listings?${p.toString()}`)
  }

  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)',
      padding: '14px 20px', marginBottom: 24,
      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {types.map(({ value, label }) => {
        const active = value === currentType || (value === 'all' && !params.get('type'))
        return (
          <button key={value} onClick={() => setFilter(value)} style={{
            padding: '6px 16px', borderRadius: 16, fontSize: 12, fontWeight: active ? 700 : 500,
            border: `1.5px solid ${active ? 'var(--sage)' : 'var(--oat-mid)'}`,
            background: active ? 'var(--sage)' : 'none',
            color: active ? 'white' : 'var(--gray-mid)',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>{label}</button>
        )
      })}

      <div style={{ width: 1, height: 24, background: 'var(--oat-mid)', flexShrink: 0 }} />

      <select onChange={e => setSort(e.target.value)} defaultValue={params.get('sort') || 'newest'} style={{
        padding: '6px 12px', borderRadius: 16,
        border: '1.5px solid var(--oat-mid)', background: 'none',
        fontSize: 12, color: 'var(--gray-mid)', cursor: 'pointer',
        fontFamily: 'inherit', outline: 'none', flexShrink: 0,
      }}>
        <option value="newest">最新刊登</option>
        <option value="price-asc">價格低到高</option>
        <option value="price-desc">價格高到低</option>
      </select>

      {allTags.length > 0 && (
        <>
          <div style={{ width: '100%', height: 1, background: 'var(--oat-mid)', margin: '2px 0' }} />
          <span style={{ fontSize: 10, color: 'var(--gray-light)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0 }}>標籤篩選</span>
          {allTags.map(tag => {
            const active = currentTags.includes(tag)
            return (
              <button key={tag} onClick={() => toggleTag(tag)} style={{
                padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: active ? 700 : 400,
                border: `1.5px solid ${active ? 'var(--sage)' : 'var(--oat-mid)'}`,
                background: active ? 'var(--sage-bg)' : 'none',
                color: active ? 'var(--sage-dark)' : 'var(--gray-mid)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>{tag}</button>
            )
          })}
        </>
      )}
    </div>
  )
}
