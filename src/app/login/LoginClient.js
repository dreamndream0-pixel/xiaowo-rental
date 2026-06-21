'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginClient() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/account'

  const [tab, setTab]       = useState('email')  // 'phone' | 'email'
  const [form, setForm]     = useState({ identifier: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await signIn('credentials', { email: form.identifier, password: form.password, redirect: false })
    if (res?.error) { setError('帳號或密碼錯誤，請重新確認'); setLoading(false) }
    else router.push(callbackUrl)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3EF', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: '36px 32px', width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🐌</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#3d3d3d' }}>小蝸出租</div>
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>歡迎回來</div>
        </div>

        {/* Tab: 手機 / Email */}
        <div style={{ display: 'flex', background: '#F5F3EF', borderRadius: 12, padding: 3, marginBottom: 20 }}>
          {[['phone','📱 手機'],['email','✉️ Email']].map(([t,l]) => (
            <button key={t} onClick={() => { setTab(t); setForm(f => ({ ...f, identifier: '' })); setError('') }}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: 'pointer', background: tab === t ? 'white' : 'transparent', color: tab === t ? '#3A5740' : '#aaa', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.18s' }}>
              {l}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={form.identifier}
            onChange={up('identifier')}
            placeholder={tab === 'phone' ? '手機號碼（如 0912345678）' : 'Email 地址'}
            type={tab === 'phone' ? 'tel' : 'email'}
            required style={inputSt}
          />
          <input value={form.password} onChange={up('password')} type="password" placeholder="密碼" required style={inputSt} />

          {error && <div style={{ fontSize: 12, color: '#e53935', textAlign: 'center' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12 }}>
            <Link href="/register" style={{ color: '#4E7153', textDecoration: 'none' }}>還沒有帳號？立即註冊</Link>
          </div>

          <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1, marginTop: 4 }}>
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#EDE8DF' }} />
          <span style={{ fontSize: 11, color: '#ccc' }}>或直接使用</span>
          <div style={{ flex: 1, height: 1, background: '#EDE8DF' }} />
        </div>

        {/* OAuth */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <OAuthBtn onClick={() => signIn('line', { callbackUrl })} color="#06C755" textColor="white" icon="💬" label="LINE 登入 / 註冊" />
          <OAuthBtn onClick={() => signIn('google', { callbackUrl })} color="white" textColor="#3d3d3d" border="#EDE8DF" icon="🔵" label="Google 登入 / 註冊" />
        </div>
      </div>
    </div>
  )
}

const OAuthBtn = ({ onClick, color, textColor, border, icon, label }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 0', borderRadius: 12, border: `1.5px solid ${border || color}`, background: color, color: textColor, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
    <span style={{ fontSize: 18 }}>{icon}</span>{label}
  </button>
)

const inputSt = { width: '100%', padding: '12px 14px', border: '1.5px solid #EDE8DF', borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit' }
const primaryBtn = { padding: '13px 0', borderRadius: 12, border: 'none', background: '#4E7153', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }
