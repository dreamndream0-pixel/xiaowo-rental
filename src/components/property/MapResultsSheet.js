'use client'

import { useEffect, useRef, useState } from 'react'
import { PROPERTY_TYPE_LABELS } from '@/types'

const INITIAL_VISIBLE_COUNT = 10
const LOAD_MORE_COUNT = 10

function coverImage(property) {
  return property.images?.[0]?.url ?? property.coverUrl ?? null
}

function statusText(property) {
  if (property.status === 'COMING_SOON') return '即將釋出'
  if (property.status === 'AVAILABLE') return '可租'
  return property.status || ''
}

function tagNames(property) {
  return property.tags?.map(tag => typeof tag === 'string' ? tag : tag.name).filter(Boolean) ?? []
}

function propertyHref(property) {
  return `/property/${property.id}`
}

function MapSheetCard({ property }) {
  const image = coverImage(property)
  const tags = tagNames(property).slice(0, 5)

  return (
    <a href={propertyHref(property)} className="map-sheet-card">
      <div className="map-sheet-card-image">
        {image ? <img src={image} alt={property.title} loading="lazy" decoding="async" /> : <span>無照片</span>}
        <em>{statusText(property)}</em>
      </div>
      <div className="map-sheet-card-body">
        <div className="map-sheet-card-meta">
          <span>{PROPERTY_TYPE_LABELS[property.type] || property.type || '房源'}</span>
          {property.size ? <span>{property.size} 坪</span> : null}
        </div>
        <strong>{property.title}</strong>
        <p>{property.city}{property.district}</p>
        {tags.length > 0 && (
          <div className="map-sheet-card-tags">
            {tags.map(tag => <span key={tag}>{tag}</span>)}
          </div>
        )}
        <div className="map-sheet-card-footer">
          <span>NT$ {Number(property.price || 0).toLocaleString()} / 月</span>
        </div>
      </div>
    </a>
  )
}

function SelectedMapCard({ property, onClose }) {
  const image = coverImage(property)
  const tags = tagNames(property).slice(0, 3)
  const href = propertyHref(property)
  const openProperty = () => window.location.assign(href)

  return (
    <article className="map-selected-sheet-card" onClick={openProperty} role="link" tabIndex={0}>
      <div className="map-selected-sheet-image">
        {image ? <img src={image} alt={property.title} loading="lazy" decoding="async" /> : <span>無照片</span>}
        <em>{statusText(property)}</em>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClose?.()
          }}
          aria-label="關閉房源卡"
        >
          ×
        </button>
      </div>
      <div className="map-selected-sheet-body">
        <div className="map-selected-sheet-tags">
          <span>{PROPERTY_TYPE_LABELS[property.type] || property.type || '房源'}</span>
          {property.featured ? <span>精選</span> : null}
          {tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
        <strong className="map-selected-sheet-title">{property.title}</strong>
        <p>{property.city}{property.district}</p>
        <div className="map-selected-sheet-footer">
          <strong>NT$ {Number(property.price || 0).toLocaleString()} / 月</strong>
        </div>
      </div>
    </article>
  )
}

function nextLevel(level) {
  if (level === 'collapsed') return 'peek'
  if (level === 'peek') return 'full'
  return 'full'
}

function previousLevel(level) {
  if (level === 'full') return 'peek'
  return 'collapsed'
}

