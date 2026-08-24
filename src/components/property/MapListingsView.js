'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const VIEW_STATE_KEY = 'xiaowo:listings-map-view-state'
const VIEW_STATE_TTL = 30 * 60 * 1000

function currentListingsUrl() {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname}${window.location.search}`
}

function readSavedViewState() {
  if (typeof window === 'undefined') return null
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(VIEW_STATE_KEY) || 'null')
    if (!saved || saved.url !== currentListingsUrl()) return null
    if (Date.now() - Number(saved.savedAt || 0) > VIEW_STATE_TTL) return null
    return saved
  } catch (_) {
    return null
  }
}

export default function MapListingsView({ properties = [], total = 0 }) {
  const mappedCount = useMemo(() => properties.filter(canShowOnMap).length, [properties])
  const savedStateRef = useRef(null)
  if (savedStateRef.current === null) savedStateRef.current = readSavedViewState()
  const savedState = savedStateRef.current
  const mapStateRef = useRef(savedState?.mapState || null)
  const sheetScrollRef = useRef({
    scrollTop: Number(savedState?.scrollTop || 0),
    visibleCount: Number(savedState?.visibleCount || 0),
  })
  const didHandleInitialPropertiesRef = useRef(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [sheetLevel, setSheetLevel] = useState(savedState?.sheetLevel || 'collapsed')
  const [visibleProperties, setVisibleProperties] = useState(null)
  const sheetProperties = selectedProperty ? [selectedProperty] : (visibleProperties ?? properties)
  const sheetTotal = selectedProperty ? 1 : (visibleProperties ? sheetProperties.length : total)

  const saveViewState = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(VIEW_STATE_KEY, JSON.stringify({
        url: currentListingsUrl(),
        savedAt: Date.now(),
        sheetLevel,
        mapState: mapStateRef.current,
        scrollTop: sheetScrollRef.current.scrollTop || 0,
        visibleCount: sheetScrollRef.current.visibleCount || 0,
      }))
    } catch (_) {}
  }, [sheetLevel])

  useEffect(() => {
    const updateVisualHeight = () => {
      if (typeof window === 'undefined') return
      const height = window.visualViewport?.height || window.innerHeight
      // body 以此高度做直向 flex，main / 面板再以 flex 填滿至可視底部，避免底部露白
      document.documentElement.style.setProperty('--xiaowo-visual-height', `${height}px`)
    }
    updateVisualHeight()
    window.visualViewport?.addEventListener('resize', updateVisualHeight)
    window.visualViewport?.addEventListener('scroll', updateVisualHeight)
    window.addEventListener('resize', updateVisualHeight)
    return () => {
      window.visualViewport?.removeEventListener('resize', updateVisualHeight)
      window.visualViewport?.removeEventListener('scroll', updateVisualHeight)
      window.removeEventListener('resize', updateVisualHeight)
    }
  }, [])

  useEffect(() => {
    if (!didHandleInitialPropertiesRef.current) {
      didHandleInitialPropertiesRef.current = true
      if (savedStateRef.current) return
    }
    setVisibleProperties(null)
    setSelectedId(null)
    setSelectedProperty(null)
    setSheetLevel('collapsed')
  }, [properties])

  return (
    <section className={`merged-map-panel ${sheetLevel !== 'collapsed' || selectedProperty ? 'is-sheet-expanded' : ''}`}>
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
            setSheetLevel('peek')
          }}
          onVisiblePropertiesChange={nextProperties => {
            setVisibleProperties(nextProperties)
          }}
          initialMapState={savedState?.mapState}
          onMapStateChange={nextMapState => {
            mapStateRef.current = nextMapState
          }}
        />
      </div>
      <MapResultsSheet
        properties={sheetProperties}
        total={sheetTotal}
        subtitle={selectedProperty ? '點卡片查看完整房源資訊' : (visibleProperties ? '目前地圖範圍內' : '目前搜尋條件')}
        selectedMode={Boolean(selectedProperty)}
        level={selectedProperty ? 'selected' : sheetLevel}
        onClearSelected={() => {
          setSelectedProperty(null)
          setSheetLevel('collapsed')
        }}
        onLevelChange={nextLevel => setSheetLevel(nextLevel)}
        initialScrollTop={savedState?.scrollTop || 0}
        initialVisibleCount={savedState?.visibleCount || 0}
        onScrollStateChange={nextScrollState => {
          sheetScrollRef.current = nextScrollState
        }}
        onNavigateProperty={saveViewState}
      />
    </section>
  )
}
