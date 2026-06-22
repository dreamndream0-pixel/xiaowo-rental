// src/components/property/PropertyGrid.js
import PropertyCard from './PropertyCard'

export default function PropertyGrid({ properties = [] }) {
  if (properties.length === 0) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--gray-light)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-mid)' }}>找不到符合條件的房源</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>請嘗試調整搜尋條件</div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 20,
    }}>
      {properties.map(p => (
        <PropertyCard key={p.id}
          detailHref={`/property/${p.id}`}
          property={{
            ...p,
            coverUrl: p.images?.[0]?.url ?? p.coverUrl ?? null,
            tags: p.tags?.map(t => typeof t === 'string' ? t : t.name) ?? [],
            // owner.siteName = 房東個人官網名稱（例：小蝸沙鹿館）
            landlordName:     p.owner?.siteName  || p.owner?.name || p.landlordName || p.landlord?.name,
            landlordHandle:   p.owner?.id ? null : p.landlordHandle || p.landlord?.handle || null,
            landlordSiteId:   p.owner?.id        || p.landlordSiteId || null,
            landlordAvatar:   p.owner?.avatar    || p.landlordAvatar || p.landlord?.avatar,
            landlordVerified: p.landlord?.verified || p.landlordVerified || false,
          }} />
      ))}
    </div>
  )
}
