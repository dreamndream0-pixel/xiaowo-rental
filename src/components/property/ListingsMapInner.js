'use client'

import Link from 'next/link'
import { GoogleMap, InfoWindow, OverlayViewF, useJsApiLoader } from '@react-google-maps/api'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const TAIWAN_CENTER = { lat: 23.6978, lng: 120.9605 }

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

function priceLabel(property) {
  return `NT$ ${Number(property.price || 0).toLocaleString()}`
}

export default function ListingsMapInner({ properties, selectedId, onSelect }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mapRef = useRef(null)
  const [popupId, setPopupId] = useState(null)

  const mapped = useMemo(
    () => properties.filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))),
    [properties]
  )

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
      map.setCenter(getPosition(mapped[0]))
      map.setZoom(15)
      return
    }

    const bounds = new window.google.maps.LatLngBounds()
    mapped.forEach(property => bounds.extend(getPosition(property)))
    map.fitBounds(bounds, 60)
  }, [mapped])

  useEffect(() => {
    if (!mapRef.current || !window.google) return
    const selected = selectedId ? mapped.find(p => p.id === selectedId) : null
    if (selected) {
      mapRef.current.panTo(getPosition(selected))
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 14, 15))
      setPopupId(selected.id)
    }
  }, [mapped, selectedId])

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
      center={mapped[0] ? getPosition(mapped[0]) : TAIWAN_CENTER}
      zoom={mapped[0] ? 14 : 7}
      options={mapOptions}
      onLoad={map => {
        mapRef.current = map
        fitBounds()
      }}
    >
      {mapped.map(property => {
        const selected = property.id === selectedId
        const isComingSoon = property.status === 'COMING_SOON'
        return (
          <OverlayViewF
            key={property.id}
            position={getPosition(property)}
            mapPaneName={OverlayViewF.OVERLAY_MOUSE_TARGET}
          >
            <button
              type="button"
              className={`google-price-marker ${selected ? 'is-selected' : ''} ${isComingSoon ? 'is-soon' : ''}`}
              onClick={() => {
                onSelect(property.id)
                setPopupId(property.id)
              }}
            >
              {property.featured && <span>★</span>}
              {priceLabel(property)}
            </button>
          </OverlayViewF>
        )
      })}

      {activePopup && (
        <InfoWindow position={getPosition(activePopup)} onCloseClick={() => setPopupId(null)}>
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
