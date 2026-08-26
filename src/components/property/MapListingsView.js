'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PROPERTY_TYPE_LABELS } from '@/types'
import MapResultsSheet from './MapResultsSheet'

const ListingsMapInner = dynamic(() => import('./ListingsMapInner'), {
  ssr: false,
  loading: () => <div className="listings-map-loading">地圖載入中</div>,
})

function previewImage(property) {
  return property.images?.[0]?.url ?? property.coverUrl ?? null
}

function previewTags(property) {
  return property.tags?.map(tag => typeof tag === 'string' ? tag : tag.name).filter(Boolean) ?? []
}

// 桌機專用：地圖右下角浮動房源預覽卡（手機仍使用底部單張卡，不受影響）
function DesktopMapPreview({ property, onClose }) {
  const router = useRouter()
  const image = previewImage(property)
  const tags = previewTags(property).slice(0, 3)
  const href = `/property/${property.id}`
  return (
    <aside className="map-desktop-preview">
      <button type="button" className="map-desktop-preview-close" onClick={onClose} aria-label="關閉房源卡">×</button>
      <div className="map-desktop-preview-main">
        <div className="map-desktop-preview-image">
          {image ? <img src={image} alt={property.title} loading="lazy" decoding="async" /> : <span>無照片</span>}
        </div>
        <div className="map-desktop-preview-body">
          <strong>{property.title}</strong>
          <p>{property.city}{property.district}</p>
          <div className="map-desktop-preview-tags">
            <span>{PROPERTY_TYPE_LABELS[property.type] || property.type || '房源'}</span>
            {property.size ? <span>{property.size} 坪</span> : null}
            {tags.map(tag => <span key={tag} className="is-feature">{tag}</span>)}
          </div>
          <span className="map-desktop-preview-price">NT$ {Number(property.price || 0).toLocaleString()} / 月</span>
        </div>
      </div>
      <a
        className="map-desktop-preview-cta"
        href={href}
        onClick={(event) => { event.preventDefault(); router.push(href) }}
      >
        查看房源詳情
      </a>
    </aside>
  )
}

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
  const [isDesktop, setIsDesktop] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [sheetLevel, setSheetLevel] = useState(savedState?.sheetLevel || 'collapsed')
  const [visibleProperties, setVisibleProperties] = useState(null)
  // 非手機（≥641px）：清單常駐，選取圖釘只高亮對應卡片、不收合成單張
  const sheetProperties = (selectedProperty && !isDesktop) ? [selectedProperty] : (visibleProperties ?? properties)
  const sheetTotal = (selectedProperty && !isDesktop) ? 1 : (visibleProperties ? sheetProperties.length : total)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(min-width: 641px)')
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange)
    return () => { mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange) }
  }, [])

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
      // main 高度＝可視高度 − 導覽列實際高度，面板再 flex 填滿到可視底部，避免底部露白
      document.documentElement.style.setProperty('--xiaowo-visual-height', `${height}px`)
      const nav = document.querySelector('nav')
      if (nav) {
        const navHeight = Math.round(nav.getBoundingClientRect().height)
        if (navHeight > 0) document.documentElement.style.setProperty('--xiaowo-nav-height', `${navHeight}px`)
      }
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
          abbreviatePrice={isDesktop}
          onPreviewProperty={property => {
            setSelectedId(property.id)
            // 桌機：清單常駐＋高亮卡片，並於地圖右下角顯示浮動預覽卡；
            // 手機：維持底部單張預覽卡（收合層級 peek）
            setSelectedProperty(property)
            if (!isDesktop) setSheetLevel('peek')
          }}
          onVisiblePropertiesChange={nextProperties => {
            setVisibleProperties(nextProperties)
          }}
          initialMapState={savedState?.mapState}
          onMapStateChange={nextMapState => {
            mapStateRef.current = nextMapState
          }}
        />
        {isDesktop && selectedProperty && (
          <DesktopMapPreview
            property={selectedProperty}
            onClose={() => { setSelectedProperty(null); setSelectedId(null) }}
          />
        )}
      </div>
      <MapResultsSheet
        properties={sheetProperties}
        total={sheetTotal}
        selectedId={selectedId}
        subtitle={(selectedProperty && !isDesktop) ? '點卡片查看完整房源資訊' : (visibleProperties ? '目前地圖範圍內' : '目前搜尋條件')}
        selectedMode={Boolean(selectedProperty) && !isDesktop}
        level={(selectedProperty && !isDesktop) ? 'selected' : sheetLevel}
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
