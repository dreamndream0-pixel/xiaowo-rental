'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { PROPERTY_TYPE_LABELS } from '@/types'

const ListingsMapInner = dynamic(() => import('./ListingsMapInner'), {
  ssr: false,
  loading: () => <div className="listings-map-loading">地圖載入中</div>,
})

function statusText(property) {
  if (property.status === 'COMING_SOON') {
    if (property.availableFrom) {
      const date = new Date(property.availableFrom).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
      return `即將釋出 ${date}`
    }
    return '即將釋出'
  }
  if (property.status === 'AVAILABLE') return '可承租'
  return property.status || ''
}

function propertyImage(property) {
  return property.images?.[0]?.url ?? property.coverUrl ?? null
}

function canShowOnMap(property) {
  const lat = Number(property.lat)
  const lng = Number(property.lng)
  return (Number.isFinite(lat) && Number.isFinite(lng)) || Boolean(property.city || property.district || property.address)
}

function splitParam(value) {
  return String(value || '').split(',').map(v => v.trim()).filter(Boolean)
}

function priceRangeText(searchParams = {}) {
  const min = Number(searchParams.minPrice || 0)
  const max = Number(searchParams.maxPrice || 999999)
  if (min > 0 && max < 999999) return `NT$ ${min.toLocaleString()} - ${max.toLocaleString()}`
  if (min > 0) return `NT$ ${min.toLocaleString()} 以上`
  if (max < 999999) return `NT$ ${max.toLocaleString()} 以下`
  return '不限租金'
}

function searchTitle(searchParams = {}, total) {
  const district = splitParam(searchParams.district)
  const area = district[0] || searchParams.city || searchParams.keyword || '全部地區'
  return `${area}的房源`
}

function searchSubtitle(searchParams = {}, total) {
  const parts = []
  if (searchParams.city) parts.push(searchParams.city)
  if (searchParams.district) parts.push(splitParam(searchParams.district).join('、'))
  if (searchParams.keyword) parts.push(searchParams.keyword)
  parts.push(`共 ${Number(total || 0).toLocaleString()} 筆`)
  return parts.join(' · ')
}

function SearchConditionPanel({ searchParams, total }) {
  const districts = splitParam(searchParams.district)
  const types = splitParam(searchParams.type).map(type => PROPERTY_TYPE_LABELS[type] || type)

  return (
    <div className="map-condition-row">
      <details className="map-condition-card">
        <summary>
          <span>搜尋條件</span>
          <b>{searchTitle(searchParams, total)}</b>
        </summary>
        <div className="map-condition-grid">
          <span>縣市</span><strong>{searchParams.city || '不限'}</strong>
          <span>行政區</span><strong>{districts.length ? districts.join('、') : '不限'}</strong>
          <span>關鍵字</span><strong>{searchParams.keyword || '不限'}</strong>
          <span>房型</span><strong>{types.length ? types.join('、') : '不限'}</strong>
        </div>
      </details>
      <details className="map-condition-card">
        <summary>
          <span>篩選條件</span>
          <b>{priceRangeText(searchParams)}</b>
        </summary>
        <div className="map-condition-grid">
          <span>租金</span><strong>{priceRangeText(searchParams)}</strong>
          <span>標籤</span><strong>{splitParam(searchParams.tags).join('、') || '不限'}</strong>
          <span>排序</span><strong>精選優先、新上架優先</strong>
          <span>顯示</span><strong>可承租、即將釋出</strong>
        </div>
      </details>
    </div>
  )
}

function MapListCard({ property, active, onSelect, cardRef }) {
  const image = propertyImage(property)

  return (
    <article
      ref={cardRef}
      className={`map-list-card ${active ? 'is-active' : ''}`}
      onMouseEnter={() => onSelect(property.id, { scroll: false })}
      onClick={() => onSelect(property.id, { scroll: false })}
    >
      <Link href={`/property/${property.id}`} className="map-list-image" aria-label={`查看 ${property.title}`}>
        {image ? (
          <Image src={image} alt={property.title} fill sizes="180px" style={{ objectFit: 'cover' }} />
        ) : (
          <span>無照片</span>
        )}
        {property.featured && <em>精選</em>}
      </Link>
      <div className="map-list-main">
        <div className="map-list-title-row">
          <Link href={`/property/${property.id}`} className="map-list-title">{property.title}</Link>
          <span className={property.status === 'COMING_SOON' ? 'map-status-badge soon' : 'map-status-badge'}>{statusText(property)}</span>
        </div>
        <div className="map-list-meta">{property.city}{property.district} · {PROPERTY_TYPE_LABELS[property.type] ?? property.type} · {property.size} 坪</div>
        <div className="map-list-bottom">
          <strong>NT$ {Number(property.price || 0).toLocaleString()} / 月</strong>
          <Link href={`/property/${property.id}`}>查看房源</Link>
        </div>
      </div>
    </article>
  )
}

export default function MapListingsView({ properties = [], total = 0, searchParams = {} }) {
  const mappedCount = useMemo(
    () => properties.filter(canShowOnMap).length,
    [properties]
  )
  const [selectedId, setSelectedId] = useState(properties[0]?.id || null)
  const cardRefs = useRef({})

  const selectProperty = (id, options = {}) => {
    setSelectedId(id)
    if (options.scroll) {
      setTimeout(() => {
        cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
  }

  return (
    <section className="map-results-page">
      <div className="map-results-topbar">
        <Link href="/listings" className="map-back-button" aria-label="返回列表">‹</Link>
        <div className="map-area-pill">
          <strong>{searchTitle(searchParams, total)}</strong>
          <span>{searchSubtitle(searchParams, total)}</span>
        </div>
      </div>

      <SearchConditionPanel searchParams={searchParams} total={total} />

      <div className="map-listings-shell">
        <div className="map-listings-sidebar">
          <div className="map-listings-summary">
            <div>
              <strong>{Number(total || 0).toLocaleString()}</strong>
              <span>符合條件</span>
            </div>
            <div>
              <strong>{mappedCount.toLocaleString()}</strong>
              <span>可在地圖顯示</span>
            </div>
          </div>
          {mappedCount < properties.length && (
            <div className="map-listings-note">
              有 {properties.length - mappedCount} 間房源缺少可定位的縣市、行政區或地址，暫不顯示在地圖。
            </div>
          )}
          <div className="map-listings-scroll">
            {properties.map(property => (
              <MapListCard
                key={property.id}
                property={property}
                active={property.id === selectedId}
                onSelect={selectProperty}
                cardRef={el => { if (el) cardRefs.current[property.id] = el }}
              />
            ))}
          </div>
        </div>
        <div className="map-listings-map">
          <ListingsMapInner properties={properties} selectedId={selectedId} onSelect={id => selectProperty(id, { scroll: false })} />
        </div>
      </div>
    </section>
  )
}
