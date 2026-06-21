// src/app/login/page.js  (Server Component wrapper)
import { Suspense } from 'react'
import LoginClient from './LoginClient'

export const metadata = { title: '登入 | 小蝸出租' }

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>載入中...</div>}>
      <LoginClient />
    </Suspense>
  )
}
