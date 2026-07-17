// src/lib/parseFeeReport.js
// 解析「停車場車牌繳費查詢分析報表」PDF，取出資料日期與「有金額待繳」明細
import { PDFParse } from 'pdf-parse'

// buffer: Node Buffer / Uint8Array
// 回傳 { reportDate: 'YYYY-MM-DD'|null, rows: [{ plate, entryAt, amount }] }
export async function parseFeeReport(buffer) {
  // useWorker:false → 於 Node/serverless 主執行緒解析，不載入 pdfjs worker（避免打包後找不到 worker）
  const parser = new PDFParse({ data: new Uint8Array(buffer), useWorker: false })
  let text
  try {
    const r = await parser.getText()
    text = r.text
  } finally {
    await parser.destroy().catch(() => {})
  }

  // 修正 CJK 部首/相容字（例：⾦→金、⾞→車、⼩→小）
  const norm = text.normalize('NFKC')
  const lines = norm.split('\n')

  // 資料日期：優先取「來源：…辨識YYYYMMDD」，否則取前段任何 8 碼數字
  let reportDate = null
  const head = lines.slice(0, 6).join('\n')
  const m8 = head.match(/辨識\s*(\d{8})/) || head.match(/(\d{8})/)
  if (m8) {
    const s = m8[1]
    reportDate = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }

  // 「有金額待繳」段落：從標題到「0元…入場/計費」之前
  const start = lines.findIndex((l) => /有金額待繳\s*\d+\s*台/.test(l))
  const rows = []
  if (start !== -1) {
    const endRel = lines.slice(start + 1).findIndex((l) => /0元.*(入場|計費)/.test(l))
    const end = endRel === -1 ? lines.length : start + 1 + endRel
    for (const l of lines.slice(start + 1, end)) {
      const cells = l.split('\t').map((c) => c.trim())
      const pm = cells[0] && cells[0].match(/^\d+\s+([A-Z0-9]{2,4}-[A-Z0-9]{2,4})$/)
      if (!pm) continue
      const amount = parseInt((cells[cells.length - 1] || '').replace(/[,\s]/g, ''), 10)
      if (!Number.isFinite(amount)) continue
      const entryAt = cells.find((c) => /^\d{4}-\d{2}-\d{2}/.test(c)) || null
      rows.push({ plate: pm[1], entryAt, amount })
    }
  }

  return { reportDate, rows }
}
