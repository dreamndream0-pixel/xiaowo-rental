// src/app/api/parking/query-fee/route.js
// 呼叫 RTD 繳費查詢 API，依車牌查出待繳金額與狀態
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RTD_URL = 'https://api.rtd.com.tw/api/general/payment/search'
// 預設 RTD 查詢參數（可由停車場設定覆寫）
const DEFAULT_VENDOR_ID = '1'
const DEFAULT_SCAN_CODE = 'gkM0VK1oICQkfBwl'

// 從單筆 paymentTask 防呆抓出金額（欄位名未知，依常見命名優先序比對）
const AMOUNT_KEYS = ['actualPrice', 'amount', 'payAmount', 'amountDue', 'unpaidAmount', 'fee', 'totalAmount', 'total', 'price', 'money', 'charge']
function taskAmount(task) {
  if (!task || typeof task !== 'object') return 0
  for (const k of AMOUNT_KEYS) {
    const v = task[k]
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  }
  return 0
}

// 查詢單一車牌
async function queryOne(plate, vendorId, scanCode) {
  try {
    const res = await fetch(RTD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Language': 'zh-TW',
        // 模擬瀏覽器請求，降低被 RTD 防機器人擋下的機率
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Origin: 'https://api.rtd.com.tw',
        Referer: 'https://api.rtd.com.tw/scan_to_pay/entrance/PSS_HA511',
      },
      body: JSON.stringify({
        siteVendorId: vendorId,
        plateNumber: plate,
        vendorParams: { scanCode },
        lang: 'zh-TW',
      }),
      // 避免長時間卡住
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) {
      // 帶回 RTD 的錯誤內容，方便判斷缺什麼欄位
      const detail = (await res.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200)
      return { plate, ok: false, status: res.status, rateLimited: res.status === 403 || res.status === 429, error: `RTD 回應 ${res.status}`, detail }
    }
    const data = await res.json().catch(() => null)
    if (!data) return { plate, ok: false, error: '回應解析失敗' }

    const tasks = data?.payload?.paymentTasks
    if (!Array.isArray(tasks)) {
      // 結構與預期不同 → 回傳原始資料，方便對照欄位
      return { plate, ok: true, unknown: true, raw: data }
    }
    const amount = tasks.reduce((sum, t) => sum + taskAmount(t), 0)
    return {
      plate,
      ok: true,
      owing: tasks.length > 0,
      count: tasks.length,
      amount,
      raw: tasks, // 保留原始項目，供欄位對照/顯示明細
    }
  } catch (e) {
    const msg = e?.name === 'TimeoutError' ? '查詢逾時' : (e?.message || '查詢失敗')
    return { plate, ok: false, error: msg }
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const plates = Array.isArray(body.plates)
      ? body.plates
      : body.plate ? [body.plate] : []
    const list = plates
      .map((p) => String(p || '').trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 10) // 保護：單次最多 10 台

    if (!list.length) return NextResponse.json({ error: '未提供車牌' }, { status: 400 })

    const vendorId = String(body.siteVendorId || '').trim() || DEFAULT_VENDOR_ID
    const scanCode = String(body.scanCode || '').trim() || DEFAULT_SCAN_CODE

    // 逐一查詢、間隔送出，避免對 RTD 造成瞬間壓力
    const results = []
    for (const plate of list) {
      results.push(await queryOne(plate, vendorId, scanCode))
      if (list.length > 1) await new Promise((r) => setTimeout(r, 900))
    }
    return NextResponse.json({ results })
  } catch (e) {
    console.error('POST /api/parking/query-fee error:', e?.message)
    return NextResponse.json({ error: '查詢失敗，請稍後再試' }, { status: 500 })
  }
}
