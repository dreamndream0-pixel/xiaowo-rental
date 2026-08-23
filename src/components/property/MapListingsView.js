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

function priceLabel(property) {
  return `NT$ ${Number(property.price || 0).toLocaleString()}`
}

function statusText(property) {
  if (property.status === 'COMING_SOON') return '即將釋出'
  if (property.status === 'AVAILABLE') return '可承租'
  return property.status || ''
}

function coverImage(property) {
  return property.coverUrl || property.images?.[0]?.url || null
}

function PreviewCard({ property, onClose }) {
  if (!property) return null

  return (
    <article className="map-preview-card">
      <button type="button" className="map-preview-close" onClick={onClose} aria-label="關閉房源預覽">×</button>
      <Link href={`/property/${property.id}`} className="map-preview-image">
        {coverImage(property) ? <img src={coverImage(property)} alt={property.title} /> : <span>無照片</span>}
        <em>{statusText(property)}</em>
      </Link>
      <div className="map-preview-body">
        <div className="map-preview-tags">
          <span>{PROPERTY_TYPE_LABELS[property.type] || property.type || '房源'}</span>
          {property.featured && <span>精選</span>}
        </div>
        <Link href={`/property/${property.id}`} className="map-preview-title">{property.title}</Link>
        <div className="map-preview-location">{property.city}{property.district}</div>
        <div className="map-preview-footer">
          <strong>{priceLabel(property)} / 月</strong>
          <Link href={`/property/${property.id}`}>查看房源</Link>
        </div>
      </div>
    </article>
  )
}

export default function MapListingsView({ properties = [], total = 0 }) {
  const mappedCount = useMemo(() => properties.filter(canShowOnMap).length, [properties])
  const [selectedId, setSelectedId] = useState(properties[0]?.id || null)
  const [previewProperty, setPreviewProperty] = useState(null)
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
            setPreviewProperty(property)
            setSheetExpanded(false)
          }}
        />
        <PreviewCard property={previewProperty} onClose={() => setPreviewProperty(null)} />
      </div>
      <MapResultsSheet
        properties={properties}
        total={total}
        expanded={sheetExpanded}
        onToggle={() => {
          setPreviewProperty(null)
          setSheetExpanded(value => !value)
        }}
      />
    </section>
  )
}
