'use client'
// src/app/register/page.js
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Navbar from '@/components/layout/Navbar'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function handleSubmit() {
    setError('')
    if (!form.name || !form.email || !form.password) {
      setError('請填寫所有欄位')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '註冊失敗')
        setLoading(false)
        return
      }
      // 註冊成功，自動登入
      await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      router.push('/')
    } catch (e) {
      setError('註冊失敗，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 62px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--oat-light)' }}>
        <div style={{ background: 'white', borderRadius: 22, padding: 40, maxWidth: 400, width: '100%', boxShadow: 'var(--shadow-md)' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, marginBottom: 6, color: 'var(--charcoal)' }}>租客註冊會員</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-light)', marginBottom: 28 }}>加入小蝸出租，收藏與聯絡房源</p>

          {error && (
            <div style={{ background: '#FAEAEA', color: 'var(--danger)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <label style={{ fontSize: 12, color: 'var(--gray-mid)', display: 'block', marginBottom: 4 }}>姓名</label>
          <input value={form.name} onChange={update('name')} placeholder="您的名字"
            style={inputStyle} />

          <label style={{ fontSize: 12, color: 'var(--gray-mid)', display: 'block', marginBottom: 4, marginTop: 14 }}>Email</label>
          <input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com"
            style={inputStyle} />

          <label style={{ fontSize: 12, color: 'var(--gray-mid)', display: 'block', marginBottom: 4, marginTop: 14 }}>密碼</label>
          <input type="password" value={form.password} onChange={update('password')} placeholder="至少 6 個字"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={inputStyle} />

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', marginTop: 24, padding: 14, borderRadius: 12, border: 'none', background: 'var(--sage)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? '註冊中...' : '註冊'}
          </button>

          <p style={{ fontSize: 13, color: 'var(--gray-mid)', textAlign: 'center', marginTop: 20 }}>
            已經有帳號？ <Link href="/login" style={{ color: 'var(--sage-dark)', fontWeight: 600 }}>登入</Link>
          </p>
        </div>
      </main>
    </>
  )
}

const inputStyle = {
  width: '100%', padding: '12px 14px', border: '1.5px solid var(--oat-mid)',
  borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'inherit',
}
