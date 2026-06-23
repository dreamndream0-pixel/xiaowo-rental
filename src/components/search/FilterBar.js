'use client'
// src/components/search/FilterBar.js

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

const TAG_INLINE = 8

export default function FilterBar({ basePath = '/listings' }) {
  const router = useRouter()
  const params = useSearchParams()

  // 從 URL 讀取當前已套用的標籤篩選（房型已移到搜尋欄管理，這裡不重複）
  const appliedTags = params.get('tags') ? params.get('tags').split(',') : []

  // 本地暫存（未套用）
  const [pendingTags, setPendingTags] = useState(appliedTags)
  const [allTags, setAllTags] = useState([])
  const [tagExpanded, setTagExpanded] = useState(false)

  // URL 變化時同步暫存（換頁/清除後重設）
  useEffect(() => {
    setPendingTags(params.get('tags') ? params.get('tags').split(',') : [])
  }, [params.toString()])

  // 帶目前的篩選條件去抓標籤（排除 tags 本身，避免互相鎖死）
  useEffect(() => {
    const p = new URLSearchParams()
    if (params.get('city'))     p.set('city',     params.get('city'))
    if (params.get('district')) p.set('district', params.get('district'))
    if (params.get('keyword'))  p.set('keyword',  params.get('keyword'))
    if (params.get('type'))     p.set('type',     params.get('type'))
    if (params.get('landlord')) p.set('landlord', params.get('landlord'))
    fetch('/api/tags?' + p.toString()).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAllTags(data)
    }).catch(() => {})
  }, [params.toString()])

  const toggleTag = (tag) => {
    setPendingTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const applyFilter = () => {
    const p = new URLSearchParams(params.toString())
    if (pendingTags.length === 0) p.delete('tags')
    else p.set('tags', pendingTags.join(','))
    p.delete('page')
    router.push(`${basePath}?${p.toString()}`)
  }

  const clearAll = () => {
    setPendingTags([])
    const p = new URLSearchParams(params.toString())
    p.delete('tags')
    p.delete('page')
    router.push(`${basePath}?${p.toString()}`)
  }

  const setSort = (sort) => {
    const p = new URLSearchParams(params.toString())
    if (sort === 'newest') p.delete('sort')
    else p.set('sort', sort)
    router.push(`${basePath}?${p.toString()}`)
  }

  const hasApplied = appliedTags.length > 0
  const hasPending = pendingTags.length > 0
  // 暫存與已套用不同 → 有未套用的變更
  const isDirty = JSON.stringify([...pendingTags].sort()) !== JSON.stringify([...appliedTags].sort())

  const extraSelected = pendingTags.filter(t => !allTags.slice(0, TAG_INLINE).includes(t)).length

  const labelStyle = {
    fontSize: 10, fontWeight: 700, color: 'var(--gray-light)',
    letterSpacing: '0.8px', marginBottom: 7, display: 'block',
  }

  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)',
      padding: '14px 20px', marginBottom: 24,
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* ── 頂列：標題 + 排序 + 清除 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ width: 3, height: 16, background: 'var(--sage)', borderRadius: 99, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)' }}>篩選房源</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <select onChange={e => setSort(e.target.value)} defaultValue={params.get('sort') || 'newest'} style={{
            padding: '5px 12px', borderRadius: 14,
            border: '1.5px solid var(--oat-mid)', background: 'none',
            fontSize: 11, color: 'var(--gray-mid)', cursor: 'pointer',
            fontFamily: 'inherit', outline: 'none',
          }}>
            <option value="newest">最新刊登</option>
            <option value="price-asc">價格低到高</option>
            <option value="price-desc">價格高到低</option>
          </select>
          {hasApplied && (
            <button onClick={clearAll} style={{
              fontSize: 11, color: 'var(--gray-light)',
              background: 'none', border: '1px solid var(--oat-mid)', cursor: 'pointer',
              padding: '4px 10px', borderRadius: 8, fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>✕ 清除</button>
          )}
        </div>
      </div>

      {/* ── 標籤條件（多選）── */}
      {allTags.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <span style={labelStyle}>標籤條件（可多選）</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {(tagExpanded ? allTags : allTags.slice(0, TAG_INLINE)).map(tag => {
              const active = pendingTags.includes(tag)
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
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

      {/* ── 套用篩選按鈕 ── */}
      <div style={{ borderTop: '1px solid var(--oat-mid)', paddingTop: 12 }}>
        <button
          onClick={applyFilter}
          disabled={!isDirty && !hasPending}
          style={{
            width: '100%', padding: '11px', borderRadius: 12,
            border: 'none', cursor: isDirty || hasPending ? 'pointer' : 'default',
            background: isDirty ? 'var(--sage)' : 'var(--oat-mid)',
            color: isDirty ? 'white' : 'var(--gray-light)',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          🔍 套用篩選
          {pendingTags.length > 0 && (
            <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.85 }}>
              ({pendingTags.length} 項)
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
