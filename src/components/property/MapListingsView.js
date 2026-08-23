'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { PROPERTY_TYPE_LABELS } from '@/types'

const ListingsMapInner = dynamic(() => import('./ListingsMapInner'), {
  ssr: false,
  loading: () => <div className="listings-map-loading">地圖載入中</div>,
})

function statusText(property) {
  if (property.status === 'COMING_SOON') {
    if (property.availableFrom) {
      const date = new Date(property.availableFrom).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
      return `即將釋出 ${date}`
    }
    return '即將釋出'
  }
  if (property.status === 'AVAILABLE') return '可承租'
  return property.status || ''
}

function propertyImage(property) {
  return property.images?.[0]?.url ?? property.coverUrl ?? null
}

function MapListCard({ property, active, onSelect, cardRef }) {
  const image = propertyImage(property)

  return (
    <article
      ref={cardRef}
      className={`map-list-card ${active ? 'is-active' : ''}`}
      onMouseEnter={() => onSelect(property.id)}
      onClick={() => onSelect(property.id)}
    >
      <Link href={`/property/${property.id}`} className="map-list-image" aria-label={`查看 ${property.title}`}>
        {image ? (
          <Image src={image} alt={property.title} fill sizes="110px" style={{ objectFit: 'cover' }} />
        ) : (
          <span>無照片</span>
        )}
      </Link>
      <div className="map-list-main">
        <div className="map-list-title-row">
          <Link href={`/property/${property.id}`} className="map-list-title">{property.title}</Link>
          {property.featured && <span className="map-featured-badge">精選</span>}
        </div>
        <div className="map-list-meta">{property.city}{property.district} · {PROPERTY_TYPE_LABELS[property.type] ?? property.type} · {property.size} 坪</div>
        <div className="map-list-bottom">
          <strong>NT$ {Number(property.price || 0).toLocaleString()} / 月</strong>
          <span className={property.status === 'COMING_SOON' ? 'soon' : ''}>{statusText(property)}</span>
        </div>
      </div>
    </article>
  )
}

export default function MapListingsView({ properties = [], total = 0 }) {
  const mappedCount = useMemo(
    () => properties.filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))).length,
    [properties]
  )
  const [selectedId, setSelectedId] = useState(properties[0]?.id || null)
  const cardRefs = useRef({})

  const selectProperty = (id) => {
    setSelectedId(id)
    setTimeout(() => {
      cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 80)
  }

  return (
    <section className="map-listings-shell">
      <div className="map-listings-sidebar">
        <div className="map-listings-summary">
          <div>
            <strong>{total}</strong>
            <span>符合條件</span>
          </div>
          <div>
            <strong>{mappedCount}</strong>
            <span>可在地圖顯示</span>
          </div>
        </div>
        {mappedCount < properties.length && (
          <div className="map-listings-note">
            有 {properties.length - mappedCount} 間房源尚未設定座標，會保留在列表但不顯示在地圖上。
          </div>
        )}
        <div className="map-listings-scroll">
          {properties.map(property => (
            <MapListCard
              key={property.id}
              property={property}
              active={property.id === selectedId}
              onSelect={selectProperty}
              cardRef={el => { if (el) cardRefs.current[property.id] = el }}
            />
          ))}
        </div>
      </div>
      <div className="map-listings-map">
        <ListingsMapInner properties={properties} selectedId={selectedId} onSelect={selectProperty} />
      </div>
    </section>
  )
}
