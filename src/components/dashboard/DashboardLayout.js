'use client'
// src/components/dashboard/DashboardLayout.js

import { useState } from 'react'
import Link from 'next/link'
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '@/types'
import Button from '@/components/ui/Button'

export default function DashboardLayout({ user, properties, stats }) {
  const [view, setView] = useState('overview')

  const menuItems = [
    { key: 'overview',      icon: '📊', label: '總覽' },
    { key: 'listings',      icon: '🏠', label: '我的房源' },
    { key: 'profile-edit',  icon: '👤', label: '個人頁面設定' },
    { key: 'bookings',      icon: '📅', label: '預約管理', soon: true },
    { key: 'messages',      icon: '💬', label: '訊息中心', soon: true },
    { key: 'analytics',     icon: '📈', label: '數據報表', soon: true },
    { key: 'boost',         icon: '✨', label: '曝光方案', soon: true },
  ]

  const statusDot = { AVAILABLE: '#4E9A52', RENTED: '#6B6B6B', PENDING: '#C9913A', PAUSED: '#ABA9A3', REJECTED: '#C0604A' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100vh - 62px)' }}>

      {/* Sidebar */}
      <div style={{ background: 'white', borderRight: '1px solid var(--oat-mid)', padding: '28px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px 20px', borderBottom: '1px solid var(--oat-mid)', marginBottom: 8 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--oat-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: 'var(--sage-dark)' }}>
            {user.name?.[0] ?? '?'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 10, color: 'var(--sage)', fontFamily: 'Montserrat,sans-serif', letterSpacing: 1 }}>房東</div>
          </div>
        </div>

        {menuItems.map(({ key, icon, label, soon }) => (
          <button key={key} onClick={() => !soon && setView(key)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            fontSize: 13.5, color: view === key ? 'white' : 'var(--gray-mid)',
            background: view === key ? 'var(--sage)' : 'none',
            border: 'none', cursor: soon ? 'default' : 'pointer',
            fontWeight: view === key ? 700 : 500,
            width: '100%', fontFamily: 'inherit', marginBottom: 4,
            transition: 'all 0.2s', opacity: soon ? 0.6 : 1,
          }}
            onMouseEnter={e => { if (!soon && view !== key) { e.currentTarget.style.background = 'var(--sage-bg)'; e.currentTarget.style.color = 'var(--sage-dark)' } }}
            onMouseLeave={e => { if (view !== key) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--gray-mid)' } }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
            <span>{label}</span>
            {soon && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--gray-light)', fontFamily: 'Montserrat,sans-serif' }}>SOON</span>}
          </button>
        ))}

        <div style={{ marginTop: 16, padding: '0 14px' }}>
          <Link href={`/landlord/${user.handle ?? ''}`} style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
            color: 'var(--sage-dark)', textDecoration: 'none',
          }}>🔗 查看我的主頁</Link>
        </div>
      </div>

      {/* Main */}
      <div style={{ background: 'var(--oat-light)', padding: 32, overflowY: 'auto' }}>

        {/* OVERVIEW */}
        {view === 'overview' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>歡迎回來，{user.name} 👋</h1>
              <div style={{ fontSize: 12, color: 'var(--gray-light)', marginTop: 3 }}>
                {new Date().toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { num: stats.total,     label: '總房源數',  change: '' },
                { num: stats.available, label: '可租中',    change: `出租率 ${stats.total ? Math.round((stats.total - stats.available) / stats.total * 100) : 0}%` },
                { num: stats.pending,   label: '審核中',    change: '' },
                { num: 0,               label: '未讀訊息',  change: '即將開放' },
              ].map(({ num, label, change }) => (
                <div key={label} style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--sage-dark)', fontFamily: 'Montserrat,sans-serif' }}>{num}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-light)', letterSpacing: 1, marginTop: 3 }}>{label}</div>
                  {change && <div style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 6 }}>{change}</div>}
                </div>
              ))}
            </div>

            {/* Recent listings */}
            <ListingTable properties={properties.slice(0, 5)} onEdit={() => setView('listings')} />

            {/* Coming soon grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
              {[['📅 預約管理', '租客可直接線上預約看房，您可接受或拒絕預約。'],
                ['💬 訊息中心', '與有意租客一對一聊天，快速確認看房時間。']].map(([title, desc]) => (
                <div key={title} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)', border: '1.5px dashed var(--oat-mid)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-mid)', marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-light)', lineHeight: 1.7 }}>{desc}</div>
                  <span style={{ display: 'inline-block', marginTop: 10, background: 'var(--sage-bg)', color: 'var(--sage-dark)', border: '1.5px solid var(--sage-light)', borderRadius: 20, padding: '4px 14px', fontSize: 10, fontWeight: 700, letterSpacing: 1, fontFamily: 'Montserrat,sans-serif' }}>COMING SOON</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* LISTINGS */}
        {view === 'listings' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 900 }}>我的房源</h1>
                <div style={{ fontSize: 12, color: 'var(--gray-light)', marginTop: 3 }}>共 {properties.length} 筆</div>
              </div>
              <Link href="/post-listing">
                <Button>＋ 新增房源</Button>
              </Link>
            </div>
            <ListingTable properties={properties} />
          </>
        )}

        {/* PROFILE EDIT */}
        {view === 'profile-edit' && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 24 }}>個人頁面設定</h1>
            <div style={{ background: 'var(--sage-bg)', borderRadius: 'var(--radius-md)', padding: '14px 18px', border: '1px solid var(--sage-light)', marginBottom: 20, fontSize: 13, color: 'var(--sage-dark)' }}>
              💡 完整填寫個人資料可增加租客信任度，您的個人頁面網址為：<strong>xiaowo.com.tw/landlord/{user.handle ?? '(設定 handle)'}</strong>
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray-mid)' }}>個人資料編輯表單開發中，即將上線。</div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Listing Table (shared) ─────────────────────
function ListingTable({ properties, onEdit }) {
  const statusColor = { AVAILABLE: '#4E9A52', RENTED: '#6B6B6B', PENDING: '#C9913A', PAUSED: '#ABA9A3', REJECTED: '#C0604A' }

  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--oat-mid)' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>房源列表</div>
        <Link href="/post-listing"><Button size="sm">＋ 新增房源</Button></Link>
      </div>
      {properties.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-light)' }}>尚無房源，點擊「新增房源」開始刊登</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead style={{ background: 'var(--oat-light)' }}>
              <tr>{['房源名稱', '類型', '月租', '狀態', '操作'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'Montserrat,sans-serif', letterSpacing: '1.5px', color: 'var(--gray-light)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {properties.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--oat-light)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--oat-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <Link href={`/property/${p.id}`} style={{ fontWeight: 600, color: 'var(--sage-dark)', textDecoration: 'none', fontSize: 13 }}>{p.title}</Link>
                    <div style={{ fontSize: 11, color: 'var(--gray-light)' }}>{p.district}・{p.size}坪</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13 }}>{PROPERTY_TYPE_LABELS[p.type]}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: 'var(--sage-dark)' }}>${p.price.toLocaleString()}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[p.status] ?? '#888', display: 'inline-block' }} />
                      {PROPERTY_STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link href={`/property/${p.id}`}><Button size="sm" variant="outline">查看</Button></Link>
                      <Link href={`/post-listing?edit=${p.id}`}><Button size="sm" variant="outline">編輯</Button></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
