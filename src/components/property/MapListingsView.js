'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PROPERTY_TYPE_LABELS } from '@/types'
import MapResultsSheet from './MapResultsSheet'

const ListingsMapInner = dynamic(() => import('./ListingsMapInner'), {
  ssr: false,
  loading: () => <div className="listings-map-loading">地圖載入中</div>,
})

function canShowOnMap(property) {
  const lat = Number(property.lat)
  const lng = Number(property.lng)
  return (Number.isFinite(lat) && Number.isFinite(lng)) || Boolean(property.city || property.district || property.address)
}

function coverImage(property) {
  return property.coverUrl || property.images?.[0]?.url || null
}

function statusText(property) {
  if (property.status === 'COMING_SOON') return '即將釋出'
  if (property.status === 'AVAILABLE') return '可承租'
  return property.status || ''
}

function MapSelectedCard({ property, onClose }) {
  if (!property) return null

  return (
    <article className="map-selected-card">
      <button type="button" className="map-selected-card-close" onClick={onClose} aria-label="關閉房源預覽">
        ×
      </button>
      <Link href={`/property/${property.id}`} className="map-selected-card-image">
        {coverImage(property) ? <img src={coverImage(property)} alt={property.title} /> : <span>無照片</span>}
        <em>{statusText(property)}</em>
      </Link>
      <div className="map-selected-card-body">
        <div className="map-selected-card-tags">
          <span>{PROPERTY_TYPE_LABELS[property.type] || property.type || '房源'}</span>
          {property.featured && <span>精選</span>}
        </div>
        <Link href={`/property/${property.id}`} className="map-selected-card-title">
          {property.title}
        </Link>
        <div className="map-selected-card-location">{property.city}{property.district}</div>
        <div className="map-selected-card-footer">
          <strong>NT$ {Number(property.price || 0).toLocaleString()} / 月</strong>
          <Link href={`/property/${property.id}`}>查看房源</Link>
        </div>
      </div>
    </article>
  )
}

export default function MapListingsView({ properties = [], total = 0 }) {
  const mappedCount = useMemo(() => properties.filter(canShowOnMap).length, [properties])
  const [selectedId, setSelectedId] = useState(properties[0]?.id || null)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [sheetExpanded, setSheetExpanded] = useState(false)

  return (
    <section className={`merged-map-panel ${sheetExpanded ? 'is-sheet-expanded' : ''}`}>
      <div className="merged-map-meta">
        <strong>地圖找房</strong>
        <span>{mappedCount.toLocaleString()} 間可在地圖顯示</span>
      </div>
      <div className="map-listings-map">
        <ListingsMapInner
          properties={properties}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPreviewProperty={property => {
            setSelectedId(property.id)
            setSelectedProperty(property)
            setSheetExpanded(false)
          }}
        />
        <MapSelectedCard property={selectedProperty} onClose={() => setSelectedProperty(null)} />
      </div>
      <MapResultsSheet
        properties={properties}
        total={total}
        expanded={sheetExpanded}
        onToggle={() => {
          setSelectedProperty(null)
          setSheetExpanded(value => !value)
        }}
      />
    </section>
  )
}
