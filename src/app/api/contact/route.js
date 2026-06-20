// src/app/api/contact/route.js
// 成為房東諮詢表單 — 儲存並推送 LINE 通知
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { name, phone, message } = await request.json()
    if (!name || !phone) {
      return NextResponse.json({ error: '請填寫姓名和電話' }, { status: 400 })
    }

    // 儲存到 site_settings（簡單 JSON 陣列，不需要新資料表）
    // 改用 linebot 的 internal notify 推送 LINE 訊息給管理員
    const linebotUrl = process.env.LINEBOT_URL
    const secret = process.env.REVALIDATE_SECRET
    if (linebotUrl && secret) {
      const text = `📋 新的房東諮詢\n\n姓名：${name}\n電話：${phone}${message ? '\n說明：' + message : ''}`
      await fetch(`${linebotUrl}/api/internal/contact-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, text }),
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('contact API 錯誤:', e)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
