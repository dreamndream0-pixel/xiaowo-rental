'use client'
// src/app/login/page.js

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/dashboard'
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { ...form, redirect: false })
    if (res?.error) {
      setError('Email 或密碼錯誤，請重新確認')
      setLoading(false)
    } else {
      router.push(callbackUrl)
    }
  }

  const wrapStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--oat-light)', padding: 24 }
  const cardStyle = { background: 'white', borderRadius: 'var(--radius-lg)', padding: 40, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)' }
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--oat-mid)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🐌</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, color: 'var(--charcoal)' }}>小蝸出租</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-mid)', marginTop: 4 }}>歡迎回來</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email 或手機號碼" required style={inputStyle} />
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="密碼" required style={inputStyle} />

          {error && <div style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--sage)' }}>
            <span style={{ cursor: 'pointer' }}>忘記密碼？</span>
            <Link href="/register" style={{ color: 'var(--sage)', textDecoration: 'none' }}>還沒有帳號？立即註冊</Link>
          </div>

          <Button type="submit" loading={loading} style={{ width: '100%', padding: 13, borderRadius: 12, fontSize: 14, marginTop: 4 }}>登入</Button>
        </form>

        <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--oat-mid)' }} />
          <span style={{ fontSize: 11, color: 'var(--gray-light)' }}>或使用</span>
          <div style={{ flex: 1, height: 1, background: 'var(--oat-mid)' }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {[['Google 登入', 'google'], ['LINE 登入', 'line']].map(([label, provider]) => (
            <button key={provider} onClick={() => signIn(provider, { callbackUrl })} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--oat-mid)',
              background: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>載入中...</div>}>
      <LoginForm />
    </Suspense>
  )
}
