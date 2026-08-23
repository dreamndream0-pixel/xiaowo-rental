'use client'

import PropertyCard from './PropertyCard'

function toCardProperty(property) {
  return {
    ...property,
    coverUrl: property.images?.[0]?.url ?? property.coverUrl ?? null,
    tags: property.tags?.map(t => typeof t === 'string' ? t : t.name) ?? [],
    landlordName: property.owner?.siteName || property.owner?.name || property.landlordName || property.landlord?.name,
    landlordHandle: property.owner?.id ? null : property.landlordHandle || property.landlord?.handle || null,
    landlordSiteId: property.owner?.id || property.landlordSiteId || null,
    landlordAvatar: property.owner?.avatar || property.landlordAvatar || property.landlord?.avatar,
    landlordVerified: property.landlord?.verified || property.landlordVerified || false,
  }
}

export default function MapResultsSheet({ properties = [], total = 0, expanded, onToggle }) {
  return (
    <section className={`map-results-sheet ${expanded ? 'is-expanded' : ''}`}>
      <button type="button" className="map-results-sheet-handle" onClick={onToggle} aria-label="切換房源列表高度">
        <span />
      </button>
      <div className="map-results-sheet-title">
        <strong>{Number(total || properties.length).toLocaleString()} 間房源</strong>
        <span>上拉查看更多房源</span>
      </div>
      <div className="map-results-sheet-grid">
        {properties.map(property => (
          <PropertyCard
            key={property.id}
            detailHref={`/property/${property.id}`}
            property={toCardProperty(property)}
          />
        ))}
      </div>
    </section>
  )
}
