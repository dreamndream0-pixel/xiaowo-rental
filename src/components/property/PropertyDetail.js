'use client'
// src/components/property/PropertyDetail.js

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { PROPERTY_TYPE_LABELS } from '@/types'
import Button from '@/components/ui/Button'

const AMENITY_ICONS = {
  冷氣: '❄️', 冰箱: '🧊', 洗衣機: '👕', 烘衣機: '🔄', 熱水器: '🚿',
  床: '🛏️', 床組: '🛏️', 衣櫃: '🪟', 書桌: '📖', 沙發: '🛋️',
  網路: '📶', 第四台: '📺', 停車位: '🚗', 健身房: '💪',
  游泳池: '🏊', 獨立衛浴: '🚿', 陽台: '🌿', 電梯: '🛗',
}
const amenityIcon = name => AMENITY_ICONS[name] ?? '✓'

export default function PropertyDetail({ property }) {
  const [currentImg, setCurrentImg] = useState(0)
  const images = property.images ?? []
  const amenities = property.amenities?.map(a => a.name) ?? []

  return (
    <>
      {/* Photo Gallery */}
      <div style={{ background: 'var(--oat)', height: 380, position: 'relative', overflow: 'hidden' }}>
        {images.length > 0 ? (
          <>
            <Image
              src={images[currentImg]?.url}
              alt={property.title}
              fill style={{ objectFit: 'cover' }}
              priority
            />
            {/* Thumbnails */}
            {images.length > 1 && (
              <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 6,
              }}>
                {images.map((_, i) => (
                  <button key={i} onClick={() => setCurrentImg(i)} style={{
                    width: i === currentImg ? 24 : 8, height: 8,
                    borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: i === currentImg ? 'white' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.2s',
                  }} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--gray-light)' }}>
            <span style={{ fontSize: 56 }}>🏠</span>
            <span style={{ fontSize: 14, color: 'var(--gray-mid)' }}>房源照片展示區</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>

          {/* Left: Details */}
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1, marginBottom: 6 }}>{property.title}</h1>
            <div style={{ color: 'var(--gray-mid)', fontSize: 14, marginBottom: 16 }}>
              📍 {property.city}{property.district}・{property.address}附近
            </div>

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {amenities.map(a => (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-mid)' }}>
                  <span style={{ fontSize: 16 }}>{amenityIcon(a)}</span>{a}
                </div>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '24px 0' }} />

            {/* Fee breakdown */}
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>費用明細</h2>
            <div style={{ background: 'var(--oat-light)', borderRadius: 'var(--radius-md)', padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
          </div>

          {/* Right: Contact Sidebar */}
          <div>
            <div style={{
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
              <Button variant="outline" style={{ width: '100%', padding: 13, borderRadius: 'var(--radius-md)', fontSize: 14 }}>
                💬 傳訊給房東
              </Button>

              <hr style={{ border: 'none', borderTop: '1px solid var(--oat-mid)', margin: '16px 0' }} />
              <div style={{ fontSize: 11, color: 'var(--gray-light)', textAlign: 'center', lineHeight: 1.8 }}>
                預約即刻回覆・看房不收費<br />由平台保障安全交易
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
