'use client'

import { useRef, useState } from 'react'
import PropertyCard from './PropertyCard'

function toCardProperty(property) {
  return {
    ...property,
    coverUrl: property.images?.[0]?.url ?? property.coverUrl ?? null,
    tags: property.tags?.map(t => typeof t === 'string' ? t : t.name) ?? [],
    landlordName: property.owner?.siteName || property.owner?.name || property.landlordName || property.landlord?.name,
    landlordHandle: property.owner?.id ? null : property.landlordHandle || property.landlord?.handle || null,
    landlordSiteId: property.owner?.id || property.landlordSiteId || null,
    landlordAvatar: property.owner?.avatar || property.landlordAvatar || property.landlord?.avatar,
    landlordVerified: property.landlord?.verified || property.landlordVerified || false,
  }
}

export default function MapResultsSheet({ properties = [], total = 0, expanded, onToggle }) {
  const dragRef = useRef({ active: false, startY: 0, deltaY: 0 })
  const ignoreClickRef = useRef(false)
  const [dragY, setDragY] = useState(0)

  const beginDrag = event => {
    dragRef.current = { active: true, startY: event.clientY, deltaY: 0 }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = event => {
    if (!dragRef.current.active) return
    const delta = event.clientY - dragRef.current.startY
    dragRef.current.deltaY = delta
    const bounded = expanded
      ? Math.max(0, Math.min(220, delta))
      : Math.min(0, Math.max(-220, delta))
    setDragY(bounded)
    event.preventDefault()
  }

  const endDrag = () => {
    if (!dragRef.current.active) return
    const delta = dragRef.current.deltaY
    dragRef.current.active = false
    setDragY(0)
    ignoreClickRef.current = Math.abs(delta) > 8
    if (!expanded && delta < -36) onToggle()
    if (expanded && delta > 36) onToggle()
  }

  const handleClick = () => {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false
      return
    }
    onToggle()
  }

  return (
    <section
      className={`map-results-sheet ${expanded ? 'is-expanded' : ''}`}
      style={dragY ? { '--sheet-offset': `${dragY}px` } : undefined}
    >
      <button
        type="button"
        className="map-results-sheet-handle"
        onClick={handleClick}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="切換房源列表高度"
      >
        <span />
      </button>
      <div className="map-results-sheet-title">
        <strong>{Number(total || properties.length).toLocaleString()} 間房源</strong>
        <span>上拉查看更多房源</span>
      </div>
      <div className="map-results-sheet-grid">
        {properties.map(property => (
          <PropertyCard
            key={property.id}
            detailHref={`/property/${property.id}`}
            property={toCardProperty(property)}
          />
        ))}
      </div>
    </section>
  )
}
