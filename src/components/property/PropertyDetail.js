'use client'
// src/components/property/PropertyDetail.js

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { PROPERTY_TYPE_LABELS } from '@/types'
import Button from '@/components/ui/Button'

const AMENITY_ICONS = {
  冷氣: '❄️', 冰箱: '🧊', 洗衣機: '👕', 烘衣機: '🔄', 熱水器: '🚿',
  床: '🛏️', 床組: '🛏️', 衣櫃: '🪟', 書桌: '📖', 沙發: '🛋️',
  網路: '📶', 第四台: '📺', 停車位: '🚗', 健身房: '💪',
  游泳池: '🏊', 獨立衛浴: '🚿', 陽台: '🌿', 電梯: '🛗',
}
const amenityIcon = name => AMENITY_ICONS[name] ?? '✓'

const STATUS_CONFIG = {
  AVAILABLE: { label: '可預約', color: '#06C755', bg: '#e6f9ee' },
  RENTED:    { label: '已出租', color: '#e53e3e', bg: '#fff5f5' },
  PAUSED:    { label: '整理中', color: '#d69e2e', bg: '#fffbeb' },
  PENDING:   { label: '審核中', color: '#718096', bg: '#f7fafc' },
}

// ── 房源狀態 Badge ────────────────────────────────────────────────
function StatusBadge({ status, availableFrom }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  const isComingSoon = status === 'PAUSED' && availableFrom && new Date(availableFrom) > new Date()
  const label = isComingSoon
    ? `即將釋出 ${new Date(availableFrom).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })}`
    : cfg.label
  const color = isComingSoon ? '#7B5EA7' : cfg.color
  const bg = isComingSoon ? '#f3eeff' : cfg.bg

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
      color, background: bg, border: `1px solid ${color}22`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  )
}

// ── 預約看房表單 ─────────────────────────────────────────────────
const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '19:00', '20:00']

function BookingModal({ property, onClose }) {
  const [form, setForm] = useState({ date: '', timeslot: '', name: '', phone: '', lineId: '', note: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.date || !form.timeslot || !form.name || !form.phone) {
      setError('請填寫日期、時段、姓名和電話')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '預約失敗')
      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 480,
        padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>預約成功！</div>
            <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginBottom: 24 }}>
              房東將盡快與您聯繫確認看房時間
            </div>
            <button onClick={onClose} style={{
              background: 'var(--sage)', color: 'white', border: 'none',
              borderRadius: 8, padding: '10px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>關閉</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>📅 預約看房</div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-mid)' }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginBottom: 18, padding: '8px 12px', background: 'var(--oat-light)', borderRadius: 8 }}>
              🏠 {property.title}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>看房日期 *</label>
                <input type="date" min={minDateStr} value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>時段 *</label>
                <select value={form.timeslot} onChange={e => set('timeslot', e.target.value)} style={inputStyle}>
                  <option value="">選擇時段</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>姓名 *</label>
              <input placeholder="您的姓名" value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>電話 *</label>
                <input type="tel" placeholder="0912-345-678" value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>LINE ID（選填）</label>
                <input placeholder="your_line_id" value={form.lineId} onChange={e => set('lineId', e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>備註（選填）</label>
              <textarea placeholder="有任何問題或特殊需求可以在這裡說明" value={form.note} onChange={e => set('note', e.target.value)}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} />
            </div>

            {error && <div style={{ color: '#e53e3e', fontSize: 12, marginBottom: 12 }}>⚠️ {error}</div>}

            <button onClick={submit} disabled={loading} style={{
              width: '100%', padding: 13, background: loading ? 'var(--oat-mid)' : 'var(--sage)',
              color: 'white', border: 'none', borderRadius: 10, fontSize: 15,
              fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 1,
            }}>
              {loading ? '送出中...' : '確認預約'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--gray-light)', textAlign: 'center', marginTop: 10 }}>
              預約成功後房東將主動聯繫您・看房不收費
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 11, color: 'var(--gray-mid)', fontWeight: 600, marginBottom: 5 }
const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--oat-mid)',
  borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none',
  background: 'var(--oat-light)',
}

