'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
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

export default function MapListingsView({ properties = [], total = 0 }) {
  const mappedCount = useMemo(() => properties.filter(canShowOnMap).length, [properties])
  const [selectedId, setSelectedId] = useState(properties[0]?.id || null)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [visibleProperties, setVisibleProperties] = useState(null)
  const sheetProperties = visibleProperties ?? properties

  useEffect(() => {
    setVisibleProperties(null)
    setSelectedId(properties[0]?.id || null)
    setSheetExpanded(false)
  }, [properties])

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
            setSheetExpanded(true)
          }}
          onVisiblePropertiesChange={setVisibleProperties}
        />
      </div>
      <MapResultsSheet
        properties={sheetProperties}
        total={sheetProperties.length}
        subtitle={visibleProperties ? '目前地圖範圍內' : '目前搜尋條件'}
        expanded={sheetExpanded}
        onToggle={() => setSheetExpanded(value => !value)}
      />
    </section>
  )
}
