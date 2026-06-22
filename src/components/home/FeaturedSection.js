'use client'
// src/components/home/FeaturedSection.js
import { useState, useRef, useCallback, useEffect } from 'react'
import PropertyGrid from '@/components/property/PropertyGrid'

const PAGE_SIZE = 6

export default function FeaturedSection({ initialProperties = [], initialTotal = 0 }) {
  const [properties, setProperties] = useState(initialProperties)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef(null)

  const hasMore = properties.length < total

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const nextPage = page + 1
      const res = await fetch(`/api/properties/featured?page=${nextPage}&limit=${PAGE_SIZE}`)
      const data = await res.json()
      setProperties(prev => [...prev, ...(data.properties || [])])
      setTotal(data.total ?? total)
      setPage(nextPage)
    } catch (_) {}
    setLoading(false)
  }, [loading, hasMore, page, total])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: '300px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <section className="section-wrap">
      <div className="section-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="section-title-main">精選房源</h2>
            <span style={{ fontSize: 13, color: 'var(--gray-light)', fontFamily: 'Montserrat,sans-serif' }}>共 {total} 筆</span>
          </div>
          <p className="section-subtitle">每一間都親自看過、整理過</p>
        </div>
      </div>
      <PropertyGrid properties={properties} />
      {hasMore && (
        <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--gray-light)' }}>
            {loading ? '載入更多房源...' : ''}
          </span>
        </div>
      )}
    </section>
  )
}
