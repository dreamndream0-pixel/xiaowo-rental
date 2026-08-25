'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PROPERTY_TYPE_LABELS } from '@/types'

const INITIAL_VISIBLE_COUNT = 10
const LOAD_MORE_COUNT = 10

function coverImage(property) {
  return property.images?.[0]?.url ?? property.coverUrl ?? null
}

function statusText(property) {
  if (property.status === 'COMING_SOON') return '即將釋出'
  if (property.status === 'AVAILABLE') return '可租'
  return property.status || ''
}

function tagNames(property) {
  return property.tags?.map(tag => typeof tag === 'string' ? tag : tag.name).filter(Boolean) ?? []
}

function propertyHref(property) {
  return `/property/${property.id}`
}

function openPropertyWithTransition(source, href, beforeNavigate, navigate) {
  beforeNavigate?.()

  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem('xiaowo:property-transition', 'open')
  } catch (_) {}

  if (!source || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigate ? navigate(href) : window.location.assign(href)
    return
  }

  try {
    source.classList.add('is-opening-property')
    document.body.classList.add('property-transition-active')

    window.setTimeout(() => {
      navigate ? navigate(href) : window.location.assign(href)
    }, 190)
  } catch (_) {
    navigate ? navigate(href) : window.location.assign(href)
  }
}

function MapSheetCard({ property, onNavigateProperty, navigate, selected }) {
  const image = coverImage(property)
  const tags = tagNames(property).slice(0, 5)
  const openedRef = useRef(false)
  const href = propertyHref(property)

  const openFrom = (source) => {
    if (openedRef.current) return
    openedRef.current = true
    openPropertyWithTransition(source, href, onNavigateProperty, navigate)
  }

  return (
    <a
      href={href}
      data-pid={property.id}
      className={`map-sheet-card ${selected ? 'is-selected' : ''}`}
      onClick={(event) => {
        event.preventDefault()
        openFrom(event.currentTarget)
      }}
    >
      <div className="map-sheet-card-image">
        {image ? <img src={image} alt={property.title} loading="lazy" decoding="async" /> : <span>無照片</span>}
        <em>{statusText(property)}</em>
      </div>
      <div className="map-sheet-card-body">
        <div className="map-sheet-card-meta">
          <span>{PROPERTY_TYPE_LABELS[property.type] || property.type || '房源'}</span>
          {property.size ? <span>{property.size} 坪</span> : null}
        </div>
        <strong>{property.title}</strong>
        <p>{property.city}{property.district}</p>
        {tags.length > 0 && (
          <div className="map-sheet-card-tags">
            {tags.map(tag => <span key={tag}>{tag}</span>)}
          </div>
        )}
        <div className="map-sheet-card-footer">
          <span>NT$ {Number(property.price || 0).toLocaleString()} / 月</span>
        </div>
      </div>
    </a>
  )
}

function SelectedMapCard({ property, onClose, onNavigateProperty, navigate }) {
  const image = coverImage(property)
  const tags = tagNames(property).slice(0, 3)
  const href = propertyHref(property)
  const openedRef = useRef(false)
  const dragRef = useRef({ startY: 0, active: false })
  const suppressClickRef = useRef(false)
  const openProperty = (source) => {
    if (openedRef.current) return
    openedRef.current = true
    openPropertyWithTransition(source, href, onNavigateProperty, navigate)
  }
  const beginCardDrag = (clientY) => {
    dragRef.current = { startY: clientY, active: true }
    suppressClickRef.current = false
  }
  const moveCardDrag = (clientY) => {
    if (!dragRef.current.active) return
    const delta = clientY - dragRef.current.startY
    if (Math.abs(delta) > 8) suppressClickRef.current = true
  }
  const endCardDrag = (event, clientY) => {
    if (!dragRef.current.active) return
    const delta = clientY - dragRef.current.startY
    dragRef.current.active = false
    if (delta < -44) {
      suppressClickRef.current = true
      event.preventDefault()
      event.stopPropagation()
      openProperty(event.currentTarget)
    }
  }

  return (
    <article
      className="map-selected-sheet-card"
      onClick={(event) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          event.preventDefault()
          event.stopPropagation()
          return
        }
        openProperty(event.currentTarget)
      }}
      onPointerDown={(event) => {
        beginCardDrag(event.clientY)
      }}
      onPointerMove={(event) => {
        moveCardDrag(event.clientY)
      }}
      onPointerUp={(event) => {
        endCardDrag(event, event.clientY)
      }}
      onPointerCancel={() => {
        dragRef.current.active = false
      }}
      onTouchStart={(event) => {
        beginCardDrag(event.touches[0]?.clientY ?? 0)
      }}
      onTouchMove={(event) => {
        const clientY = event.touches[0]?.clientY
        if (typeof clientY !== 'number') return
        moveCardDrag(clientY)
        if (suppressClickRef.current) event.preventDefault()
      }}
      onTouchEnd={(event) => {
        const clientY = event.changedTouches[0]?.clientY
        if (typeof clientY !== 'number') return
        endCardDrag(event, clientY)
      }}
      role="link"
      tabIndex={0}
    >
      <div className="map-selected-sheet-image">
        {image ? <img src={image} alt={property.title} loading="lazy" decoding="async" /> : <span>無照片</span>}
        <em>{statusText(property)}</em>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClose?.()
          }}
          aria-label="關閉房源卡"
        >
          ×
        </button>
      </div>
      <div className="map-selected-sheet-body">
        <div className="map-selected-sheet-tags">
          <span>{PROPERTY_TYPE_LABELS[property.type] || property.type || '房源'}</span>
          {property.featured ? <span>精選</span> : null}
          {tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
        <strong className="map-selected-sheet-title">{property.title}</strong>
        <p>{property.city}{property.district}</p>
        <div className="map-selected-sheet-footer">
          <strong>NT$ {Number(property.price || 0).toLocaleString()} / 月</strong>
        </div>
      </div>
    </article>
  )
}

