'use client'
// src/components/property/PropertyCard.js

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '@/types'

export default function PropertyCard({ property }) {
  const [fav, setFav] = useState(false)
  const {
    id, title, type, status, city, district,
    size, price, coverUrl, tags = [],
    landlordId, landlordName, landlordHandle, landlordAvatar, landlordVerified,
  } = property

  const statusVariant = {
    AVAILABLE: { label: '可租', color: 'var(--sage-dark)', bg: 'rgba(78,113,83,0.9)' },
    RENTED:    { label: '已租', color: 'white', bg: 'rgba(61,61,61,0.75)' },
    PENDING:   { label: '審核中', color: 'white', bg: 'var(--warn)' },
  }[status] ?? { label: status, color: 'white', bg: 'var(--gray-mid)' }

  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      transition: 'var(--transition)', cursor: 'pointer',
      border: '1px solid transparent',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--oat-mid)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'transparent' }}
    >
      {/* Image */}
      <Link href={`/property/${id}`} style={{ textDecoration: 'none' }}>
        <div style={{ height: 190, position: 'relative', background: 'var(--oat)', overflow: 'hidden' }}>
          {coverUrl ? (
            <Image src={coverUrl} alt={title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 33vw" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--gray-light)', fontSize: 12 }}>
              <span style={{ fontSize: 36 }}>🏠</span>
              <span>上傳照片後顯示</span>
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
          <button onClick={e => { e.preventDefault(); setFav(f => !f) }} style={{
            position: 'absolute', top: 12, right: 12,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(250,250,248,0.92)', border: 'none',
            fontSize: 15, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>{fav ? '❤️' : '🤍'}</button>
        </div>
      </Link>

      {/* Body */}
      <Link href={`/property/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--sage-dark)' }}>
            ${price.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--gray-light)', marginLeft: 2 }}>/月</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, margin: '6px 0 4px', color: 'var(--charcoal)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-mid)' }}>📍 {city}{district}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
            {tags.slice(0, 3).map(t => (
              <span key={t} style={{ background: 'var(--sage-bg)', color: 'var(--sage-dark)', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </Link>

      {/* Footer */}
      <div style={{ padding: '0 18px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--oat-mid)', paddingTop: 12 }}>
        <Link href={landlordHandle ? `/landlord/${landlordHandle}` : '#'} onClick={e => e.stopPropagation()} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 11, color: 'var(--gray-mid)', textDecoration: 'none',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--sage-dark)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--gray-mid)'}
        >
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: 'var(--oat-mid)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'var(--sage-dark)',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {landlordAvatar ? <Image src={landlordAvatar} alt={landlordName} width={22} height={22} style={{ objectFit: 'cover' }} /> : landlordName?.[0] ?? '?'}
          </div>
          {landlordName}
          {landlordVerified && <span style={{ color: 'var(--sage)', fontSize: 9, fontWeight: 700 }}>✓</span>}
        </Link>
        <span style={{ fontSize: 11, color: 'var(--gray-light)', fontFamily: 'Montserrat,sans-serif' }}>{size} 坪</span>
      </div>
    </div>
  )
}