// ── 照片燈箱 ─────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const prev = useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setIdx(i => (i + 1) % images.length), [images.length])

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.15)',
        border: 'none', color: 'white', fontSize: 28, width: 44, height: 44,
        borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center',
      }}>×</button>
      <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
        {idx + 1} / {images.length}
      </div>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 'min(90vw, 1000px)', height: 'min(70vh, 680px)' }}>
        <Image src={images[idx].url} alt={`照片 ${idx + 1}`} fill style={{ objectFit: 'contain' }} />
      </div>
      {images.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); prev() }} style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
          fontSize: 28, width: 52, height: 52, borderRadius: '50%', cursor: 'pointer',
        }}>‹</button>
        <button onClick={e => { e.stopPropagation(); next() }} style={{
          position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
          fontSize: 28, width: 52, height: 52, borderRadius: '50%', cursor: 'pointer',
        }}>›</button>
      </>}
      {images.length > 1 && (
        <div onClick={e => e.stopPropagation()} style={{
          display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center', padding: '0 16px',
        }}>
          {images.map((img, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{
              width: 60, height: 44, position: 'relative', borderRadius: 6, overflow: 'hidden',
              cursor: 'pointer', opacity: i === idx ? 1 : 0.5,
              border: i === idx ? '2px solid white' : '2px solid transparent',
              transition: 'opacity .2s',
            }}>
              <Image src={img.url} alt="" fill style={{ objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Google Maps 嵌入 ──────────────────────────────────────────────
function MapEmbed({ city, district, address }) {
  const [loaded, setLoaded] = useState(false)
  const query = encodeURIComponent(`${city}${district}${address || ''}`)
  const src = `https://maps.google.com/maps?q=${query}&output=embed&hl=zh-TW&z=15`
  return (
    <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--oat-mid)', height: 300, position: 'relative', background: 'var(--oat)' }}>
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--gray-light)', fontSize: 13 }}>
          <div style={{ fontSize: 32 }}>🗺️</div>
          <div>地圖載入中...</div>
        </div>
      )}
      <iframe
        src={src}
        width="100%" height="300" style={{ border: 0, display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity .3s' }}
        allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
        title="房源位置地圖"
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}

// ── 骨架屏（圖片佔位） ────────────────────────────────────────────
function ImageSkeleton({ height = 340 }) {
  return (
    <div style={{
      height, borderRadius: 'var(--radius-lg)',
      background: 'linear-gradient(90deg, var(--oat) 25%, var(--oat-mid) 50%, var(--oat) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s infinite',
    }} />
  )
}

export default function PropertyDetail({ property }) {
  const [currentImg, setCurrentImg] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [imagesReady, setImagesReady] = useState(false)
  const images = property.images ?? []
  const amenities = property.amenities?.map(a => a.name) ?? []
  const lineUrl = property.landlord?.lineOfficialId
    ? `https://line.me/R/ti/p/@${property.landlord.lineOfficialId}`
    : null

  // LINE 一鍵詢問：帶入房源名稱的預填訊息
  const lineInquiryUrl = property.landlord?.lineOfficialId
    ? `https://line.me/R/oaMessage/@${property.landlord.lineOfficialId}/?${encodeURIComponent(`您好，我想詢問「${property.title}」，請問目前是否可以預約看房？`)}`
    : lineUrl

  const isAvailable = property.status === 'AVAILABLE'

  useEffect(() => {
    // 頁面加載後稍微延遲顯示圖片，讓骨架屏有動畫感
    const t = setTimeout(() => setImagesReady(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: -200% 0 }
          100% { background-position: 200% 0 }
        }
        @media (max-width: 768px) {
          .property-detail-layout { grid-template-columns: 1fr !important; }
          .property-contact-column { order: -1; }
          .property-contact-card { position: static !important; }
          .property-gallery-wrap { padding: 12px 16px 0 !important; }
          .property-detail-body { padding: 20px 16px !important; }
          .property-fee-grid { grid-template-columns: 1fr 1fr !important; }
          .property-amenities-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {lightboxOpen && <Lightbox images={images} startIndex={currentImg} onClose={() => setLightboxOpen(false)} />}
      {bookingOpen && <BookingModal property={property} onClose={() => setBookingOpen(false)} />}

      {/* Photo Gallery */}
      <div className="property-gallery-wrap" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 0' }}>
        {!imagesReady ? (
          <ImageSkeleton />
        ) : images.length === 0 ? (
          <div style={{
            height: 280, background: 'var(--oat)', borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, color: 'var(--gray-light)', fontSize: 13,
          }}>
            <span style={{ fontSize: 48 }}>🏠</span>
            <span>房源照片整理中</span>
          </div>
        ) : (
          <div className="property-gallery" style={{
            display: 'grid',
            gridTemplateColumns: images.length >= 3 ? '1.6fr 1fr' : '1fr',
            gap: 8, height: 340, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            <div style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => { setCurrentImg(0); setLightboxOpen(true) }}>
              <Image src={images[0].url} alt={property.title} fill style={{ objectFit: 'cover' }} priority />
              <div style={{
                position: 'absolute', bottom: 12, left: 12,
                background: 'rgba(0,0,0,0.5)', color: 'white',
                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                pointerEvents: 'none',
              }}>🔍 共 {images.length} 張・點擊查看</div>
            </div>
            {images.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 8 }}>
                {images.slice(1, 3).map((img, i) => (
                  <div key={i} style={{ position: 'relative', cursor: 'zoom-in' }}
                    onClick={() => { setCurrentImg(i + 1); setLightboxOpen(true) }}>
                    <Image src={img.url} alt={`照片 ${i + 2}`} fill style={{ objectFit: 'cover' }} loading="lazy" />
                    {i === 1 && images.length > 3 && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 18, fontWeight: 700,
                      }}>+{images.length - 3} 張</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {images.length === 2 && (
              <div style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => { setCurrentImg(1); setLightboxOpen(true) }}>
                <Image src={images[1].url} alt="照片 2" fill style={{ objectFit: 'cover' }} loading="lazy" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="property-detail-body" style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px' }}>
        <div className="property-detail-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 32 }}>

          {/* Left */}
          <div style={{ minWidth: 0 }}>
            {/* 狀態 + 標題 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <StatusBadge status={property.status} availableFrom={property.availableFrom} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1, marginBottom: 6 }}>{property.title}</h1>
            <div style={{ color: 'var(--gray-mid)', fontSize: 14, marginBottom: 16 }}>
              📍 {property.city}{property.district}・{property.address}附近
            </div>

            <div className="property-price-row" style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--sage-dark)' }}>${property.price.toLocaleString()}</span>
              <span style={{ fontSize: 14, color: 'var(--gray-light)' }}>/ 月</span>
              <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>押金 {property.deposit}</span>
            </div>

            {/* 基本資訊標籤 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {[PROPERTY_TYPE_LABELS[property.type], `${property.size} 坪`, property.floor && `${property.floor}F`]
                .filter(Boolean).map(t => (
                  <span key={t} style={{ background: 'var(--sage-bg)', color: 'var(--sage-dark)', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600 }}>{t}</span>
                ))}
            </div>

            {/* 房源特色標籤 */}
            {property.tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
                {property.tags.map(tag => (
                  <span key={tag.name} style={{
                    background: '#fff7e6', color: '#c05621', border: '1px solid #fbd38d',
                    borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                  }}>🏷 {tag.name}</span>
                ))}
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '24px 0' }} />

            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>房源介紹</h2>
            <p style={{ fontSize: 13.5, color: 'var(--gray-mid)', lineHeight: 1.9 }}>{property.description}</p>

            <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '24px 0' }} />

            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>設施設備</h2>
            <div className="property-amenities-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {amenities.map(a => (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-mid)' }}>
                  <span style={{ fontSize: 16 }}>{amenityIcon(a)}</span>{a}
                </div>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '24px 0' }} />

            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>費用明細</h2>
            <div className="property-fee-grid" style={{ background: 'var(--oat-light)', borderRadius: 'var(--radius-md)', padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['月租金',   `$${property.price.toLocaleString()}`],
                ['押金',     property.deposit],
                ['管理費',   property.mgmtFee > 0 ? `$${property.mgmtFee.toLocaleString()} / 月` : '含在租金內'],
                ['電費', property.electricType === 'included' ? '含在租金內'
                  : property.electricType === 'flat' ? '固定平均電價'
                  : property.electricType === 'meter' ? '台水台電計費'
                  : '未設定'],
                ['清潔費',   property.cleaningFee > 0 ? `$${property.cleaningFee.toLocaleString()}` : '無'],
                ['含費用',   [property.inclWifi && '網路', property.inclWater && '水費', property.inclCable && '第四台'].filter(Boolean).join('、') || '無'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: 'var(--gray-light)', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{v}</div>
                </div>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '24px 0' }} />

            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>入住條件</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                [property.allowPets,      '🐾 可養寵物',  '不可養寵物'],
                [property.allowCook,      '🍳 可開伙',    '不可開伙'],
                [property.allowShortTerm, '📅 可短租',    '不可短租'],
                [property.welcomeStudent, '🎓 歡迎學生',  null],
              ].filter(([,, no]) => no !== null || true).map(([ok, yes, no]) => no !== null ? (
                <span key={yes} style={{ background: 'var(--sage-bg)', color: 'var(--sage-dark)', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, opacity: ok ? 1 : 0.4 }}>
                  {ok ? yes : no}
                </span>
              ) : ok ? (
                <span key={yes} style={{ background: 'var(--sage-bg)', color: 'var(--sage-dark)', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600 }}>{yes}</span>
              ) : null)}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '24px 0' }} />

            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📍 位置地圖</h2>
            <MapEmbed city={property.city} district={property.district} address={property.address} />
            <p style={{ fontSize: 12, color: 'var(--gray-light)', marginTop: 8 }}>實際地址於看房確認後提供</p>
          </div>

          {/* Right: Contact Sidebar */}
          <div className="property-contact-column">
            <div className="property-contact-card" style={{
              background: 'white', borderRadius: 'var(--radius-lg)',
              padding: 24, boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--oat-mid)',
              position: 'sticky', top: 80,
            }}>
              <div>
                <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--sage-dark)' }}>${property.price.toLocaleString()}</span>
                <span style={{ fontSize: 12, color: 'var(--gray-light)', marginLeft: 2 }}>/ 月</span>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '16px 0' }} />

              {/* 房東卡片 */}
              <Link href={property.ownerId ? `/site/${property.ownerId}` : property.landlord?.handle ? `/landlord/${property.landlord.handle}` : '#'} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: 14, background: 'var(--oat-light)',
                  borderRadius: 'var(--radius-md)', marginBottom: 16, cursor: 'pointer',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--sage-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--oat-light)'}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--oat-mid)', border: '2px solid var(--sage-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 900, color: 'var(--sage-dark)', flexShrink: 0,
                  }}>
                    {(property.ownerSiteName || property.landlord?.name)?.[0] ?? '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {property.ownerSiteName || property.landlord?.name}
                      {property.landlord?.verified && <span style={{ fontSize: 10, color: 'var(--sage)', marginLeft: 4 }}>✓ 認證</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>
                      管理 {property.landlord?.totalListings ?? 0} 個房源 · {property.landlord?.yearsActive ?? 0} 年資歷
                    </div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'var(--gray-light)', fontSize: 16 }}>›</span>
                </div>
              </Link>

              {/* 預約按鈕 */}
              {isAvailable ? (
                <button onClick={() => setBookingOpen(true)} style={{
                  width: '100%', padding: 13, borderRadius: 'var(--radius-md)', marginBottom: 10,
                  fontSize: 14, fontWeight: 800, letterSpacing: 1, cursor: 'pointer',
                  background: 'var(--sage)', color: 'white', border: 'none',
                  transition: 'background .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--sage-dark)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--sage)'}
                >
                  📅 預約看房
                </button>
              ) : (
                <div style={{
                  width: '100%', padding: 13, borderRadius: 'var(--radius-md)', marginBottom: 10,
                  fontSize: 13, fontWeight: 600, textAlign: 'center',
                  background: 'var(--oat)', color: 'var(--gray-mid)',
                }}>
                  {property.status === 'RENTED' ? '此房源已出租' : '此房源暫不開放預約'}
                </div>
              )}

              {/* LINE 詢問按鈕 */}
              {lineInquiryUrl ? (
                <a href={lineInquiryUrl} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: 13, borderRadius: 'var(--radius-md)',
                  background: '#06C755', color: 'white', fontWeight: 700, fontSize: 14,
                  textDecoration: 'none', boxSizing: 'border-box', transition: 'background .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#05a847'}
                  onMouseLeave={e => e.currentTarget.style.background = '#06C755'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.89c.50 0 .866.35.866.87v4.71c0 .51-.366.87-.866.87H4.635c-.5 0-.866-.36-.866-.87V10.76c0-.52.366-.87.866-.87h14.73zM12 2C6.48 2 2 5.8 2 10.5c0 2.8 1.5 5.3 3.8 6.9l-.5 1.8 2.1-.9c.8.2 1.7.3 2.6.3 5.52 0 10-3.8 10-8.5S17.52 2 12 2z"/></svg>
                  LINE 詢問房東
                </a>
              ) : (
                <div style={{
                  width: '100%', padding: 13, borderRadius: 'var(--radius-md)',
                  background: 'var(--oat)', color: 'var(--gray-mid)', fontWeight: 600,
                  fontSize: 13, textAlign: 'center', boxSizing: 'border-box',
                }}>房東尚未設定 LINE 官方帳號</div>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '16px 0' }} />
              <div style={{ fontSize: 11, color: 'var(--gray-light)', textAlign: 'center', lineHeight: 1.8 }}>
                預約即刻回覆・看房不收費<br />由平台保障安全交易
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 固定 LINE 浮動按鈕（手機版） */}
      {lineInquiryUrl && (
        <a href={lineInquiryUrl} target="_blank" rel="noopener noreferrer" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          background: '#06C755', color: 'white',
          width: 56, height: 56, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(6,199,85,0.4)',
          textDecoration: 'none', fontSize: 28,
        }} title="LINE 詢問房東">💬</a>
      )}
    </>
  )
}
