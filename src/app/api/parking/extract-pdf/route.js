// src/app/api/parking/extract-pdf/route.js
// 從 PDF 分析出所有車牌號碼（用 Claude 直接讀 PDF，清單或車牌照片皆可）
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PROMPT = `這個 PDF 裡有台灣車牌號碼（可能是清單文字，或車牌照片）。請找出裡面所有的車牌號碼。
只回覆一個 JSON 陣列，每個元素是一個車牌字串，全部大寫，格式如 "ABC-1234"。
不要有任何其他文字、說明或標點。若找不到任何車牌，回覆 []。`

function normPlate(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

export async function POST(request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: '尚未設定辨識金鑰（ANTHROPIC_API_KEY）' }, { status: 503 })
    }
    const form = await request.formData()
    const file = form.get('file')
    if (!file) return NextResponse.json({ error: '未選擇 PDF 檔' }, { status: 400 })

    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')

    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })

    const raw = (response.content.find((b) => b.type === 'text')?.text || '').trim()

    // 先嘗試 JSON 陣列解析
    let plates = []
    try {
      const m = raw.match(/\[[\s\S]*\]/)
      if (m) plates = JSON.parse(m[0])
    } catch { /* 走 fallback */ }
    // fallback：以車牌樣式抓取
    if (!Array.isArray(plates) || plates.length === 0) {
      plates = raw.match(/[A-Z0-9]{2,4}-[A-Z0-9]{2,4}/gi) || []
    }

    // 正規化 + 去重
    const seen = new Set()
    const result = []
    for (const p of plates) {
      const np = normPlate(p)
      if (np && np !== 'NONE' && !seen.has(np)) { seen.add(np); result.push(np) }
    }

    return NextResponse.json({ plates: result })
  } catch (e) {
    console.error('extract-pdf error:', e?.message)
    return NextResponse.json({ error: 'PDF 分析失敗，請稍後再試' }, { status: 500 })
  }
}
