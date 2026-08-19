// src/app/account/page.js  (Server Component)
// 「我的帳號管理」已整合到 linebot 會員中心：一律以 SSO 橋接導向 linebot。
// 保留此路由是為了相容舊連結/書籤，以及房源編輯頁的 /account?mode=landlord 導向。
import { redirect } from 'next/navigation'

export const metadata = { title: '我的帳號 | 小蝸出租' }

export default async function AccountPage({ searchParams }) {
  const sp = searchParams || {}
  const params = new URLSearchParams()
  if (sp.tab) params.set('tab', String(sp.tab))
  // 舊的「成為超級房東」(?super=1) 與房源編輯導向 → 一律進房東模式
  if (sp.mode === 'landlord' || sp.super) params.set('mode', 'landlord')
  const qs = params.toString()
  redirect('/api/sso/linebot' + (qs ? `?${qs}` : ''))
}
