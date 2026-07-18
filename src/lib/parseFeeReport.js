function normalizeText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
}

function normalizePlate(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

function parseAmount(value) {
  const cleaned = String(value || '').replace(/[^\d]/g, '')
  if (!cleaned) return null
  const amount = Number.parseInt(cleaned, 10)
  return Number.isFinite(amount) ? amount : null
}

function parseReportDate(text) {
  const candidates = [
    /(?:報表日期|資料日期|日期)[:：\s]*(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
    /(\d{4})(\d{2})(\d{2})/,
  ]
  for (const re of candidates) {
    const match = text.match(re)
    if (!match) continue
    if (match.length === 4) {
      const [, y, m, d] = match
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    const s = match[1]
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }
  return null
}

function inferStatus(line, amount, parkedMinutes) {
  if (/查無繳費紀錄/.test(line)) return '查無繳費紀錄'
  if (/月租候選|月租/.test(line)) return '月租候選'
  if (amount > 0) return '待繳'
  if (amount === 0 && parkedMinutes != null && parkedMinutes > 15) return '月租候選'
  if (amount === 0) return '0元'
  return '查詢異常'
}

function minutesBetween(queryTime, entryTime) {
  if (!queryTime || !entryTime) return null
  const q = new Date(String(queryTime).replace(' ', 'T') + '+08:00')
  const e = new Date(String(entryTime).replace(' ', 'T') + '+08:00')
  if (Number.isNaN(q.getTime()) || Number.isNaN(e.getTime())) return null
  return Math.max(0, Math.floor((q.getTime() - e.getTime()) / 60000))
}

function parseRowsFromText(text) {
  const rows = []
  const seen = new Set()
  const lines = normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines) {
    const plateMatch = line.match(/\b[A-Z0-9]{2,4}-[A-Z0-9]{2,4}\b/i)
    if (!plateMatch) continue

    const plate = normalizePlate(plateMatch[0])
    const dateTimes = [...line.matchAll(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?/g)].map((m) =>
      m[0].replace('T', ' ')
    )
    const entryAt = dateTimes[0] || null
    const queryTime = dateTimes[1] || null

    let amount = null
    const moneyMatch = line.match(/(?:\$|NT\$|應繳金額?\s*[:：]?|待繳\s*)\s*([\d,]+)/)
    if (moneyMatch) amount = parseAmount(moneyMatch[1])
    if (amount == null) {
      const tailNumbers = [...line.matchAll(/(?:^|\s)(\d{1,6})(?=\s*$)/g)]
      if (tailNumbers.length) amount = parseAmount(tailNumbers.at(-1)[1])
    }

    if (amount == null && /查無繳費紀錄|0元|月租候選/.test(line)) amount = 0
    if (amount == null) continue

    const parkedMinutes = minutesBetween(queryTime, entryAt)
    const status = inferStatus(line, amount, parkedMinutes)
    const monthlyCandidate = status === '月租候選'
    const key = `${plate}|${entryAt || ''}|${amount}|${status}`
    if (seen.has(key)) continue
    seen.add(key)

    rows.push({
      plate,
      entryAt,
      amount,
      status,
      monthlyCandidate,
      parkedMinutes,
      queryTime,
      note: monthlyCandidate ? '入場超過15分鐘仍為0元' : '',
    })
  }

  return rows
}

export async function parseFeeReport(buffer) {
  const canvas = await import('@napi-rs/canvas')
  globalThis.DOMMatrix ||= canvas.DOMMatrix
  globalThis.ImageData ||= canvas.ImageData
  globalThis.Path2D ||= canvas.Path2D
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer), useWorker: false })
  let text = ''
  try {
    const result = await parser.getText()
    text = result.text || ''
  } finally {
    await parser.destroy().catch(() => {})
  }

  const normalized = normalizeText(text)
  return {
    reportDate: parseReportDate(normalized),
    rows: parseRowsFromText(normalized),
    text: normalized,
  }
}
