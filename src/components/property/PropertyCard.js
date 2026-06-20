'use client'
// src/components/property/PropertyCard.js

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { PROPERTY_TYPE_LABELS } from '@/types'

const TAG_LIMIT = 6

export default function PropertyCard({ property, detailHref }) {
  const [fav, setFav] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)

  const {
    id, title, type, status, city, district,
    size, price, coverUrl, tags = [],
    landlordName, landlordHandle, landlordSiteId, landlordAvatar, landlordVerified,
  } = property

  const statusVariant = {
    AVAILABLE: { label: '可租', color: 'white', bg: 'rgba(78,113,83,0.9)' },
    RENTED:    { label: '已租', color: 'white', bg: 'rgba(61,61,61,0.75)' },
    PENDING:   { label: '審核中', color: 'white', bg: 'var(--warn)' },
  }[status] ?? { label: status, color: 'white', bg: 'var(--gray-mid)' }

  const propertyHref = detailHref || `/property/${id}`

  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      transition: 'var(--transition)', cursor: 'pointer',
      border: '1px solid transparent', position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--oat-mid)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'transparent' }}
    >
      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(255,255,255,0.72)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--radius-lg)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid var(--oat-mid)',
            borderTopColor: 'var(--sage)',
            animation: 'cardSpin 0.7s linear infinite',
          }} />
          <style>{`@keyframes cardSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Image */}
      <Link href={propertyHref} style={{ textDecoration: 'none' }} onClick={() => setLoading(true)}>
        <div style={{ height: 190, position: 'relative', background: 'var(--oat)', overflow: 'hidden' }}>
          {coverUrl ? (
            <Image src={coverUrl} alt={title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 33vw" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--gray-light)', fontSize: 12 }}>
              <svg width="44" height="44" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <path d="M50 50 m0 -1.5 a1.5 1.5 0 0 1 1.5 1.5 a3.5 3.5 0 0 1 -3.5 3.5 a7 7 0 0 1 -7 -7 a12 12 0 0 1 12 -12 a18 18 0 0 1 18 18 a25 25 0 0 1 -25 25 a33 33 0 0 1 -33 -33"
                  stroke="var(--oat-deep)" strokeWidth="4" strokeLinecap="round" />
              </svg>
              <span style={{ letterSpacing: 1 }}>照片整理中</span>
            </div>
          )}
          {/* Badges */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
            <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: statusVariant.bg, color: statusVariant.color }}>
              {statusVariant.label}
            </span>
            <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: 'rgba(240,237,230,0.95)', color: 'var(--charcoal)' }}>
              {PROPERTY_TYPE_LABELS[type] ?? type}
            </span>
          </div>
          {/* Fav button */}
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); setFav(f => !f) }} style={{
            position: 'absolute', top: 12, right: 12,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(250,250,248,0.92)', border: 'none',
            fontSize: 15, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>{fav ? '❤️' : '🤍'}</button>
        </div>
      </Link>

      {/* Body */}
      <Link href={propertyHref} style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setLoading(true)}>
        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sage)', fontFamily: 'Montserrat,sans-serif' }}>NT$</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage-dark)', fontFamily: 'Montserrat,sans-serif', letterSpacing: -0.5 }}>{price.toLocaleString()}</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--gray-light)' }}>/月</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, margin: '8px 0 4px', color: 'var(--charcoal)', letterSpacing: 0.3, lineHeight: 1.5 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-mid)' }}>📍 {city}{district}</div>
          {tags.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {(tagsOpen ? tags : tags.slice(0, TAG_LIMIT)).map(t => (
                  <span key={t} style={{ background: 'var(--sage-bg)', color: 'var(--sage-dark)', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 600 }}>{t}</span>
                ))}
                {!tagsOpen && tags.length > TAG_LIMIT && (
                  <button onClick={e => { e.preventDefault(); e.stopPropagation(); setTagsOpen(true) }}
                    style={{ background: 'var(--oat-mid)', color: 'var(--gray-mid)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                    +{tags.length - TAG_LIMIT}
                  </button>
                )}
                {tagsOpen && tags.length > TAG_LIMIT && (
                  <button onClick={e => { e.preventDefault(); e.stopPropagation(); setTagsOpen(false) }}
                    style={{ background: 'var(--oat-mid)', color: 'var(--gray-mid)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                    收起
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Footer */}
      <div style={{ padding: '0 18px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--oat-mid)', paddingTop: 12 }}>
        <Link
          href={landlordSiteId ? `/site/${landlordSiteId}` : landlordHandle ? `/landlord/${landlordHandle}` : '#'}
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--gray-mid)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--sage-dark)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--gray-mid)'}
        >
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: 'var(--oat-mid)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'var(--sage-dark)',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {landlordAvatar
              ? <Image src={landlordAvatar} alt={landlordName} width={22} height={22} style={{ objectFit: 'cover' }} />
              : landlordName?.[0] ?? '?'}
          </div>
          {landlordName}
          {landlordVerified && <span style={{ color: 'var(--sage)', fontSize: 9, fontWeight: 700 }}>✓</span>}
        </Link>
        <span style={{ fontSize: 11, color: 'var(--gray-light)', fontFamily: 'Montserrat,sans-serif' }}>{size} 坪</span>
      </div>
    </div>
  )
}
