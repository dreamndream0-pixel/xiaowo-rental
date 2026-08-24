'use client'

import { GoogleMap, MarkerF, OVERLAY_MOUSE_TARGET, OverlayViewF, useJsApiLoader } from '@react-google-maps/api'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'

const TAIWAN_CENTER = { lat: 23.6978, lng: 120.9605 }
const TAIWAN_BOUNDS = {
  minLat: 21.8,
  maxLat: 25.4,
  minLng: 119.2,
  maxLng: 122.2,
}

const AREA_CENTERS = {
  台中市: { lat: 24.1477, lng: 120.6736 },
  台中市中區: { lat: 24.1417, lng: 120.6806 },
  台中市東區: { lat: 24.1371, lng: 120.6978 },
  台中市南區: { lat: 24.1210, lng: 120.6654 },
  台中市西區: { lat: 24.1437, lng: 120.6637 },
  台中市北區: { lat: 24.1586, lng: 120.6818 },
  台中市北屯區: { lat: 24.1840, lng: 120.6860 },
  台中市西屯區: { lat: 24.1813, lng: 120.6399 },
  台中市南屯區: { lat: 24.1394, lng: 120.6435 },
  台中市太平區: { lat: 24.1265, lng: 120.7184 },
  台中市大里區: { lat: 24.0996, lng: 120.6779 },
  台中市霧峰區: { lat: 24.0615, lng: 120.6995 },
  台中市烏日區: { lat: 24.1045, lng: 120.6236 },
  台中市豐原區: { lat: 24.2521, lng: 120.7224 },
  台中市后里區: { lat: 24.3093, lng: 120.7104 },
  台中市石岡區: { lat: 24.2749, lng: 120.7786 },
  台中市東勢區: { lat: 24.2586, lng: 120.8280 },
  台中市和平區: { lat: 24.2827, lng: 121.1400 },
  台中市新社區: { lat: 24.2340, lng: 120.8095 },
  台中市潭子區: { lat: 24.2117, lng: 120.7030 },
  台中市大雅區: { lat: 24.2252, lng: 120.6506 },
  台中市神岡區: { lat: 24.2578, lng: 120.6735 },
  台中市大肚區: { lat: 24.1537, lng: 120.5421 },
  台中市沙鹿區: { lat: 24.2370, lng: 120.5610 },
  台中市龍井區: { lat: 24.2006, lng: 120.5459 },
  台中市梧棲區: { lat: 24.2542, lng: 120.5312 },
  台中市清水區: { lat: 24.2686, lng: 120.5740 },
  台中市大甲區: { lat: 24.3451, lng: 120.6244 },
  台中市外埔區: { lat: 24.3321, lng: 120.6542 },
  台中市大安區: { lat: 24.3460, lng: 120.5860 },
}

const mapOptions = {
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  clickableIcons: false,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit.station', stylers: [{ visibility: 'simplified' }] },
  ],
}

function getStoredPosition(property) {
  return { lat: Number(property.lat), lng: Number(property.lng) }
}

function isTaiwanPosition(position) {
  return Number.isFinite(position.lat) && Number.isFinite(position.lng) &&
    position.lat >= TAIWAN_BOUNDS.minLat && position.lat <= TAIWAN_BOUNDS.maxLat &&
    position.lng >= TAIWAN_BOUNDS.minLng && position.lng <= TAIWAN_BOUNDS.maxLng
}

function addressQuery(property) {
  return [property.city, property.district, property.address].filter(Boolean).join('')
}

function stableOffset(id = '') {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  const angle = Math.abs(hash % 360) * Math.PI / 180
  const ring = 0.002 + (Math.abs(hash) % 5) * 0.0012
  return { lat: Math.sin(angle) * ring, lng: Math.cos(angle) * ring }
}

function fallbackPosition(property) {
  const base = AREA_CENTERS[`${property.city || ''}${property.district || ''}`] || AREA_CENTERS[property.city]
  if (!base) return null
  const offset = stableOffset(property.id)
  return { lat: base.lat + offset.lat, lng: base.lng + offset.lng }
}

function getInitialPosition(property) {
  const stored = getStoredPosition(property)
  if (isTaiwanPosition(stored)) return stored
  return fallbackPosition(property)
}

function priceLabel(property) {
  return `NT$ ${Number(property.price || 0).toLocaleString()}`
}

function markerDotIcon(property, selected) {
  const color = property.status === 'COMING_SOON' ? '#C9913A' : selected ? '#3A5740' : '#4E7153'
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: selected ? 7 : 6,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  }
}


export default function ListingsMapInner({
  properties,
  selectedId,
  onSelect,
  onPreviewProperty,
  onVisiblePropertiesChange,
  initialMapState,
  onMapStateChange,
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mapRef = useRef(null)
  const restoredMapRef = useRef(false)
  const [resolvedPositions, setResolvedPositions] = useState({})
  const [visibleIds, setVisibleIds] = useState(null)

  const getResolvedPosition = useCallback((property) => {
    return resolvedPositions[property.id] || getInitialPosition(property)
  }, [resolvedPositions])

  const mapped = useMemo(() => {
    return properties
      .map(property => ({ ...property, mapPosition: getResolvedPosition(property) }))
      .filter(property => property.mapPosition)
  }, [properties, getResolvedPosition])

  const renderedMarkers = useMemo(() => {
    const selected = selectedId ? mapped.find(property => property.id === selectedId) : null
    const visibleSet = visibleIds ? new Set(visibleIds) : null
    const candidates = visibleSet ? mapped.filter(property => visibleSet.has(property.id)) : mapped
    const limited = candidates.slice(0, 160)
    if (selected && !limited.some(property => property.id === selected.id)) {
      return [selected, ...limited.slice(0, 159)]
    }
    return limited
  }, [mapped, selectedId, visibleIds])

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'xiaowo-google-maps',
    googleMapsApiKey: apiKey || '',
    language: 'zh-TW',
    region: 'TW',
  })

  const fitBounds = useCallback(() => {
    const map = mapRef.current
    if (!map || !window.google || mapped.length === 0) return

    if (mapped.length === 1) {
      map.setCenter(mapped[0].mapPosition)
      map.setZoom(15)
      return
    }

    const bounds = new window.google.maps.LatLngBounds()
    mapped.forEach(property => bounds.extend(property.mapPosition))
    map.fitBounds(bounds, 60)
  }, [mapped])

  const publishVisibleProperties = useCallback(() => {
    const map = mapRef.current
    if (!map || !window.google || !onVisiblePropertiesChange) return

    const bounds = map.getBounds()
    const center = map.getCenter()
    if (center && onMapStateChange) {
      onMapStateChange({
        center: { lat: center.lat(), lng: center.lng() },
        zoom: map.getZoom(),
      })
    }
    if (!bounds) {
      onVisiblePropertiesChange(mapped)
      return
    }

    const visible = mapped.filter(property => bounds.contains(property.mapPosition))
    setVisibleIds(visible.map(property => property.id))
    onVisiblePropertiesChange(visible)
  }, [mapped, onMapStateChange, onVisiblePropertiesChange])

  const restoreMapState = useCallback((map) => {
    const center = initialMapState?.center
    const zoom = Number(initialMapState?.zoom)
    if (
      restoredMapRef.current ||
      !center ||
      !Number.isFinite(Number(center.lat)) ||
      !Number.isFinite(Number(center.lng))
    ) return false

    map.setCenter({ lat: Number(center.lat), lng: Number(center.lng) })
    if (Number.isFinite(zoom)) map.setZoom(zoom)
    restoredMapRef.current = true
    return true
  }, [initialMapState])

  useEffect(() => {
    if (!mapRef.current || !window.google) return
    const selected = selectedId ? mapped.find(p => p.id === selectedId) : null
    if (selected) {
      mapRef.current.panTo(selected.mapPosition)
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 14, 15))
    }
  }, [mapped, selectedId])

  useEffect(() => {
    if (!isLoaded || !window.google) return

    const missing = properties.filter(property => {
      if (resolvedPositions[property.id]) return false
      if (isTaiwanPosition(getStoredPosition(property))) return false
      return !!addressQuery(property)
    })
    if (!missing.length) return

    let cancelled = false
    const geocoder = new window.google.maps.Geocoder()

    async function resolveAddresses() {
      const next = {}
      for (const property of missing.slice(0, 80)) {
        try {
          const result = await geocoder.geocode({
            address: addressQuery(property),
            region: 'TW',
            componentRestrictions: { country: 'TW' },
          })
          const location = result.results?.[0]?.geometry?.location
          if (location) {
            const position = { lat: location.lat(), lng: location.lng() }
            if (isTaiwanPosition(position)) next[property.id] = position
          }
        } catch (_) {
          const fallback = getInitialPosition(property)
          if (fallback) next[property.id] = fallback
        }
        await new Promise(resolve => setTimeout(resolve, 80))
      }
      if (!cancelled && Object.keys(next).length) {
        setResolvedPositions(prev => ({ ...prev, ...next }))
      }
    }

    resolveAddresses()
    return () => { cancelled = true }
  }, [isLoaded, properties, resolvedPositions])

  useEffect(() => {
    fitBounds()
  }, [fitBounds])

  useEffect(() => {
    publishVisibleProperties()
  }, [publishVisibleProperties])

  if (!apiKey) {
    return (
      <div className="listings-map-loading">
        <div>
          <strong>尚未設定 Google Maps API Key</strong>
          <span>請到 Vercel 新增 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 後重新部署。</span>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="listings-map-loading">
        <div>
          <strong>Google 地圖載入失敗</strong>
          <span>請確認 API Key、網域限制與 Maps JavaScript API 是否啟用。</span>
        </div>
      </div>
    )
  }

  if (!isLoaded) return <div className="listings-map-loading">Google 地圖載入中</div>

  const openProperty = (property) => {
    onSelect(property.id)
    onPreviewProperty?.(property)
  }

  return (
    <GoogleMap
      mapContainerClassName="listings-map-canvas"
      center={mapped[0]?.mapPosition || TAIWAN_CENTER}
      zoom={mapped[0] ? 14 : 7}
      options={mapOptions}
      onLoad={map => {
        mapRef.current = map
        if (!restoreMapState(map)) fitBounds()
        window.setTimeout(publishVisibleProperties, 0)
      }}
      onIdle={publishVisibleProperties}
    >
      {renderedMarkers.map(property => {
        const selected = property.id === selectedId
        return (
          <Fragment key={property.id}>
            <MarkerF
              position={property.mapPosition}
              icon={markerDotIcon(property, selected)}
              zIndex={selected ? 20 : 10}
              onClick={() => openProperty(property)}
            />
            <OverlayViewF
              position={property.mapPosition}
              mapPaneName={OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(width, height) => ({
                x: -(width / 2),
                y: -(height + 12),
              })}
            >
              <button
                type="button"
                className={`google-price-marker ${selected ? 'is-selected' : ''} ${property.status === 'COMING_SOON' ? 'is-soon' : ''}`}
                onClick={() => openProperty(property)}
              >
                {property.featured && <span>★</span>}
                {priceLabel(property)}
              </button>
            </OverlayViewF>
          </Fragment>
        )
      })}
    </GoogleMap>
  )
}
