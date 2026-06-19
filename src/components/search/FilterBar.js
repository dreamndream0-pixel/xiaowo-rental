'use client'
// src/components/search/FilterBar.js

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

const TAG_INLINE = 8

export default function FilterBar() {
  const router = useRouter()
  const params = useSearchParams()

  // 從 URL 讀取當前已套用的篩選
  const appliedTypes = params.get('type') ? params.get('type').split(',') : []
  const appliedTags  = params.get('tags')  ? params.get('tags').split(',')  : []

  // 本地暫存（未套用）
  const [pendingTypes, setPendingTypes] = useState(appliedTypes)
  const [pendingTags,  setPendingTags]  = useState(appliedTags)
  const [allTags, setAllTags] = useState([])
  const [tagExpanded, setTagExpanded] = useState(false)

  // URL 變化時同步暫存（換頁/清除後重設）
  useEffect(() => {
    setPendingTypes(params.get('type') ? params.get('type').split(',') : [])
    setPendingTags(params.get('tags')   ? params.get('tags').split(',')  : [])
  }, [params.toString()])

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(setAllTags).catch(() => {})
  }, [])

  const types = [
    { value: 'SUITE',        label: '套房' },
    { value: 'ROOM',         label: '雅房' },
    { value: 'WHOLE_FLOOR',  label: '整層住家' },
    { value: 'SHARED_SUITE', label: '分租套房' },
    { value: 'STUDIO',       label: '獨立套房' },
    { value: 'STORE',        label: '店面' },
    { value: 'OFFICE',       label: '辦公' },
    { value: 'LIVE_OFFICE',  label: '住辦' },
    { value: 'FACTORY',      label: '廠房' },
    { value: 'PARKING',      label: '車位' },
    { value: 'LAND',         label: '土地' },
    { value: 'OTHER',        label: '其他' },
  ]

  const toggleType = (value) => {
    setPendingTypes(prev =>
      prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
    )
  }

  const toggleTag = (tag) => {
    setPendingTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const applyFilter = () => {
    const p = new URLSearchParams(params.toString())
    if (pendingTypes.length === 0) p.delete('type')
    else p.set('type', pendingTypes.join(','))
    if (pendingTags.length === 0) p.delete('tags')
    else p.set('tags', pendingTags.join(','))
    p.delete('page')
    router.push(`/listings?${p.toString()}`)
  }

  const clearAll = () => {
    setPendingTypes([])
    setPendingTags([])
    router.push('/listings')
  }

  const setSort = (sort) => {
    const p = new URLSearchParams(params.toString())
    if (sort === 'newest') p.delete('sort')
    else p.set('sort', sort)
    router.push(`/listings?${p.toString()}`)
  }

  const hasApplied  = appliedTypes.length > 0 || appliedTags.length > 0
  const hasPending  = pendingTypes.length > 0  || pendingTags.length > 0
  // 暫存與已套用不同 → 有未套用的變更
  const isDirty = JSON.stringify([...pendingTypes].sort()) !== JSON.stringify([...appliedTypes].sort()) ||
                  JSON.stringify([...pendingTags].sort())  !== JSON.stringify([...appliedTags].sort())

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

      {/* ── 房型（多選）── */}
      <div style={{ marginBottom: 12 }}>
        <span style={labelStyle}>房型（可多選）</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {types.map(({ value, label }) => {
            const active = pendingTypes.includes(value)
            return (
              <button key={value} onClick={() => toggleType(value)} style={{
                padding: '6px 16px', borderRadius: 16, fontSize: 12, fontWeight: active ? 700 : 500,
                border: `1.5px solid ${active ? 'var(--sage)' : 'var(--oat-mid)'}`,
                background: active ? 'var(--sage)' : 'none',
                color: active ? 'white' : 'var(--gray-mid)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}>{label}</button>
            )
          })}
        </div>
      </div>

      {/* ── 標籤條件（多選）── */}
      {allTags.length > 0 && (
        <div style={{ paddingTop: 12, marginBottom: 14, borderTop: '1px solid var(--oat-mid)' }}>
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
          {(pendingTypes.length > 0 || pendingTags.length > 0) && (
            <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.85 }}>
              ({pendingTypes.length + pendingTags.length} 項)
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
