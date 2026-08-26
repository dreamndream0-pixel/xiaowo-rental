'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import FilterBar from './FilterBar'

const INLINE_TAG_COUNT = 5

function readTags(params) {
  return params.get('tags') ? params.get('tags').split(',').filter(Boolean) : []
}

export default function MapFilterStrip({ basePath = '/listings', showMoreFilter = true }) {
  const router = useRouter()
  const params = useSearchParams()
  const [allTags, setAllTags] = useState([])
  const appliedTags = readTags(params)

  useEffect(() => {
    const p = new URLSearchParams()
    if (params.get('city')) p.set('city', params.get('city'))
    if (params.get('district')) p.set('district', params.get('district'))
    if (params.get('keyword')) p.set('keyword', params.get('keyword'))
    if (params.get('type')) p.set('type', params.get('type'))
    if (params.get('landlord')) p.set('landlord', params.get('landlord'))
    if (params.get('minPrice')) p.set('minPrice', params.get('minPrice'))
    if (params.get('maxPrice')) p.set('maxPrice', params.get('maxPrice'))
    fetch('/api/tags?' + p.toString())
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllTags(data)
      })
      .catch(() => setAllTags([]))
  }, [params.toString()])

  const navigateWithTags = (nextTags) => {
    const nextParams = new URLSearchParams(params.toString())
    if (nextTags.length) nextParams.set('tags', nextTags.join(','))
    else nextParams.delete('tags')
    nextParams.delete('page')
    const query = nextParams.toString()
    const target = `${basePath}${query ? `?${query}` : ''}`
    if (window.location.pathname === basePath && window.location.search === (query ? `?${query}` : '')) {
      router.refresh()
      return
    }
    window.location.assign(target)
  }

  const toggleTag = (tag) => {
    const nextTags = appliedTags.includes(tag)
      ? appliedTags.filter(item => item !== tag)
      : [...appliedTags, tag]
    navigateWithTags(nextTags)
  }

  const inlineTags = allTags.slice(0, INLINE_TAG_COUNT)

  if (!inlineTags.length && !showMoreFilter) return null

  return (
    <div className={`merged-filter-strip ${showMoreFilter ? '' : 'is-chips-only'}`}>
      <div className="filter-chip-row" aria-label="快速標籤篩選">
        {inlineTags.map(tag => (
          <button
            key={tag}
            type="button"
            className={`filter-inline-chip ${appliedTags.includes(tag) ? 'is-active' : ''}`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      {showMoreFilter && (
        <details className="merged-control-card filter-control-card">
          <summary>
            <span>篩選條件</span>
            <b>更多篩選</b>
          </summary>
          <div className="merged-control-body">
            <FilterBar />
          </div>
        </details>
      )}
    </div>
  )
}
