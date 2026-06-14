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
      {/* 關閉 */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.15)',
        border: 'none', color: 'white', fontSize: 28, width: 44, height: 44,
        borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center',
      }}>×</button>

      {/* 計數 */}
      <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
        {idx + 1} / {images.length}
      </div>

      {/* 主圖 */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 'min(90vw, 1000px)', height: 'min(70vh, 680px)' }}>
        <Image src={images[idx].url} alt={`照片 ${idx + 1}`} fill style={{ objectFit: 'contain' }} />
      </div>

      {/* 左右箭頭 */}
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

      {/* 縮圖列 */}
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
  const query = encodeURIComponent(`${city}${district}${address || ''}`)
  const src = `https://maps.google.com/maps?q=${query}&output=embed&hl=zh-TW&z=15`
  return (
    <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--oat-mid)', height: 300 }}>
      <iframe
        src={src}
        width="100%" height="300" style={{ border: 0, display: 'block' }}
        allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
        title="房源位置地圖"
      />
    </div>
  )
}

export default function PropertyDetail({ property }) {
  const [currentImg, setCurrentImg] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const images = property.images ?? []
  const amenities = property.amenities?.map(a => a.name) ?? []

  // LINE 聯繫 URL（優先用房東設定的 LINE，否則導向首頁）
  const lineUrl = property.landlord?.lineUrl || `https://line.me/ti/p/~${property.landlord?.lineId || ''}`

  return (
    <>
      {/* 照片燈箱 */}
      {lightboxOpen && (
        <Lightbox images={images} startIndex={currentImg} onClose={() => setLightboxOpen(false)} />
      )}

      {/* Photo Gallery 圖片牆 */}
      <div className="property-gallery-wrap" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 0' }}>
        {images.length === 0 ? (
          <div style={{
            height: 280, background: 'var(--oat)', borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, color: 'var(--gray-light)', fontSize: 13,
          }}>
            <span style={{ fontSize: 48 }}>🏠</span>
            <span>房源照片整理中</span>
          </div>
        ) : (
          <div className="property-gallery" style={{ display: 'grid', gridTemplateColumns: images.length >= 3 ? '1.6fr 1fr' : '1fr', gap: 8, height: 340, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {/* 主圖 */}
            <div style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => { setCurrentImg(0); setLightboxOpen(true) }}>
              <Image src={images[0].url} alt={property.title} fill style={{ objectFit: 'cover' }} priority />
              {/* 放大提示 */}
              <div style={{
                position: 'absolute', bottom: 12, left: 12,
                background: 'rgba(0,0,0,0.5)', color: 'white',
                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                pointerEvents: 'none',
              }}>🔍 共 {images.length} 張・點擊查看</div>
            </div>
            {/* 右側縮圖（最多2張） */}
            {images.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 8 }}>
                {images.slice(1, 3).map((img, i) => (
                  <div key={i} style={{ position: 'relative', cursor: 'zoom-in' }}
                    onClick={() => { setCurrentImg(i + 1); setLightboxOpen(true) }}>
                    <Image src={img.url} alt={`照片 ${i + 2}`} fill style={{ objectFit: 'cover' }} />
                    {/* 最後一格顯示「+N 張」 */}
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
            {/* 2張時右側顯示第二張 */}
            {images.length === 2 && (
              <div style={{ position: 'relative', cursor: 'zoom-in' }}
                onClick={() => { setCurrentImg(1); setLightboxOpen(true) }}>
                <Image src={images[1].url} alt="照片 2" fill style={{ objectFit: 'cover' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="property-detail-body" style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px' }}>
        <div className="property-detail-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 32 }}>

          {/* Left: Details */}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1, marginBottom: 6 }}>{property.title}</h1>
            <div style={{ color: 'var(--gray-mid)', fontSize: 14, marginBottom: 16 }}>
              📍 {property.city}{property.district}・{property.address}附近
            </div>

            {/* Price */}
            <div className="property-price-row" style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--sage-dark)' }}>${property.price.toLocaleString()}</span>
              <span style={{ fontSize: 14, color: 'var(--gray-light)' }}>/ 月</span>
              <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>押金 {property.deposit}</span>
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {[PROPERTY_TYPE_LABELS[property.type], `${property.size} 坪`, property.floor && `${property.floor}F`]
                .filter(Boolean).map(t => (
                  <span key={t} style={{ background: 'var(--sage-bg)', color: 'var(--sage-dark)', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600 }}>{t}</span>
                ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '24px 0' }} />

            {/* Description */}
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>房源介紹</h2>
            <p style={{ fontSize: 13.5, color: 'var(--gray-mid)', lineHeight: 1.9 }}>{property.description}</p>

            <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '24px 0' }} />

            {/* Amenities */}
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>設施設備</h2>
            <div className="property-amenities-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {amenities.map(a => (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-mid)' }}>
                  <span style={{ fontSize: 16 }}>{amenityIcon(a)}</span>{a}
                </div>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '24px 0' }} />

            {/* Fee breakdown */}
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>費用明細</h2>
            <div className="property-fee-grid" style={{ background: 'var(--oat-light)', borderRadius: 'var(--radius-md)', padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['月租金',   `$${property.price.toLocaleString()}`],
                ['管理費',   property.mgmtFee > 0 ? `$${property.mgmtFee}` : '含在租金內'],
                ['押金',     property.deposit],
                ['包含費用', [property.inclWifi && '網路', property.inclWater && '水費', property.inclCable && '第四台'].filter(Boolean).join('、') || '無'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: 'var(--gray-light)' }}>{k}</div>
                  <div style={{ fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '24px 0' }} />

            {/* Conditions */}
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>入住條件</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                [property.allowPets,    '🐾 可養寵物',   '不可養寵物'],
                [property.allowCook,    '🍳 可開伙',     '不可開伙'],
                [property.allowShortTerm, '📅 可短租',   '不可短租'],
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

            {/* Google Maps */}
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

              {/* Landlord mini card */}
              <Link href={property.landlord?.handle ? `/landlord/${property.landlord.handle}` : '#'}
                style={{ textDecoration: 'none' }}>
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
                    {property.landlord?.name?.[0] ?? '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {property.landlord?.name}
                      {property.landlord?.verified && <span style={{ fontSize: 10, color: 'var(--sage)', marginLeft: 4 }}>✓ 認證</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>
                      管理 {property.landlord?.totalListings ?? 0} 個房源 · {property.landlord?.yearsActive ?? 0} 年資歷
                    </div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'var(--gray-light)', fontSize: 16 }}>›</span>
                </div>
              </Link>

              <Button style={{ width: '100%', padding: 13, borderRadius: 'var(--radius-md)', marginBottom: 10, fontSize: 14, letterSpacing: 1 }}>
                📅 預約看房
              </Button>

              {/* LINE 按鈕 */}
              <a href={lineUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: 13, borderRadius: 'var(--radius-md)',
                background: '#06C755', color: 'white', fontWeight: 700, fontSize: 14,
                textDecoration: 'none', boxSizing: 'border-box',
                transition: 'background .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#05a847'}
                onMouseLeave={e => e.currentTarget.style.background = '#06C755'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.89c.50 0 .866.35.866.87v4.71c0 .51-.366.87-.866.87H4.635c-.5 0-.866-.36-.866-.87V10.76c0-.52.366-.87.866-.87h14.73zM12 2C6.48 2 2 5.8 2 10.5c0 2.8 1.5 5.3 3.8 6.9l-.5 1.8 2.1-.9c.8.2 1.7.3 2.6.3 5.52 0 10-3.8 10-8.5S17.52 2 12 2z"/></svg>
                LINE 詢問房東
              </a>

              <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '16px 0' }} />
              <div style={{ fontSize: 11, color: 'var(--gray-light)', textAlign: 'center', lineHeight: 1.8 }}>
                預約即刻回覆・看房不收費<br />由平台保障安全交易
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 固定 LINE 浮動按鈕（手機版） */}
      <a href={lineUrl} target="_blank" rel="noopener noreferrer" style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 100,
        background: '#06C755', color: 'white',
        width: 56, height: 56, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 24px rgba(6,199,85,0.4)',
        textDecoration: 'none', fontSize: 28,
        transition: 'transform .15s, box-shadow .15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(6,199,85,0.5)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(6,199,85,0.4)' }}
        title="LINE 詢問房東"
      >
        💬
      </a>
    </>
  )
}