export default function MapResultsSheet({
  properties = [],
  total = 0,
  subtitle = '目前地圖範圍內',
  selectedMode = false,
  level = 'collapsed',
  onLevelChange,
  onClearSelected,
}) {
  const dragRef = useRef({ active: false, startY: 0, deltaY: 0 })
  const ignoreClickRef = useRef(false)
  const gridRef = useRef(null)
  const sentinelRef = useRef(null)
  const [dragY, setDragY] = useState(0)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT)
  }, [properties])

  useEffect(() => {
    if (level === 'full') {
      setVisibleCount(properties.length)
    }
    if (level === 'peek') {
      setVisibleCount(count => Math.max(count, Math.min(properties.length, INITIAL_VISIBLE_COUNT + LOAD_MORE_COUNT)))
    }
  }, [level, properties.length])

  useEffect(() => {
    if (level === 'collapsed') return undefined

    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [level])

  useEffect(() => {
    const element = gridRef.current
    if (!element || level === 'collapsed') return
    const needsMore = element.scrollHeight <= element.clientHeight + 24
    if (needsMore) {
      setVisibleCount(count => Math.min(properties.length, count + LOAD_MORE_COUNT))
    }
  }, [level, visibleCount, properties.length])

  useEffect(() => {
    const root = gridRef.current
    const target = sentinelRef.current
    if (!root || !target || level === 'collapsed') return undefined

    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisibleCount(count => Math.min(properties.length, count + LOAD_MORE_COUNT))
      }
    }, { root, rootMargin: '160px 0px 220px', threshold: 0.01 })

    observer.observe(target)
    return () => observer.disconnect()
  }, [level, properties.length])

  const beginDrag = (event) => {
    dragRef.current = { active: true, startY: event.clientY, deltaY: 0 }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = (event) => {
    if (!dragRef.current.active) return
    const delta = event.clientY - dragRef.current.startY
    dragRef.current.deltaY = delta
    const bounded = level === 'full' || level === 'selected'
      ? Math.max(0, Math.min(360, delta))
      : Math.max(-360, Math.min(240, delta))
    setDragY(bounded)
    event.preventDefault()
  }

  const endDrag = () => {
    if (!dragRef.current.active) return
    const delta = dragRef.current.deltaY
    dragRef.current.active = false
    setDragY(0)
    ignoreClickRef.current = Math.abs(delta) > 8

    if (selectedMode) {
      if (delta > 34) onClearSelected?.()
      return
    }
    if (delta < -28) onLevelChange?.(nextLevel(level))
    if (delta > 28) onLevelChange?.(previousLevel(level))
  }

  const handleClick = () => {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false
      return
    }
    if (!selectedMode) onLevelChange?.(nextLevel(level))
  }

  const handleListScroll = (event) => {
    const element = event.currentTarget
    const nearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 120
    if (nearBottom) {
      setVisibleCount(count => Math.min(properties.length, count + LOAD_MORE_COUNT))
    }
  }

  const visibleProperties = properties.slice(0, visibleCount)
  const countText = `${Number(total || properties.length).toLocaleString()} 間房源`

  return (
    <section
      className={`map-results-sheet is-${level} ${selectedMode ? 'is-selected-mode' : ''}`}
      style={dragY ? { '--sheet-offset': `${dragY}px` } : undefined}
    >
      <button
        type="button"
        className="map-results-sheet-header"
        onClick={handleClick}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="展開或收合房源清單"
      >
        <span className="map-results-sheet-handle" aria-hidden="true">
          <span />
        </span>
        <span className="map-results-sheet-title">
          <strong>{selectedMode ? '已選取房源' : countText}</strong>
          <span>{level === 'collapsed' ? '上拉查看此區域房源' : subtitle}</span>
        </span>
      </button>

      {!selectedMode && level === 'full' && (
        <button type="button" className="map-return-button" onClick={() => onLevelChange?.('collapsed')}>
          地圖
        </button>
      )}

      <div className="map-results-sheet-grid" ref={gridRef} onScroll={handleListScroll}>
        {selectedMode && visibleProperties[0] ? (
          <SelectedMapCard property={visibleProperties[0]} onClose={onClearSelected} />
        ) : visibleProperties.length ? visibleProperties.map(property => (
          <MapSheetCard key={property.id} property={property} />
        )) : (
          <div className="map-results-sheet-empty">目前地圖範圍內沒有房源</div>
        )}
        {visibleCount < properties.length && (
          <button
            type="button"
            className="map-results-sheet-more"
            onClick={() => setVisibleCount(count => Math.min(properties.length, count + LOAD_MORE_COUNT))}
          >
            繼續上滑載入更多
          </button>
        )}
        <div ref={sentinelRef} className="map-results-sheet-sentinel" aria-hidden="true" />
      </div>
    </section>
  )
}
