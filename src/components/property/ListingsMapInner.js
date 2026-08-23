'use client'

import Link from 'next/link'
import { GoogleMap, InfoWindow, MarkerF, useJsApiLoader } from '@react-google-maps/api'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

function markerIcon(property, selected) {
  const label = `${property.featured ? '★ ' : ''}${priceLabel(property)}`
  const width = Math.max(94, Math.min(150, 42 + label.length * 7))
  const height = 34
  const bg = property.status === 'COMING_SOON' ? '#C9913A' : selected ? '#3A5740' : '#4E7153'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 8}" viewBox="0 0 ${width} ${height + 8}">
      <filter id="s" x="-20%" y="-30%" width="140%" height="160%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#2E2D2A" flood-opacity=".28"/>
      </filter>
      <g filter="url(#s)">
        <rect x="2" y="2" width="${width - 4}" height="${height}" rx="17" fill="${bg}" stroke="#fff" stroke-width="3"/>
        <path d="M${width / 2 - 6} ${height - 1} L${width / 2} ${height + 7} L${width / 2 + 6} ${height - 1}" fill="${bg}" stroke="#fff" stroke-width="2"/>
      </g>
      <text x="${width / 2}" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#fff">${label}</text>
    </svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(width, height + 8),
    anchor: new window.google.maps.Point(width / 2, height + 8),
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
          <MarkerF
            key={property.id}
            position={property.mapPosition}
            icon={markerIcon(property, selected)}
            zIndex={selected ? 20 : 10}
            onClick={() => {
              onSelect(property.id)
              setPopupId(property.id)
            }}
          />
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
