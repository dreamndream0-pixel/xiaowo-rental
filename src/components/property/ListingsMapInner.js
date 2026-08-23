'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

const TAIWAN_CENTER = [23.6978, 120.9605]

function FitBounds({ properties, selectedId }) {
  const map = useMap()

  useEffect(() => {
    const selected = selectedId ? properties.find(p => p.id === selectedId) : null
    if (selected) {
      map.flyTo([Number(selected.lat), Number(selected.lng)], 16, { duration: 0.45 })
      return
    }

    const points = properties
      .filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
      .map(p => [Number(p.lat), Number(p.lng)])

    if (points.length === 1) {
      map.setView(points[0], 15)
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [32, 32], maxZoom: 15 })
    }
  }, [map, properties, selectedId])

  return null
}

function markerIcon(property, selected) {
  const isComingSoon = property.status === 'COMING_SOON'
  const price = Number(property.price || 0).toLocaleString()
  return L.divIcon({
    className: '',
    html: `
      <div class="map-price-marker ${selected ? 'is-selected' : ''} ${isComingSoon ? 'is-soon' : ''}">
        ${property.featured ? '<span class="map-marker-star">★</span>' : ''}
        <span>NT$ ${price}</span>
      </div>
    `,
    iconSize: [92, 34],
    iconAnchor: [46, 17],
  })
}

export default function ListingsMapInner({ properties, selectedId, onSelect }) {
  const mapped = properties.filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
  const center = mapped[0] ? [Number(mapped[0].lat), Number(mapped[0].lng)] : TAIWAN_CENTER

  return (
    <MapContainer center={center} zoom={mapped[0] ? 14 : 7} scrollWheelZoom className="listings-map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds properties={mapped} selectedId={selectedId} />
      {mapped.map(property => {
        const selected = property.id === selectedId
        return (
          <Marker
            key={property.id}
            position={[Number(property.lat), Number(property.lng)]}
            icon={markerIcon(property, selected)}
            eventHandlers={{ click: () => onSelect(property.id) }}
          >
            <Popup>
              <div className="map-popup-card">
                {property.coverUrl && <img src={property.coverUrl} alt={property.title} />}
                <div>
                  <strong>{property.title}</strong>
                  <span>{property.city}{property.district}</span>
                  <b>NT$ {Number(property.price || 0).toLocaleString()} / 月</b>
                  <Link href={`/property/${property.id}`}>查看房源</Link>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