function nextLevel(level) {
  if (level === 'collapsed') return 'peek'
  if (level === 'peek') return 'full'
  return 'full'
}

function previousLevel(level) {
  if (level === 'full') return 'peek'
  return 'collapsed'
}

export default function MapResultsSheet({
  properties = [],
  total = 0,
  subtitle = '目前地圖範圍內',
  selectedMode = false,
  selectedId = null,
  level = 'collapsed',
  onLevelChange,
  onClearSelected,
  initialScrollTop = 0,
  initialVisibleCount = 0,
  onScrollStateChange,
  onNavigateProperty,
}) {
  const router = useRouter()
  const navigateProperty = (href) => router.push(href)
  const dragRef = useRef({ active: false, startY: 0, deltaY: 0 })
  const ignoreClickRef = useRef(false)
  const gridRef = useRef(null)
  const sentinelRef = useRef(null)
  const [dragY, setDragY] = useState(0)
  const restoredScrollRef = useRef(false)
  // 桌機（≥900px）採「左清單／右地圖」雙欄，清單常駐顯示、不套用手機的拖曳收合
  const [isDesktop, setIsDesktop] = useState(false)
  const [visibleCount, setVisibleCount] = useState(
    Math.max(INITIAL_VISIBLE_COUNT, Number(initialVisibleCount || 0))
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(min-width: 900px)')
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange)
    return () => { mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange) }
  }, [])

  useEffect(() => {
    if (level === 'collapsed') {
      setVisibleCount(INITIAL_VISIBLE_COUNT)
      return
    }

    setVisibleCount(count => {
      const baseCount = count || INITIAL_VISIBLE_COUNT
      return Math.min(properties.length, Math.max(baseCount, Math.min(properties.length, INITIAL_VISIBLE_COUNT)))
    })
  }, [level, properties])

  useEffect(() => {
    onScrollStateChange?.({
      scrollTop: gridRef.current?.scrollTop || 0,
      visibleCount,
    })
  }, [onScrollStateChange, visibleCount])

  useEffect(() => {
    if (level === 'collapsed') return undefined

    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [level])

  useEffect(() => {
    const element = gridRef.current
    if (!element || level === 'collapsed') return
    const needsMore = element.scrollHeight <= element.clientHeight + 24
    if (needsMore) {
      setVisibleCount(count => Math.min(properties.length, count + LOAD_MORE_COUNT))
    }
  }, [level, visibleCount, properties.length])

  useEffect(() => {
    const root = gridRef.current
    const target = sentinelRef.current
    if (!root || !target || level === 'collapsed') return undefined

    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisibleCount(count => Math.min(properties.length, count + LOAD_MORE_COUNT))
      }
    }, { root, rootMargin: '160px 0px 220px', threshold: 0.01 })

    observer.observe(target)
    return () => observer.disconnect()
  }, [level, properties.length])

  const beginDrag = (event) => {
    if (isDesktop) return   // 桌機不使用拖曳收合
    dragRef.current = { active: true, startY: event.clientY, deltaY: 0 }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = (event) => {
    if (!dragRef.current.active) return
    const delta = event.clientY - dragRef.current.startY
    dragRef.current.deltaY = delta
    const bounded = level === 'full' || level === 'selected'
      ? Math.max(0, Math.min(360, delta))
      : Math.max(-360, Math.min(240, delta))
    setDragY(bounded)
    event.preventDefault()
  }

  const endDrag = () => {
    if (!dragRef.current.active) return
    const delta = dragRef.current.deltaY
    dragRef.current.active = false
    setDragY(0)
    ignoreClickRef.current = Math.abs(delta) > 8

    if (selectedMode) {
      if (delta > 34) onClearSelected?.()
      return
    }
    if (delta < -28) onLevelChange?.(nextLevel(level))
    if (delta > 28) onLevelChange?.(previousLevel(level))
  }

  const handleClick = () => {
    if (isDesktop) return   // 桌機清單常駐，點標題不收合
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false
      return
    }
    if (!selectedMode) onLevelChange?.(nextLevel(level))
  }

  const handleListScroll = (event) => {
    const element = event.currentTarget
    onScrollStateChange?.({ scrollTop: element.scrollTop, visibleCount })
    const nearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 120
    if (nearBottom) {
      setVisibleCount(count => Math.min(properties.length, count + LOAD_MORE_COUNT))
    }
  }

  useEffect(() => {
    const element = gridRef.current
    if (!element || restoredScrollRef.current || level === 'collapsed') return
    const scrollTop = Number(initialScrollTop || 0)
    if (scrollTop <= 0) return

    restoredScrollRef.current = true
    requestAnimationFrame(() => {
      element.scrollTop = scrollTop
    })
  }, [initialScrollTop, level, visibleCount])

  // 桌機：選取地圖圖釘 → 確保該卡片已載入、高亮並捲動到可視範圍
  useEffect(() => {
    if (!isDesktop || !selectedId) return
    const idx = properties.findIndex(p => String(p.id) === String(selectedId))
    if (idx < 0) return
    if (idx >= visibleCount) { setVisibleCount(c => Math.min(properties.length, Math.max(c, idx + 3))); return }
    const grid = gridRef.current
    if (!grid) return
    const el = grid.querySelector(`[data-pid="${(window.CSS && CSS.escape) ? CSS.escape(String(selectedId)) : String(selectedId)}"]`)
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId, isDesktop, properties, visibleCount])

  const visibleProperties = properties.slice(0, visibleCount)
  const showList = selectedMode || level !== 'collapsed' || isDesktop
  const countText = `${Number(total || properties.length).toLocaleString()} 間房源`

  return (
    <section
      className={`map-results-sheet is-${level} ${selectedMode ? 'is-selected-mode' : ''} ${isDesktop ? 'is-desktop' : ''}`}
      style={dragY ? { '--sheet-offset': `${dragY}px` } : undefined}
    >
      <button
        type="button"
        className="map-results-sheet-header"
        onClick={handleClick}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="展開或收合房源清單"
      >
        <span className="map-results-sheet-handle" aria-hidden="true">
          <span />
        </span>
        <span className="map-results-sheet-title">
          <strong>{selectedMode ? '已選取房源' : countText}</strong>
          <span>{(level === 'collapsed' && !isDesktop) ? '上拉查看此區域房源' : subtitle}</span>
        </span>
      </button>

      {!selectedMode && level === 'full' && (
        <button type="button" className="map-return-button" onClick={() => onLevelChange?.('collapsed')}>
          地圖
        </button>
      )}

      {showList && (
      <div className="map-results-sheet-grid" ref={gridRef} onScroll={handleListScroll}>
        {selectedMode && visibleProperties[0] ? (
          <SelectedMapCard
            property={visibleProperties[0]}
            onClose={onClearSelected}
            onNavigateProperty={onNavigateProperty}
            navigate={navigateProperty}
          />
        ) : visibleProperties.length ? visibleProperties.map(property => (
          <MapSheetCard key={property.id} property={property} selected={String(property.id) === String(selectedId)} onNavigateProperty={onNavigateProperty} navigate={navigateProperty} />
        )) : (
          <div className="map-results-sheet-empty">目前地圖範圍內沒有房源</div>
        )}
        {visibleCount < properties.length && (
          <button
            type="button"
            className="map-results-sheet-more"
            onClick={() => setVisibleCount(count => Math.min(properties.length, count + LOAD_MORE_COUNT))}
          >
            繼續上滑載入更多
          </button>
        )}
        <div ref={sentinelRef} className="map-results-sheet-sentinel" aria-hidden="true" />
      </div>
      )}
    </section>
  )
}
