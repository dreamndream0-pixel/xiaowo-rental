'use client'
// src/components/layout/Navbar.js

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export default function Navbar({ initialLogoUrl = '' }) {
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)

  useEffect(() => {
    // 從 API 更新（上傳新 logo 後即時反映，不需重新整理）
    fetch('/api/admin/hero').then(r => r.json()).then(data => {
      if (data && data.logoUrl) {
        setLogoUrl(data.logoUrl)
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
        display: 'flex', alignItems: 'center',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          {logoUrl && (
            <img src={logoUrl} alt="logo" style={{ height: 40, maxWidth: 180, objectFit: 'contain' }} />
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 62, left: 0, right: 0, zIndex: 199,
          background: 'rgba(250,250,248,0.98)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--oat-mid)',
          padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <Link href="/listings" onClick={() => setMobileOpen(false)} style={{ fontWeight: 600, color: 'var(--charcoal)', textDecoration: 'none' }}>瀏覽房源</Link>
          <Link href="/contact" onClick={() => setMobileOpen(false)} style={{ fontWeight: 600, color: 'var(--sage-dark)', textDecoration: 'none' }}>成為房東</Link>
          {session ? (
            <>
              {session.user.role !== 'TENANT' && <Link href="/dashboard" onClick={() => setMobileOpen(false)} style={{ fontWeight: 600, color: 'var(--charcoal)', textDecoration: 'none' }}>後台管理</Link>}
              <button onClick={() => { signOut(); setMobileOpen(false) }} style={{ background: 'none', border: 'none', textAlign: 'left', fontWeight: 600, color: 'var(--gray-mid)', cursor: 'pointer', padding: 0 }}>登出</button>
            </>
          ) : (
            <Link href="/register" onClick={() => setMobileOpen(false)} style={{ fontWeight: 600, color: 'var(--charcoal)', textDecoration: 'none' }}>租客註冊</Link>
          )}
        </div>
      )}
    </>
  )
}
