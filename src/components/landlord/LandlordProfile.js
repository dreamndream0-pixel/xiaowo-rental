'use client'
// src/components/landlord/LandlordProfile.js

import { useState } from 'react'
import PropertyGrid from '@/components/property/PropertyGrid'
import Button from '@/components/ui/Button'

export default function LandlordProfile({ landlord }) {
  const [tab, setTab] = useState('listings')

  const tabs = [
    { key: 'listings', label: '房源列表' },
    { key: 'about',    label: '關於我' },
  ]

  const stats = [
    { num: landlord.properties?.length ?? 0,    label: '上架房源' },
    { num: landlord.yearsActive ?? 0,            label: '服務年資' },
    { num: landlord.avgRating?.toFixed(1) ?? '—', label: '平均評分' },
    { num: landlord.reviewCount ?? 0,            label: '評價數' },
  ]

  // Shape properties for PropertyCard
  const properties = (landlord.properties ?? []).map(p => ({
    ...p,
    landlordId:       landlord.id,
    landlordName:     landlord.name,
    landlordHandle:   landlord.handle,
    landlordAvatar:   landlord.avatar,
    landlordVerified: landlord.verified,
    coverUrl:         p.images?.[0]?.url ?? null,
    tags:             p.amenities?.map(a => a.name) ?? [],
  }))

  return (
    <>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg, var(--sage-bg) 0%, var(--oat) 100%)', padding: '48px 32px 0', borderBottom: '1px solid var(--oat-mid)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, paddingBottom: 24, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'var(--oat-mid)', border: '4px solid white',
                boxShadow: 'var(--shadow-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontWeight: 900, color: 'var(--sage-dark)',
              }}>
                {landlord.name?.[0] ?? '?'}
              </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 2 }}>{landlord.name}</h1>
                {landlord.verified && (
                  <span style={{ fontSize: 12, color: 'var(--sage)', background: 'var(--sage-bg)', padding: '3px 10px', borderRadius: 8, fontWeight: 700 }}>✓ 認證房東</span>
                )}
              </div>
              {landlord.handle && (
                <div style={{ fontSize: 13, color: 'var(--sage)', fontFamily: 'Montserrat,sans-serif', marginTop: 2 }}>@{landlord.handle}</div>
              )}
              {landlord.bio && (
                <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginTop: 8, maxWidth: 500, lineHeight: 1.7 }}>{landlord.bio}</div>
              )}
              <div style={{ display: 'flex', gap: 28, marginTop: 14, flexWrap: 'wrap' }}>
                {stats.map(({ num, label }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--sage-dark)', fontFamily: 'Montserrat,sans-serif' }}>{num}</div>
                    <div style={{ fontSize: 10, color: 'var(--gray-light)', letterSpacing: 1 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: 8 }}>
              <Button variant="outline">💬 聯絡我</Button>
              <Button>＋ 追蹤</Button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: '10px 20px', fontSize: 13, fontWeight: 600,
                color: tab === key ? 'var(--sage-dark)' : 'var(--gray-mid)',
                border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: `2.5px solid ${tab === key ? 'var(--sage)' : 'transparent'}`,
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 48px' }}>
        {tab === 'listings' && (
          properties.length > 0
            ? <PropertyGrid properties={properties} />
            : <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--gray-light)' }}>
                <div style={{ fontSize: 48 }}>🏠</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-mid)', marginTop: 12 }}>尚未刊登任何房源</div>
              </div>
        )}

        {tab === 'about' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 760 }}>
            <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, letterSpacing: 1 }}>關於 {landlord.name}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-mid)', lineHeight: 1.9 }}>{landlord.bio || '此房東尚未填寫介紹'}</div>
            </div>
            <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, letterSpacing: 1 }}>聯絡方式</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {landlord.lineId && (
                  <div style={{ fontSize: 13, color: 'var(--gray-mid)' }}>💬 LINE：{landlord.lineId}</div>
                )}
              </div>
              <Button style={{ marginTop: 18, width: '100%' }}>傳訊給 {landlord.name}</Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
