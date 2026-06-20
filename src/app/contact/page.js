'use client'
// src/app/contact/page.js
import { useState } from 'react'
import Navbar from '@/components/layout/NavbarWrapper'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function handleSubmit() {
    if (!form.name || !form.phone) {
      alert('請填寫姓名和電話')
      return
    }
    setLoading(true)
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } catch (_) {}
    setSent(true)
    setLoading(false)
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 62px)', background: 'var(--oat-light)', padding: '48px 20px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 900, color: 'var(--charcoal)', marginBottom: 10 }}>成為房東</h1>
            <p style={{ fontSize: 15, color: 'var(--gray-mid)', lineHeight: 1.8 }}>
              想把房子交給小蝸出租管理嗎？<br />留下聯絡方式，我們會盡快與您聯繫。
            </p>
          </div>

          {/* 聯絡方式卡片 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            <a href="https://lin.ee/5qLEcxX" target="_blank" rel="noreferrer"
              style={contactCard}>
              <div style={{ fontSize: 28 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--charcoal)' }}>LINE 諮詢</div>
              <div style={{ fontSize: 12, color: 'var(--gray-light)' }}>加官方帳號</div>
            </a>
            <a href="tel:0800899969" style={contactCard}>
              <div style={{ fontSize: 28 }}>📞</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--charcoal)' }}>電話聯絡</div>
              <div style={{ fontSize: 12, color: 'var(--gray-light)' }}>0800-899-969</div>
            </a>
          </div>

          {/* 留言表單 */}
          <div style={{ background: 'white', borderRadius: 22, padding: 32, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--charcoal)' }}>或填寫表單，我們主動聯繫您</h2>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8 }}>已收到您的諮詢！</p>
                <p style={{ fontSize: 14, color: 'var(--gray-mid)', lineHeight: 1.8 }}>我們會盡快透過電話或 LINE 與您聯繫。</p>
              </div>
            ) : (
              <>
                <label style={labelStyle}>姓名 *</label>
                <input value={form.name} onChange={update('name')} placeholder="您的稱呼" style={inputStyle} />

                <label style={{ ...labelStyle, marginTop: 14 }}>聯絡電話 *</label>
                <input value={form.phone} onChange={update('phone')} placeholder="0900-000-000" style={inputStyle} />

                <label style={{ ...labelStyle, marginTop: 14 }}>需求說明</label>
                <textarea value={form.message} onChange={update('message')} rows={4} placeholder="例如：我在台中有 3 間套房想出租..."
                  style={{ ...inputStyle, resize: 'vertical' }} />

                <button onClick={handleSubmit} disabled={loading}
                  style={{ width: '100%', marginTop: 24, padding: 14, borderRadius: 12, border: 'none', background: 'var(--sage)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                  {loading ? '送出中...' : '送出諮詢'}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

const contactCard = {
  flex: 1, minWidth: 140, background: 'white', borderRadius: 16, padding: '20px 16px',
  textAlign: 'center', textDecoration: 'none', boxShadow: 'var(--shadow-sm)',
  display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
}
const labelStyle = { fontSize: 12, color: 'var(--gray-mid)', display: 'block', marginBottom: 4 }
const inputStyle = {
  width: '100%', padding: '12px 14px', border: '1.5px solid var(--oat-mid)',
  borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'inherit',
}
