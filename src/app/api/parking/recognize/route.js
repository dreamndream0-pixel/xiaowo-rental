// src/app/api/parking/recognize/route.js
// 車牌自動辨識：用 Claude 視覺模型從照片讀出車牌號碼
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const PROMPT = `你是車牌辨識助手。請讀出這張照片中車輛的車牌號碼。
規則：
- 只回覆車牌號碼本身，全部大寫，格式例如 ABC-1234 或 1234-AB。
- 台灣車牌通常是英文字母與數字的組合，中間可用「-」分隔。
- 如果照片中沒有清楚可辨識的車牌，只回覆 NONE。
- 不要加任何說明文字、標點或前後綴。`

export async function POST(request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: '尚未設定車牌辨識金鑰（ANTHROPIC_API_KEY）' }, { status: 503 })
    }

    const { image } = await request.json()
    if (!image) return NextResponse.json({ error: '缺少照片' }, { status: 400 })

    // 支援 data URL 或純 base64；解析出 media_type 與 base64 內容
    let mediaType = 'image/jpeg'
    let base64 = image
    const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(image)
    if (m) { mediaType = m[1]; base64 = m[2] }

    const client = new Anthropic() // 讀取 ANTHROPIC_API_KEY
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 64,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })

    const raw = (response.content.find((b) => b.type === 'text')?.text || '').trim()
    // 正規化：轉大寫、只保留英數與 -
    const plate = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '')

    if (!plate || plate === 'NONE') {
      return NextResponse.json({ plate: '', message: '無法辨識車牌，請手動輸入或重拍' })
    }
    return NextResponse.json({ plate })
  } catch (e) {
    console.error('POST /api/parking/recognize error:', e?.message)
    return NextResponse.json({ error: '辨識失敗，請稍後再試或手動輸入' }, { status: 500 })
  }
}
