'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginClient() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/account'
  const authError = params.get('error')

  const [tab, setTab] = useState('email')
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const up = key => event => setForm(prev => ({ ...prev, [key]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      email: form.identifier,
      password: form.password,
      redirect: false,
    })
    if (res?.error) {
      setError('帳號或密碼不正確，請再確認一次')
      setLoading(false)
      return
    }
    router.push(callbackUrl)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3EF', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: '36px 32px', width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="小蝸出租" style={{ width: '100%', maxWidth: 240, height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 16px' }} />
        </div>

        <div style={{ display: 'flex', background: '#F5F3EF', borderRadius: 12, padding: 3, marginBottom: 20 }}>
          {[['phone', '手機'], ['email', 'Email']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setTab(value); setForm(prev => ({ ...prev, identifier: '' })); setError('') }}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === value ? 700 : 400, cursor: 'pointer', background: tab === value ? 'white' : 'transparent', color: tab === value ? '#3A5740' : '#8A8A8A', boxShadow: tab === value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.18s' }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={form.identifier}
            onChange={up('identifier')}
            placeholder={tab === 'phone' ? '手機號碼，例如 0912345678' : 'Email 地址'}
            type={tab === 'phone' ? 'tel' : 'email'}
            required
            style={inputSt}
          />
          <input value={form.password} onChange={up('password')} type="password" placeholder="密碼" required style={inputSt} />

          {(error || authError) && (
            <div style={{ fontSize: 12, color: '#e53935', textAlign: 'center' }}>
              {error || authErrorMessage(authError)}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12 }}>
            <Link href="/register" style={{ color: '#4E7153', textDecoration: 'none' }}>還沒有帳號？立即註冊</Link>
          </div>

          <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1, marginTop: 4 }}>
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#EDE8DF' }} />
          <span style={{ fontSize: 11, color: '#B9B3AA' }}>或直接使用</span>
          <div style={{ flex: 1, height: 1, background: '#EDE8DF' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <OAuthBtn onClick={() => signIn('line', { callbackUrl })} color="#06C755" textColor="white" icon="/auth-line.png" label="LINE 登入 / 註冊" />
          <OAuthBtn onClick={() => signIn('google', { callbackUrl })} color="white" textColor="#3d3d3d" border="#EDE8DF" icon="/auth-google.png" label="Google 登入 / 註冊" />
        </div>
      </div>
    </div>
  )
}

const OAuthBtn = ({ onClick, color, textColor, border, icon, label }) => (
  <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 0', borderRadius: 12, border: `1.5px solid ${border || color}`, background: color, color: textColor, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
    <img src={icon} alt="" style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 999, flexShrink: 0 }} />
    {label}
  </button>
)

function authErrorMessage(code) {
  const messages = {
    OAuthCallback: '第三方登入連線失敗，請確認 Google/LINE callback URL 與環境變數設定。',
    OAuthAccountNotLinked: '這個 Email 已用其他方式註冊，請先用原本方式登入後再連結。',
    AccessDenied: '授權未完成，請重新登入。',
    Configuration: '登入設定尚未完成，請確認正式環境變數。',
  }
  return messages[code] || `第三方登入失敗，請稍後再試。（${code || 'unknown'}）`
}

const inputSt = { width: '100%', padding: '12px 14px', border: '1.5px solid #EDE8DF', borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit' }
const primaryBtn = { padding: '13px 0', borderRadius: 12, border: 'none', background: '#4E7153', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }
