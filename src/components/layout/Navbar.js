'use client'
// src/components/layout/Navbar.js

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'

export default function Navbar() {
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    // 先用快取立即顯示，避免閃爍
    try {
      const cached = localStorage.getItem('site_logo_cache')
      if (cached) setLogoUrl(cached)
    } catch {}
    // 再從 API 更新
    fetch('/api/admin/hero').then(r => r.json()).then(data => {
      if (data && data.logoUrl) {
        setLogoUrl(data.logoUrl)
        try { localStorage.setItem('site_logo_cache', data.logoUrl) } catch {}
      } else {
        // 後台已清除 logo，清掉快取
        try { localStorage.removeItem('site_logo_cache') } catch {}
        setLogoUrl('')
      }
    }).catch(() => {})
  }, [])

  return (
    <>
      <nav className="main-navbar" style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(250,250,248,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--oat-mid)',
        padding: '0 32px', height: 62,
        display: 'flex', alignItems: 'center', gap: 28,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          {logoUrl ? (
            <img src={logoUrl} alt="logo" style={{ height: 40, maxWidth: 180, objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--sage), var(--sage-dark))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>🐌</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1, color: 'var(--charcoal)', lineHeight: 1.1 }}>小蝸出租</div>
                <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 8, letterSpacing: 3, color: 'var(--sage)', fontWeight: 500 }}>SNAIL RENTAL</div>
              </div>
            </div>
          )}
        </Link>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {session ? (
            <>
              <span style={{ background: 'var(--sage-bg)', color: 'var(--sage-dark)', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {session.user.name}
              </span>
              {session.user.role !== 'TENANT' && (
                <Link href="/dashboard" style={{
                  padding: '7px 18px', borderRadius: 20, border: '1.5px solid var(--sage)',
                  color: 'var(--sage-dark)', background: 'none', fontSize: 12.5,
                  fontWeight: 600, textDecoration: 'none',
                }}>後台管理</Link>
              )}
              <button onClick={() => signOut()} style={{
                padding: '7px 18px', borderRadius: 20, background: 'none',
                border: '1.5px solid var(--oat-mid)', color: 'var(--gray-mid)',
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              }}>登出</button>
            </>
          ) : (
            <Link href="/register" className="navbar-register-link" style={{
              padding: '7px 18px', borderRadius: 20, border: '1.5px solid var(--sage)',
              color: 'var(--sage-dark)', background: 'none', fontSize: 12.5,
              fontWeight: 600, textDecoration: 'none',
            }}>租客註冊會員</Link>
          )}
          <Link href="/contact" className="navbar-landlord-link" style={{
            padding: '8px 20px', borderRadius: 20, background: 'var(--sage)',
            color: 'white', fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
          }}>
            <span className="hidden sm:inline">成為房東</span>
            <span className="sm:hidden">成為房東</span>
          </Link>

          {/* Hamburger */}
          <button className="md:hidden" onClick={() => setMobileOpen(o => !o)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 6, display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: 22, height: 2, background: 'var(--charcoal)', borderRadius: 2 }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 62, left: 0, right: 0, bottom: 0,
          background: 'rgba(61,61,61,0.4)', zIndex: 199,
        }} onClick={() => setMobileOpen(false)}>
          <div style={{ background: 'var(--white)', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}
            onClick={e => e.stopPropagation()}>
            {[
              { href: '/', label: '🏡 首頁' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                padding: '12px 16px', borderRadius: 12, fontSize: 14,
                color: 'var(--gray-mid)', textDecoration: 'none', display: 'block',
              }}>{label}</Link>
            ))}
            <div style={{ height: 1, background: 'var(--oat-mid)', margin: '6px 0' }} />
            {session ? (
              <button onClick={() => { signOut(); setMobileOpen(false) }} style={{
                padding: '12px 16px', textAlign: 'left', background: 'none',
                border: 'none', fontSize: 14, color: 'var(--gray-mid)', cursor: 'pointer',
              }}>👤 登出</button>
            ) : (
              <Link href="/register" onClick={() => setMobileOpen(false)} style={{
                padding: '12px 16px', fontSize: 14, color: 'var(--gray-mid)', textDecoration: 'none', display: 'block',
              }}>👤 租客註冊會員</Link>
            )}
            <Link href="/contact" onClick={() => setMobileOpen(false)} style={{
              margin: 8, padding: '12px', borderRadius: 12, background: 'var(--sage)',
              color: 'white', fontWeight: 700, fontSize: 14, textAlign: 'center', textDecoration: 'none',
            }}>成為房東</Link>
          </div>
        </div>
      )}
    </>
  )
}
