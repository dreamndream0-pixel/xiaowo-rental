'use client'

import Link from 'next/link'
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

function MapSheetCard({ property }) {
  const image = coverImage(property)
  const tags = tagNames(property).slice(0, 5)

  return (
    <Link href={`/property/${property.id}`} className="map-sheet-card">
      <div className="map-sheet-card-image">
        {image ? <img src={image} alt={property.title} /> : <span>無照片</span>}
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
          <b>查看房源</b>
        </div>
      </div>
    </Link>
  )
}

function SelectedMapCard({ property, onClose }) {
  const image = coverImage(property)
  const tags = tagNames(property).slice(0, 3)
  const propertyHref = `/property/${property.id}`

  return (
    <article className="map-selected-sheet-card">
      <div className="map-selected-sheet-image">
        {image ? <img src={image} alt={property.title} /> : <span>無照片</span>}
        <em>{statusText(property)}</em>
        <button type="button" onClick={onClose} aria-label="關閉房源卡">×</button>
      </div>
      <div className="map-selected-sheet-body">
        <div className="map-selected-sheet-tags">
          <span>{PROPERTY_TYPE_LABELS[property.type] || property.type || '房源'}</span>
          {property.featured ? <span>精選</span> : null}
          {tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
        <Link href={propertyHref} className="map-selected-sheet-title">
          {property.title}
        </Link>
        <p>{property.city}{property.district}</p>
        <div className="map-selected-sheet-footer">
          <strong>NT$ {Number(property.price || 0).toLocaleString()} / 月</strong>
          <button type="button" onClick={() => window.location.assign(propertyHref)}>查看房源</button>
        </div>
      </div>
    </article>
  )
}

export default function MapResultsSheet({ properties = [], total = 0, subtitle = '目前地圖範圍內', selectedMode = false, expanded, onToggle, onClearSelected }) {
  const dragRef = useRef({ active: false, startY: 0, deltaY: 0 })
  const ignoreClickRef = useRef(false)
  const [dragY, setDragY] = useState(0)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT)
  }, [properties])

  useEffect(() => {
    if (!expanded) return undefined

    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [expanded])

  const beginDrag = event => {
    dragRef.current = { active: true, startY: event.clientY, deltaY: 0 }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = event => {
    if (!dragRef.current.active) return
    const delta = event.clientY - dragRef.current.startY
    dragRef.current.deltaY = delta
    const bounded = expanded
      ? Math.max(0, Math.min(320, delta))
      : Math.min(0, Math.max(-320, delta))
    setDragY(bounded)
    event.preventDefault()
  }

  const endDrag = () => {
    if (!dragRef.current.active) return
    const delta = dragRef.current.deltaY
    dragRef.current.active = false
    setDragY(0)
    ignoreClickRef.current = Math.abs(delta) > 8
    if (!expanded && delta < -26) onToggle()
    if (expanded && delta > 26) onToggle()
  }

  const handleClick = () => {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false
      return
    }
    onToggle()
  }

  const handleListScroll = event => {
    const element = event.currentTarget
    const nearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 180
    if (nearBottom) {
      setVisibleCount(count => Math.min(properties.length, count + LOAD_MORE_COUNT))
    }
  }

  const visibleProperties = properties.slice(0, visibleCount)

  return (
    <section
      className={`map-results-sheet ${expanded ? 'is-expanded' : ''} ${selectedMode ? 'is-selected-mode' : ''}`}
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
          <strong>{selectedMode ? '已選取房源' : `${Number(total || properties.length).toLocaleString()} 間房源`}</strong>
          <span>{expanded ? subtitle : '上拉查看此區域房源'}</span>
        </span>
      </button>

      <div className="map-results-sheet-grid" onScroll={handleListScroll}>
        {selectedMode && visibleProperties[0] ? (
          <SelectedMapCard property={visibleProperties[0]} onClose={onClearSelected} />
        ) : visibleProperties.length ? visibleProperties.map(property => (
          <MapSheetCard key={property.id} property={property} />
        )) : (
          <div className="map-results-sheet-empty">目前地圖範圍內沒有房源</div>
        )}
        {visibleCount < properties.length && (
          <div className="map-results-sheet-more">繼續上滑載入更多</div>
        )}
      </div>
    </section>
  )
}
