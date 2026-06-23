'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function RegisterForm() {
  const router = useRouter()
  const [tab, setTab] = useState('phone')
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const up = key => event => setForm(prev => ({ ...prev, [key]: event.target.value }))

  async function handleSubmit(event) {
    event?.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('請填寫姓名')
      return
    }

    const payload = tab === 'phone'
      ? { name: form.name, phone: form.phone, password: form.password, method: 'phone' }
      : { name: form.name, email: form.email, password: form.password, method: 'email' }

    if (tab === 'phone' && (!form.phone || !form.password)) {
      setError('請填寫手機號碼和密碼')
      return
    }
    if (tab === 'email' && (!form.email || !form.password)) {
      setError('請填寫 Email 和密碼')
      return
    }

    setLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '註冊失敗')
      setLoading(false)
      return
    }

    await signIn('credentials', {
      email: tab === 'phone' ? form.phone : form.email,
      password: form.password,
      redirect: false,
    })
    router.push('/account')
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 62px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#F5F3EF' }}>
      <div style={{ background: 'white', borderRadius: 24, padding: '36px 32px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="小蝸出租" style={{ width: '100%', maxWidth: 220, height: 'auto', objectFit: 'contain', marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: '#8A8A8A' }}>建立帳號後即可收藏房源與管理預約</div>
        </div>

        <div style={{ display: 'flex', background: '#F5F3EF', borderRadius: 12, padding: 3, marginBottom: 20 }}>
          {[['phone', '手機註冊'], ['email', 'Email 註冊']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setTab(value); setError('') }}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === value ? 700 : 400, cursor: 'pointer', background: tab === value ? 'white' : 'transparent', color: tab === value ? '#3A5740' : '#8A8A8A', boxShadow: tab === value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.18s' }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={form.name} onChange={up('name')} placeholder="姓名 *" style={inputSt} />

          {tab === 'phone' ? (
            <input value={form.phone} onChange={up('phone')} type="tel" placeholder="手機號碼，例如 0912345678" style={inputSt} />
          ) : (
            <input value={form.email} onChange={up('email')} type="email" placeholder="Email 地址" style={inputSt} />
          )}

          <input value={form.password} onChange={up('password')} type="password" placeholder="設定密碼，至少 6 個字" style={inputSt} />

          {error && <div style={{ fontSize: 12, color: '#e53935' }}>{error}</div>}

          <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1, marginTop: 4 }}>
            {loading ? '註冊中...' : '立即註冊'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#EDE8DF' }} />
          <span style={{ fontSize: 11, color: '#B9B3AA' }}>或直接使用</span>
          <div style={{ flex: 1, height: 1, background: '#EDE8DF' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <OAuthBtn onClick={() => signIn('line', { callbackUrl: '/account' })} color="#06C755" textColor="white" icon="/auth-line.png" label="LINE 登入 / 註冊" />
          <OAuthBtn onClick={() => signIn('google', { callbackUrl: '/account' })} color="white" textColor="#3d3d3d" border="#EDE8DF" icon="/auth-google.png" label="Google 登入 / 註冊" />
        </div>

        <p style={{ fontSize: 12, color: '#8A8A8A', textAlign: 'center', marginTop: 20 }}>
          已經有帳號？<Link href="/login" style={{ color: '#4E7153', fontWeight: 600, textDecoration: 'none' }}>前往登入</Link>
        </p>
      </div>
    </main>
  )
}

const OAuthBtn = ({ onClick, color, textColor, border, icon, label }) => (
  <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 0', borderRadius: 12, border: `1.5px solid ${border || color}`, background: color, color: textColor, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
    <img src={icon} alt="" style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 999, flexShrink: 0 }} />
    {label}
  </button>
)

const inputSt = { width: '100%', padding: '12px 14px', border: '1.5px solid #EDE8DF', borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit' }
const primaryBtn = { padding: '13px 0', borderRadius: 12, border: 'none', background: '#4E7153', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }
