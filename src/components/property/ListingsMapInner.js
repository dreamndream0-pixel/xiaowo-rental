'use client'

import Link from 'next/link'
import { GoogleMap, InfoWindow, MarkerF, OVERLAY_MOUSE_TARGET, OverlayViewF, useJsApiLoader } from '@react-google-maps/api'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'

const TAIWAN_CENTER = { lat: 23.6978, lng: 120.9605 }
const TAIWAN_BOUNDS = {
  minLat: 21.8,
  maxLat: 25.4,
  minLng: 119.2,
  maxLng: 122.2,
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

function getPosition(property) {
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

export default function ListingsMapInner({ properties, selectedId, onSelect }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mapRef = useRef(null)
  const [popupId, setPopupId] = useState(null)
  const [resolvedPositions, setResolvedPositions] = useState({})

  const getResolvedPosition = useCallback((property) => {
    if (resolvedPositions[property.id]) return resolvedPositions[property.id]
    const stored = getPosition(property)
    return isTaiwanPosition(stored) ? stored : null
  }, [resolvedPositions])

  const mapped = useMemo(() => {
    return properties
      .map(property => ({ ...property, mapPosition: getResolvedPosition(property) }))
      .filter(property => property.mapPosition)
  }, [properties, getResolvedPosition])

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

  useEffect(() => {
    if (!mapRef.current || !window.google) return
    const selected = selectedId ? mapped.find(p => p.id === selectedId) : null
    if (selected) {
      mapRef.current.panTo(selected.mapPosition)
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 14, 15))
      setPopupId(selected.id)
    }
  }, [mapped, selectedId])

  useEffect(() => {
    if (!isLoaded || !window.google) return

    const missing = properties.filter(property => {
      if (resolvedPositions[property.id]) return false
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
          const stored = getPosition(property)
          if (isTaiwanPosition(stored)) next[property.id] = stored
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

  if (!apiKey) {
    return (
      <div className="listings-map-loading">
        <div>
          <strong>尚未設定 Google Maps API Key</strong>
          <span>請在 Vercel 新增 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 後重新部署。</span>
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

  const activePopup = popupId ? mapped.find(p => p.id === popupId) : null

  return (
    <GoogleMap
      mapContainerClassName="listings-map-canvas"
      center={mapped[0]?.mapPosition || TAIWAN_CENTER}
      zoom={mapped[0] ? 14 : 7}
      options={mapOptions}
      onLoad={map => {
        mapRef.current = map
        fitBounds()
      }}
    >
      {mapped.map(property => {
        const selected = property.id === selectedId
        return (
          <Fragment key={property.id}>
            <MarkerF
              position={property.mapPosition}
              icon={markerDotIcon(property, selected)}
              zIndex={selected ? 20 : 10}
              onClick={() => {
                onSelect(property.id)
                setPopupId(property.id)
              }}
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
                onClick={() => {
                  onSelect(property.id)
                  setPopupId(property.id)
                }}
              >
                {property.featured && <span>★</span>}
                {priceLabel(property)}
              </button>
            </OverlayViewF>
          </Fragment>
        )
      })}

      {activePopup && (
        <InfoWindow position={activePopup.mapPosition} onCloseClick={() => setPopupId(null)}>
          <div className="map-popup-card">
            {(activePopup.coverUrl || activePopup.images?.[0]?.url) && (
              <img src={activePopup.coverUrl || activePopup.images?.[0]?.url} alt={activePopup.title} />
            )}
            <div>
              <strong>{activePopup.title}</strong>
              <span>{activePopup.city}{activePopup.district}</span>
              <b>{priceLabel(activePopup)} / 月</b>
              <Link href={`/property/${activePopup.id}`}>查看房源</Link>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}
