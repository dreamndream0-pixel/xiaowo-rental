'use client'
// src/components/layout/Navbar.js

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

const MENU_ITEMS = [
  { label: '我的帳號管理', href: '/account',           icon: '👤' },
  { label: '我要刊登',     href: '/property/new',       icon: '🏠' },
  { label: '我的收藏',     href: '/account?tab=favorites', icon: '❤️' },
  { label: '瀏覽記錄',     href: '/account?tab=history',  icon: '👀' },
  { label: '成為超級房東', href: '/account?super=1',    icon: '⭐', gold: true },
]

export default function Navbar({ initialLogoUrl = '' }) {
  const { data: session } = useSession()
  const [logoUrl, setLogoUrl]   = useState(initialLogoUrl)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    fetch('/api/admin/hero', { cache: 'no-store' }).then(r => r.json()).then(d => {
      if (d?.logoUrl) setLogoUrl(d.logoUrl)
    }).catch(() => {})
  }, [])

  // 點外部關閉選單
  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: 'rgba(250,250,248,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--oat-mid)',
      padding: '0 24px', height: 62,
      display: 'flex', alignItems: 'center',
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <img src={logoUrl || '/logo.png'} alt="小蝸出租" style={{ height: 38, maxWidth: 160, objectFit: 'contain' }} />
      </Link>

      {/* Right */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>

        {!session ? (
          /* ── 未登入：只顯示登入 ── */
          <Link href="/login" style={{
            padding: '8px 22px', borderRadius: 22,
            background: 'var(--sage)', color: 'white',
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>登入</Link>

        ) : (
          /* ── 已登入：「我的」+ 漢堡選單 ── */
          <>
            <Link href="/account" style={{
              padding: '7px 18px', borderRadius: 22,
              border: '1.5px solid var(--sage)',
              color: 'var(--sage-dark)', background: 'none',
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>
              {session.user.name?.split(' ')[0] || '我的'}
            </Link>

            {/* 漢堡按鈕 + dropdown */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(o => !o)} style={{
                width: 40, height: 40, borderRadius: 12,
                background: menuOpen ? 'var(--sage-bg)' : 'none',
                border: '1.5px solid var(--oat-mid)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4.5,
                transition: 'background 0.15s',
              }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    display: 'block', width: 18, height: 2,
                    background: menuOpen ? 'var(--sage-dark)' : 'var(--charcoal)',
                    borderRadius: 2, transition: 'all 0.2s',
                    transform: menuOpen && i === 0 ? 'rotate(45deg) translate(4.5px,4.5px)'
                             : menuOpen && i === 2 ? 'rotate(-45deg) translate(4.5px,-4.5px)'
                             : menuOpen && i === 1 ? 'scaleX(0)' : 'none',
                  }} />
                ))}
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'white', borderRadius: 16,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                  border: '1px solid var(--oat-mid)',
                  minWidth: 200, overflow: 'hidden', zIndex: 300,
                }}>
                  {MENU_ITEMS.map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '13px 18px', textDecoration: 'none',
                      color: item.gold ? '#B8860B' : 'var(--charcoal)',
                      fontSize: 14, fontWeight: item.gold ? 700 : 500,
                      background: item.gold ? '#FFFBF0' : 'white',
                      borderTop: item.gold ? '1px solid #F5E9C6' : 'none',
                      transition: 'background 0.12s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = item.gold ? '#FEF3D0' : 'var(--oat-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = item.gold ? '#FFFBF0' : 'white'}
                    >
                      <span style={{ fontSize: 16 }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                  <div style={{ borderTop: '1px solid var(--oat-mid)' }}>
                    <button onClick={() => { signOut(); setMenuOpen(false) }} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '13px 18px',
                      background: 'none', border: 'none', textAlign: 'left',
                      fontSize: 14, color: '#aaa', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--oat-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: 16 }}>🚪</span> 登出
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  )
}
