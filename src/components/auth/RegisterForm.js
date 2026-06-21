'use client'
// src/components/auth/RegisterForm.js
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

const TABS = [
  { id: 'phone',  label: '📱 手機' },
  { id: 'email',  label: '✉️ Email' },
  { id: 'line',   label: '💬 LINE' },
  { id: 'google', label: '🔵 Google' },
]

export default function RegisterForm() {
  const router  = useRouter()
  const [tab, setTab]       = useState('phone')
  const [form, setForm]     = useState({ name: '', phone: '', email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit() {
    setError('')
    if (!form.name) { setError('請填寫姓名'); return }

    if (tab === 'phone') {
      if (!form.phone || !form.password) { setError('請填寫手機號碼和密碼'); return }
      setLoading(true)
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, phone: form.phone, password: form.password, method: 'phone' }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '註冊失敗'); setLoading(false); return }
      await signIn('credentials', { email: form.phone, password: form.password, redirect: false })
      router.push('/account')
    } else if (tab === 'email') {
      if (!form.email || !form.password) { setError('請填寫 Email 和密碼'); return }
      setLoading(true)
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, email: form.email, password: form.password, method: 'email' }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '註冊失敗'); setLoading(false); return }
      await signIn('credentials', { email: form.email, password: form.password, redirect: false })
      router.push('/account')
    }
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 62px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#F5F3EF' }}>
      <div style={{ background: 'white', borderRadius: 24, padding: '36px 32px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="小蝸出租" style={{ height: 100, objectFit: 'contain', marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: '#aaa' }}>選擇您偏好的方式加入</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: '#F5F3EF', borderRadius: 14, padding: 3, marginBottom: 22, gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError('') }} style={{
              padding: '9px 4px', borderRadius: 11, border: 'none', fontFamily: 'inherit',
              fontSize: 11, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer',
              background: tab === t.id ? 'white' : 'transparent',
              color: tab === t.id ? '#3A5740' : '#aaa',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.18s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        {(tab === 'phone' || tab === 'email') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={form.name} onChange={up('name')} placeholder="您的姓名 *" style={inputSt} />

            {tab === 'phone' && (
              <input value={form.phone} onChange={up('phone')} type="tel" placeholder="手機號碼（0912345678）" style={inputSt} />
            )}
            {tab === 'email' && (
              <input value={form.email} onChange={up('email')} type="email" placeholder="Email 地址" style={inputSt} />
            )}

            <input value={form.password} onChange={up('password')} type="password" placeholder="設定密碼（至少 6 個字）"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={inputSt} />

            {error && <div style={{ fontSize: 12, color: '#e53935' }}>{error}</div>}

            <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1, marginTop: 4 }}>
              {loading ? '註冊中...' : '立即註冊'}
            </button>
          </div>
        )}

        {tab === 'line' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 20, lineHeight: 1.8 }}>
              使用 LINE 帳號一鍵登入 / 註冊<br />無需另外設定密碼
            </div>
            <button onClick={() => signIn('line', { callbackUrl: '/account' })} style={{ ...primaryBtn, background: '#06C755', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>💬</span> 使用 LINE 繼續
            </button>
          </div>
        )}

        {tab === 'google' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 20, lineHeight: 1.8 }}>
              使用 Google 帳號一鍵登入 / 註冊<br />無需另外設定密碼
            </div>
            <button onClick={() => signIn('google', { callbackUrl: '/account' })} style={{ ...primaryBtn, background: 'white', color: '#3d3d3d', border: '1.5px solid #EDE8DF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🔵</span> 使用 Google 繼續
            </button>
          </div>
        )}

        <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 20 }}>
          已有帳號？<Link href="/login" style={{ color: '#4E7153', fontWeight: 600, textDecoration: 'none' }}>直接登入</Link>
        </p>
      </div>
    </main>
  )
}

const inputSt = { width: '100%', padding: '12px 14px', border: '1.5px solid #EDE8DF', borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit' }
const primaryBtn = { padding: '13px 0', borderRadius: 12, border: 'none', background: '#4E7153', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }
