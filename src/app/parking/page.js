'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

// ── 工具 ──────────────────────────────────────────
const fmtTime = (d) =>
  d ? new Date(d).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'

const fmtDateTimeSeconds = (d) =>
  d ? new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(d)).replace('T', ' ') : '—'

const money = (n) => `$${(n || 0).toLocaleString('zh-TW')}`

const spacePair = (available, total) => {
  if (available == null && total == null) return '-'
  return `${available ?? '-'} / ${total ?? '-'}`
}

const shortDate = (date) => {
  const [, m, d] = String(date || '').split('-')
  return m && d ? `${Number(m)}/${Number(d)}` : date
}

const plainAmount = (n) => Number(n || 0).toLocaleString('zh-TW')

const signedAmount = (n) => {
  const value = Number(n || 0)
  if (value > 0) return `+${plainAmount(value)}`
  if (value < 0) return `-${plainAmount(Math.abs(value))}`
  return '0'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const LIVE_QUERY_STORAGE_KEY = 'parking-live-fee-query-v1'

const isLiveQueryProblem = (row) =>
  !row || row.ok === false || row.unknown || row.rateLimited || row.status === 403 || row.status === 429 || /403|429/.test(String(row.error || ''))

const mergeLiveResults = (previous, next) => {
  const byPlate = new Map()
  for (const row of previous || []) if (row?.plate) byPlate.set(String(row.plate).toUpperCase(), row)
  for (const row of next || []) if (row?.plate) byPlate.set(String(row.plate).toUpperCase(), row)
  return [...byPlate.values()]
}

const recordEntryAt = (record) =>
  record?.entryAt || record?.entryTime || record?.startTime || record?.startAt || record?.beginTime || ''

function durationLabel(entryAt, until) {
  const mins = Math.max(0, Math.floor((new Date(until).getTime() - new Date(entryAt).getTime()) / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h === 0 ? `${m} 分` : `${h} 時 ${m} 分`
}

// 在瀏覽器端壓縮圖片：縮到最長邊 1280px、JPEG 品質 0.72
// 回傳 { blob, dataUrl }，避免手機大照片超過伺服器上傳上限
async function compressImage(file, maxSize = 1280, quality = 0.72) {
  const src = await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = src
  })
  let { width, height } = img
  if (width > maxSize || height > maxSize) {
    if (width >= height) { height = Math.round((height * maxSize) / width); width = maxSize }
    else { width = Math.round((width * maxSize) / height); height = maxSize }
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(img, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  return { blob: blob || file, dataUrl }
}

// 預設繳費網站（可於設定變更）
const DEFAULT_PAY_URL = 'https://api.rtd.com.tw/scan_to_pay/entrance/PSS_HA511?utm_source=Offline&utm_medium=banner&utm_campaign=QRcode&utm_id=PSS_HA511'
// 預設 RTD 查詢參數（可於設定變更）
const DEFAULT_VENDOR_ID = '1'
const DEFAULT_SCAN_CODE = 'gkM0VK1oICQkfBwl'

// ── 統計卡片 ──────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '18px 20px',
      boxShadow: '0 2px 12px rgba(30,41,59,0.06)', border: '1px solid #eef1f5',
      display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0,
    }}>
      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 26, fontWeight: 800, color: accent || '#0f172a', lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: '#94a3b8' }}>{sub}</span>}
    </div>
  )
}

export default function ParkingPage() {
  const [lots, setLots] = useState([])
  const [lotId, setLotId] = useState('')
  const [stats, setStats] = useState(null)
  const [tdxAvailability, setTdxAvailability] = useState(null)
  const [tdxRefreshing, setTdxRefreshing] = useState(false)
  const [tdxSearch, setTdxSearch] = useState('')
  const [tdxFavoriteSaving, setTdxFavoriteSaving] = useState('')
  const [selectedTdxDate, setSelectedTdxDate] = useState('')
  const [selectedTdxCarParkId, setSelectedTdxCarParkId] = useState('')
  const [onsite, setOnsite] = useState([])
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState('onsite')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState('')

  // 進場表單
  const [plate, setPlate] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [entering, setEntering] = useState(false)
  const [singleFee, setSingleFee] = useState(null) // 單筆查金額結果
  const fileRef = useRef(null)

  // 批次車牌辨識
  const [batch, setBatch] = useState([]) // [{ id, file, dataUrl, photoUrl, plate, recognizing }]
  const batchRef = useRef(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const pdfRef = useRef(null)

  // 每日繳費報表匯入
  const [reportDays, setReportDays] = useState([])
  const [reportDetails, setReportDetails] = useState({})
  const [selectedReportDate, setSelectedReportDate] = useState('')
  const [importing, setImporting] = useState(false)
  const [reportExporting, setReportExporting] = useState(false)
  const [liveQuery, setLiveQuery] = useState({ open: false, running: false, total: 0, done: 0, plates: [], results: [], meta: {}, message: '', updatedAt: null })
  const [liveQueryStorageReady, setLiveQueryStorageReady] = useState(false)
  const reportRef = useRef(null)
  const liveQueryStopRef = useRef(false)

  const lot = lots.find((l) => l.id === lotId)

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // 載入停車場清單
  useEffect(() => {
    fetch('/api/parking/lots')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setLots(data)
          setLotId((prev) => prev || data[0].id)
        }
      })
      .catch(() => flash('連線失敗，請確認資料庫設定'))
      .finally(() => setLoading(false))
  }, [])

  // 重新載入某停車場的資料
  const reload = useCallback(async (id, options = {}) => {
    if (!id) return
    const tdxParams = new URLSearchParams()
    if (options.forceTdxRefresh) {
      tdxParams.set('refresh', '1')
      tdxParams.set('ts', String(Date.now()))
    }
    if (selectedTdxCarParkId) tdxParams.set('carParkId', selectedTdxCarParkId)
    const tdxUrl = `/api/parking/tdx${tdxParams.toString() ? `?${tdxParams.toString()}` : ''}`
    if (options.showTdxStatus) setTdxRefreshing(true)
    try {
      const [s, on, hist, pb] = await Promise.all([
        fetch(`/api/parking/stats?lotId=${id}`).then((r) => r.json()),
        fetch(`/api/parking/sessions?lotId=${id}&status=onsite`).then((r) => r.json()),
        fetch(`/api/parking/sessions?lotId=${id}&status=history`).then((r) => r.json()),
        fetch(tdxUrl).then((r) => r.json()).catch(() => null),
      ])
      setStats(s)
      if (pb && !pb.error) {
        setTdxAvailability(pb)
        if (options.showTdxStatus) flash(pb.fromCache ? 'TDX 已讀取快取資料' : 'TDX 已完成即時檢查')
      } else if (options.showTdxStatus) {
        flash(pb?.error || 'TDX 檢查失敗')
      }
      setOnsite(Array.isArray(on) ? on : [])
      setHistory(Array.isArray(hist) ? hist : [])
    } catch { /* ignore */ }
    finally {
      if (options.showTdxStatus) setTdxRefreshing(false)
    }
  }, [selectedTdxCarParkId])

  useEffect(() => { if (lotId) reload(lotId) }, [lotId, reload])

  useEffect(() => {
    const days = tdxAvailability?.daily || []
    if (!days.length) return
    setSelectedTdxDate((prev) => (prev && days.some((day) => day.reportDate === prev) ? prev : days[0].reportDate))
  }, [tdxAvailability])

  useEffect(() => {
    const favorites = tdxAvailability?.favorites || []
    if (!favorites.length) {
      setSelectedTdxCarParkId('')
      return
    }
    setSelectedTdxCarParkId((prev) => (prev && favorites.some((fav) => fav.carParkId === prev) ? prev : favorites[0].carParkId))
  }, [tdxAvailability?.favorites])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LIVE_QUERY_STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (!Array.isArray(saved?.plates) && !Array.isArray(saved?.results)) return
      setLiveQuery({
        open: false,
        running: false,
        total: Number(saved.total || saved.plates?.length || 0),
        done: Number(saved.done || 0),
        plates: Array.isArray(saved.plates) ? saved.plates : [],
        results: Array.isArray(saved.results) ? saved.results : [],
        meta: saved.meta && typeof saved.meta === 'object' ? saved.meta : {},
        message: saved.message || '已載入上次暫存，可繼續查詢',
        updatedAt: saved.updatedAt || null,
      })
    } catch { /* ignore */ }
    finally { setLiveQueryStorageReady(true) }
  }, [])

  useEffect(() => {
    if (!liveQueryStorageReady) return
    try {
      const hasData = liveQuery.plates.length || liveQuery.results.length
      if (!hasData) {
        window.localStorage.removeItem(LIVE_QUERY_STORAGE_KEY)
        return
      }
      window.localStorage.setItem(LIVE_QUERY_STORAGE_KEY, JSON.stringify({
        ...liveQuery,
        open: false,
        running: false,
      }))
    } catch { /* ignore */ }
  }, [liveQuery, liveQueryStorageReady])
  // 每 30 秒自動更新即時金額與統計
  useEffect(() => {
    if (!lotId) return
    const t = setInterval(() => reload(lotId), 30000)
    return () => clearInterval(t)
  }, [lotId, reload])

  // 上傳車牌照片（先壓縮 → 上雲端；失敗則直接把壓縮圖存進資料庫）
  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // 1. 瀏覽器端壓縮，避免手機大照片超過伺服器上傳上限
      let compressed = null
      try { compressed = await compressImage(file) } catch { /* 壓縮失敗就用原檔 */ }
      const blob = compressed?.blob || file
      const dataUrl = compressed?.dataUrl || null

      // 2. 優先上傳到雲端圖庫
      try {
        const fd = new FormData()
        fd.append('file', blob, 'plate.jpg')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (res.ok) {
          const data = await res.json()
          if (data.url) { setPhotoUrl(data.url); flash('照片已上傳'); return }
        }
      } catch { /* 雲端失敗 → 走本地存檔 */ }

      // 3. 保險：雲端失敗就用壓縮後的圖片直接存檔（存進資料庫）
      if (dataUrl) { setPhotoUrl(dataUrl); flash('照片已存檔') }
      else flash('照片上傳失敗，請再試一次')

      // 4. 自動辨識車牌（用壓縮後的圖片）
      if (dataUrl) recognizePlate(dataUrl)
    } finally { setUploading(false) }
  }

  // 用 AI 視覺辨識車牌，成功就自動填入車牌欄位
  const recognizePlate = async (dataUrl) => {
    setRecognizing(true)
    try {
      const res = await fetch('/api/parking/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const data = await res.json()
      if (res.ok && data.plate) { setPlate(data.plate); setSingleFee(null); flash(`已辨識車牌：${data.plate}`) }
      else if (data.message) flash(data.message)
      else if (data.error) flash(data.error)
    } catch { flash('車牌辨識失敗，請手動輸入') }
    finally { setRecognizing(false) }
  }

  // ── 批次車牌辨識 ──────────────────────────────
  const updateBatch = (id, patch) => setBatch((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const onPickBatch = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const items = files.map((f) => ({ id: `${Date.now()}-${Math.random()}`, file: f, dataUrl: '', photoUrl: '', plate: '', recognizing: true }))
    setBatch((prev) => [...prev, ...items])
    if (batchRef.current) batchRef.current.value = ''
    for (const it of items) await processBatchItem(it) // 依序處理，避免同時太多請求
  }

  // ── 每日繳費報表匯入 ──────────────────────────
  const loadReportDays = useCallback(async () => {
    try {
      const d = await fetch('/api/parking/fee-records').then((r) => r.json())
      const days = Array.isArray(d.days) ? d.days : []
      setReportDays(days)
      setSelectedReportDate((prev) => (prev && days.some((day) => day.reportDate === prev) ? prev : days[0]?.reportDate || ''))
      const details = await Promise.all(
        days.map((day) => fetch(`/api/parking/fee-records?date=${day.reportDate}`).then((r) => r.json()))
      )
      setReportDetails(Object.fromEntries(details.map((day) => [day.reportDate, day])))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadReportDays() }, [loadReportDays])

  const onImportReport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (reportRef.current) reportRef.current.value = ''
    setImporting(true)
    flash('匯入報表中…')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parking/import-report', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        flash(`已匯入 ${data.reportDate}：${data.count} 筆、待繳 ${data.dueCount ?? 0} 台、月租候選 ${data.monthlyCandidateCount ?? 0} 台、總額 ${money(data.total)}`)
        setSelectedReportDate(data.reportDate)
        loadReportDays()
      } else flash(`${data.error || '匯入失敗'}${data.detail ? '：' + data.detail : ''}`)
    } catch { flash('匯入失敗') }
    finally { setImporting(false) }
  }

  const openDayDetail = async (date) => {
    setSelectedReportDate(date)
  }

  const deleteDay = async (date) => {
    if (!confirm(`刪除 ${date} 這天的匯入資料？`)) return
    await fetch(`/api/parking/fee-records?date=${date}`, { method: 'DELETE' })
    flash('已刪除')
    if (selectedReportDate === date) setSelectedReportDate('')
    loadReportDays()
  }

  const downloadReportPdf = async () => {
    if (!selectedReport || !reportComparisonRows.length || reportExporting) {
      flash('目前沒有可匯出的報表資料')
      return
    }

    setReportExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 28
      const scale = Math.min(2, window.devicePixelRatio || 2)
      const fontFamily = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", Arial, sans-serif'
      let pdfPages = 0

      const makePage = () => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(pageW * scale)
        canvas.height = Math.round(pageH * scale)
        const context = canvas.getContext('2d')
        context.scale(scale, scale)
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, pageW, pageH)
        context.textBaseline = 'middle'
        return { canvas, context }
      }

      let page = makePage()
      let ctx = page.context
      let y = margin
      const rowH = 28
      const contentW = pageW - margin * 2

      const setFont = (size, weight = 400, color = '#0f172a') => {
        ctx.font = `${weight} ${size}px ${fontFamily}`
        ctx.fillStyle = color
      }
      const drawText = (value, x, lineY, maxW, align = 'left') => {
        const raw = String(value ?? '')
        let s = raw
        while (s.length > 1 && ctx.measureText(s).width > maxW) s = s.slice(0, -1)
        if (s !== raw) s = `${s.slice(0, -1)}...`
        ctx.textAlign = align
        ctx.fillText(s, align === 'right' ? x + maxW : x, lineY, maxW)
      }
      const ensure = (height) => {
        if (y + height <= pageH - margin) return
        if (pdfPages > 0) pdf.addPage()
        pdf.addImage(page.canvas.toDataURL('image/jpeg', 0.82), 'JPEG', 0, 0, pageW, pageH)
        pdfPages += 1
        page = makePage()
        ctx = page.context
        y = margin
      }
      const tableRow = (cells, widths, options = {}) => {
        ensure(options.height || rowH)
        const h = options.height || rowH
        let x = margin
        ctx.strokeStyle = '#dbe3ee'
        ctx.lineWidth = 1
        for (let i = 0; i < cells.length; i += 1) {
          ctx.fillStyle = options.header ? '#eef3f9' : '#ffffff'
          ctx.fillRect(x, y, widths[i], h)
          ctx.strokeRect(x, y, widths[i], h)
          setFont(options.fontSize || 10, options.header ? 800 : 500, options.colors?.[i] || '#0f172a')
          drawText(cells[i], x + 6, y + h / 2, widths[i] - 12, options.aligns?.[i] || 'left')
          x += widths[i]
        }
        y += h
      }

      setFont(18, 900)
      drawText('每日繳費報表', margin, y + 10, 220)
      setFont(10, 400, '#64748b')
      drawText(`匯出時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })}；目前選取日期：${selectedReportDate || '-'}`, margin, y + 32, contentW)
      y += 52

      setFont(13, 900)
      drawText('統計摘要', margin, y + 8, 140)
      y += 20
      const summaryRows = [
        ['單一車輛', selectedReport.count ?? 0, '月租候選', selectedReport.monthlyCandidateCount ?? 0],
        ['0元未滿15分鐘', selectedReport.zeroUnder15Count ?? 0, '查無繳費紀錄', selectedReport.noPaymentCount ?? 0],
        ['有待繳金額', selectedReport.dueCount ?? 0, '待繳總額', money(selectedReport.total)],
        ['0元無法判斷', selectedReport.zeroUnknownCount ?? 0, '查詢異常', selectedReport.errorCount ?? 0],
      ]
      summaryRows.forEach((r) => tableRow(r, [contentW * .25, contentW * .25, contentW * .25, contentW * .25], { aligns: ['left', 'right', 'left', 'right'] }))
      y += 16

      setFont(13, 900)
      drawText('金額加總', margin, y + 8, 140)
      y += 20
      const totalWidths = reportAmountTotals.map(() => contentW / Math.max(reportAmountTotals.length, 1))
      tableRow(reportAmountTotals.map((item, index) => `${shortDate(item.date)}${index === 0 ? ' 初次統計' : ''}`), totalWidths, { header: true, aligns: reportAmountTotals.map(() => 'right') })
      tableRow(reportAmountTotals.map((item, index) => `${index === 0 ? money(item.amount) : signedAmount(item.amount)} / ${item.count}台`), totalWidths, { aligns: reportAmountTotals.map(() => 'right') })
      y += 16

      setFont(13, 900)
      drawText('車牌金額明細', margin, y + 8, 160)
      y += 20
      const plateW = 90
      const entryW = 132
      const dateW = (contentW - plateW - entryW) / Math.max(reportDatesAsc.length, 1)
      const detailWidths = [plateW, entryW, ...reportDatesAsc.map(() => dateW)]
      tableRow(['車號', '入場時間', ...reportDatesAsc.map((date, index) => `${shortDate(date)}${index === 0 ? ' 初次統計' : ''}`)], detailWidths, { header: true, fontSize: 9 })

      reportComparisonRows.forEach((row) => {
        const cells = [row.plate, row.entryAt || '-']
        const colors = ['#0f172a', '#64748b']
        reportDatesAsc.forEach((date) => {
          const current = row.records[date]
          if (!current) {
            cells.push('-')
            colors.push('#64748b')
            return
          }
          const previousDate = [...reportDatesAsc].filter((d) => d < date && row.records[d]).pop()
          const previous = previousDate ? row.records[previousDate] : null
          const value = previous ? Number(current.amount || 0) - Number(previous.amount || 0) : Number(current.amount || 0)
          cells.push(`${previous ? signedAmount(value) : plainAmount(value)} ${current.status || ''}`)
          colors.push(current.monthlyCandidate ? '#b45309' : current.amount > 0 ? '#0369a1' : '#64748b')
        })
        tableRow(cells, detailWidths, { fontSize: 8.5, colors })
      })

      if (pdfPages > 0) pdf.addPage()
      pdf.addImage(page.canvas.toDataURL('image/jpeg', 0.82), 'JPEG', 0, 0, pageW, pageH)
      pdf.save(`每日繳費報表-${selectedReportDate || 'report'}.pdf`)
      flash('PDF 已產生，請查看下載項目')
    } catch (err) {
      console.error(err)
      flash('PDF 產生失敗，請再試一次')
    } finally {
      setReportExporting(false)
    }
  }

  const exportReportPdf = () => {
    if (!selectedReport || !reportComparisonRows.length) {
      flash('目前沒有可匯出的報表資料')
      return
    }

    const esc = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
    const cellAmount = (row, date) => {
      const current = row.records[date]
      if (!current) return '<td class="muted">-</td>'
      const previousDate = [...reportDatesAsc].filter((d) => d < date && row.records[d]).pop()
      const previous = previousDate ? row.records[previousDate] : null
      const value = previous ? Number(current.amount || 0) - Number(previous.amount || 0) : Number(current.amount || 0)
      const amountText = previous ? signedAmount(value) : plainAmount(value)
      const cls = current.monthlyCandidate ? 'monthly' : current.amount > 0 ? 'due' : 'muted'
      return `<td class="${cls}"><strong>${esc(amountText)}</strong><small>${esc(current.status)}</small></td>`
    }

    const summaryRows = [
      ['單一車輛', selectedReport.count ?? 0, '月租候選', selectedReport.monthlyCandidateCount ?? 0],
      ['0元未滿15分鐘', selectedReport.zeroUnder15Count ?? 0, '查無繳費紀錄', selectedReport.noPaymentCount ?? 0],
      ['有待繳金額', selectedReport.dueCount ?? 0, '待繳總額', money(selectedReport.total)],
      ['0元無法判斷', selectedReport.zeroUnknownCount ?? 0, '查詢異常', selectedReport.errorCount ?? 0],
    ]

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>每日繳費報表 ${esc(selectedReportDate || '')}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, "Microsoft JhengHei", sans-serif; color: #0f172a; margin: 0; padding-top: 58px; }
    h1 { font-size: 20px; margin: 0 0 6px; }
    h2 { font-size: 15px; margin: 18px 0 8px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 12px; }
    .actions { position: fixed; z-index: 10; inset: 0 0 auto; min-height: 44px; display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #0f172a; color: #fff; box-shadow: 0 2px 10px rgba(15,23,42,.16); }
    .actions button { border: 0; border-radius: 8px; background: #fff; color: #0f172a; font-weight: 800; padding: 9px 14px; cursor: pointer; }
    .actions span { font-size: 12px; color: #cbd5e1; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { border: 1px solid #dbe3ee; padding: 5px 6px; vertical-align: top; }
    th { background: #eef3f9; font-weight: 800; text-align: left; }
    td.num, th.num { text-align: right; }
    small { display: block; color: #64748b; font-size: 9px; margin-top: 2px; }
    .due { color: #0369a1; }
    .monthly { color: #b45309; }
    .muted { color: #64748b; }
    .nowrap { white-space: nowrap; }
    @media print {
      body { padding-top: 0; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button type="button" onclick="window.print()">下載 / 儲存 PDF</button>
    <span>開啟列印後選「儲存為 PDF」或「存到檔案」。</span>
  </div>
  <h1>每日繳費報表</h1>
  <div class="meta">匯出時間：${esc(new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }))}；目前選取日期：${esc(selectedReportDate || '-')}</div>

  <h2>統計摘要</h2>
  <table>
    <tbody>
      ${summaryRows.map((r) => `
        <tr>
          <th>${esc(r[0])}</th><td class="num">${esc(r[1])}</td>
          <th>${esc(r[2])}</th><td class="num">${esc(r[3])}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>金額加總</h2>
  <table>
    <thead><tr>${reportAmountTotals.map((item, index) => `<th class="num">${esc(shortDate(item.date))}${index === 0 ? '（初次統計）' : ''}</th>`).join('')}</tr></thead>
    <tbody>
      <tr>${reportAmountTotals.map((item, index) => `
        <td class="num ${index === 0 || item.amount >= 0 ? 'due' : 'monthly'}">
          <strong>${esc(index === 0 ? money(item.amount) : signedAmount(item.amount))}</strong>
          <small>${esc(item.count)} 台</small>
        </td>
      `).join('')}</tr>
    </tbody>
  </table>

  <h2>車牌金額明細</h2>
  <table>
    <thead>
      <tr>
        <th class="nowrap">車號</th>
        <th class="nowrap">入場時間</th>
        ${reportDatesAsc.map((date, index) => `<th class="nowrap">${esc(shortDate(date))}${index === 0 ? '（初次統計）' : ''}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${reportComparisonRows.map((row) => `
        <tr>
          <td class="nowrap"><strong>${esc(row.plate)}</strong></td>
          <td class="nowrap muted">${esc(row.entryAt || '-')}</td>
          ${reportDatesAsc.map((date) => cellAmount(row, date)).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
  <script>
    window.onload = function () {
      window.focus();
      setTimeout(function () {
        try { window.print(); } catch (e) {}
      }, 500);
    };
  </script>
</body>
</html>`

    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) {
      flash('瀏覽器阻擋彈出視窗，請允許後再匯出')
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  // 上傳車牌 PDF → 分析出所有車牌 → 加入批次清單
  const onPickPdf = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (pdfRef.current) pdfRef.current.value = ''
    setPdfLoading(true)
    flash('分析 PDF 中…')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parking/extract-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && Array.isArray(data.plates) && data.plates.length) {
        const items = data.plates.map((p) => ({ id: `${Date.now()}-${Math.random()}`, dataUrl: '', photoUrl: '', plate: p, recognizing: false }))
        setBatch((prev) => [...prev, ...items])
        flash(`已從 PDF 讀取 ${data.plates.length} 個車牌`)
      } else if (res.ok) flash('PDF 中找不到車牌')
      else flash(data.error || 'PDF 分析失敗')
    } catch { flash('PDF 分析失敗') }
    finally { setPdfLoading(false) }
  }

  const processBatchItem = async (it) => {
    try {
      let compressed = null
      try { compressed = await compressImage(it.file) } catch { /* 用原檔 */ }
      const blob = compressed?.blob || it.file
      const dataUrl = compressed?.dataUrl || null
      // 上傳雲端；失敗則用壓縮圖存檔
      let photoUrl = dataUrl
      try {
        const fd = new FormData()
        fd.append('file', blob, 'plate.jpg')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (res.ok) { const d = await res.json(); if (d.url) photoUrl = d.url }
      } catch { /* 用 dataUrl */ }
      updateBatch(it.id, { dataUrl, photoUrl })
      // 辨識車牌
      let plate = ''
      if (dataUrl) {
        try {
          const r = await fetch('/api/parking/recognize', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: dataUrl }),
          })
          const d = await r.json()
          if (r.ok && d.plate) plate = d.plate
        } catch { /* 保持空白 */ }
      }
      updateBatch(it.id, { plate, recognizing: false })
    } catch {
      updateBatch(it.id, { recognizing: false })
    }
  }

  // 打開繳費網站，並把車牌複製到剪貼簿
  const openPay = async (plateNo) => {
    const url = lot?.payUrl || DEFAULT_PAY_URL
    if (plateNo) {
      try { await navigator.clipboard.writeText(plateNo); flash(`已複製 ${plateNo}，貼到繳費網站查金額`) } catch { /* 忽略 */ }
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const enterBatchItem = async (it) => {
    if (!it.plate.trim()) { flash('請先填車牌'); return false }
    const res = await fetch('/api/parking/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lotId, plate: it.plate, photoUrl: it.photoUrl }),
    })
    if (res.ok) { setBatch((prev) => prev.filter((x) => x.id !== it.id)); return true }
    const d = await res.json().catch(() => ({}))
    flash(d.error || '進場失敗')
    return false
  }

  const enterAllBatch = async () => {
    let n = 0
    for (const it of batch.filter((x) => x.plate.trim())) { if (await enterBatchItem(it)) n++ }
    if (n) { flash(`已批次進場 ${n} 台`); reload(lotId) }
  }

  // 呼叫 RTD 查詢金額
  const queryFees = async (plates) => {
    try {
      const res = await fetch('/api/parking/query-fee', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plates,
          siteVendorId: lot?.rtdVendorId || DEFAULT_VENDOR_ID,
          scanCode: lot?.rtdScanCode || DEFAULT_SCAN_CODE,
        }),
      })
      const data = await res.json()
      if (!res.ok) { flash(data.error || '查金額失敗'); return [] }
      return data.results || []
    } catch { flash('查金額失敗'); return [] }
  }

  const queryFeeSingle = async () => {
    if (!plate.trim()) { flash('請先填車牌'); return }
    setSingleFee({ loading: true })
    const [r] = await queryFees([plate])
    setSingleFee({ loading: false, ...(r || { ok: false, error: '無回應' }) })
  }

  const queryFeeItem = async (it) => {
    if (!it.plate.trim()) { flash('請先填車牌'); return }
    updateBatch(it.id, { fee: { loading: true } })
    const [r] = await queryFees([it.plate])
    updateBatch(it.id, { fee: { loading: false, ...(r || { ok: false, error: '無回應' }) } })
  }

  const queryAllFees = async () => {
    const items = batch.filter((x) => x.plate.trim())
    if (!items.length) return
    items.forEach((it) => updateBatch(it.id, { fee: { loading: true } }))
    const results = await queryFees(items.map((x) => x.plate))
    const byPlate = {}
    results.forEach((r) => { byPlate[String(r.plate).toUpperCase()] = r })
    setBatch((prev) => prev.map((x) => {
      const r = byPlate[x.plate.trim().toUpperCase()]
      return r ? { ...x, fee: { loading: false, ...r } } : (x.fee?.loading ? { ...x, fee: { loading: false, ok: false, error: '無回應' } } : x)
    }))
    flash('查金額完成')
  }

  const startLiveReportQuery = async ({ reset = false } = {}) => {
    const currentPlates = [...new Set(reportComparisonRows.map((row) => row.plate).filter(Boolean))]
    const savedPlates = Array.isArray(liveQuery.plates) ? liveQuery.plates : []
    const plates = [...new Set([...(reset ? [] : savedPlates), ...currentPlates])]
    if (!plates.length) { flash('目前沒有可查詢的累積車牌'); return }
    const meta = reset ? reportPlateMeta : { ...(liveQuery.meta || {}), ...reportPlateMeta }

    const existingResults = reset ? [] : liveQuery.results || []
    const existingByPlate = new Map(existingResults.map((row) => [String(row.plate || '').toUpperCase(), row]))
    const pending = plates.filter((plate) => isLiveQueryProblem(existingByPlate.get(String(plate).toUpperCase())))

    if (!pending.length) {
      setLiveQuery((prev) => ({ ...prev, open: true, running: false, plates, meta, total: plates.length, done: plates.length, message: '目前暫存結果都已完成，不需補查', updatedAt: new Date().toISOString() }))
      flash('目前沒有需要補查的車牌')
      return
    }

    liveQueryStopRef.current = false
    setLiveQuery({
      open: true,
      running: true,
      total: plates.length,
      done: plates.length - pending.length,
      plates,
      results: existingResults,
      meta,
      message: reset ? '重新查詢：已清空暫存' : `繼續查詢：剩 ${pending.length} 台需要補查`,
      updatedAt: new Date().toISOString(),
    })

    let all = existingResults
    for (let i = 0; i < pending.length; i += 5) {
      if (liveQueryStopRef.current) break
      const chunk = pending.slice(i, i + 5)
      let results = []
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (liveQueryStopRef.current) break
        setLiveQuery((prev) => ({ ...prev, message: attempt ? `RTD 暫時限制，等待後重試第 ${attempt + 1} 次...` : `補查 ${i + 1}-${Math.min(i + chunk.length, pending.length)} / ${pending.length} 台` }))
        results = await queryFees(chunk)
        const limited = results.some((r) => r?.rateLimited || r?.status === 403 || r?.status === 429 || /403|429/.test(String(r?.error || '')))
        if (!limited || attempt === 2) break
        await sleep(attempt === 0 ? 15000 : 45000)
      }
      all = mergeLiveResults(all, results)
      const byPlate = new Map(all.map((row) => [String(row.plate || '').toUpperCase(), row]))
      const remaining = plates.filter((plate) => isLiveQueryProblem(byPlate.get(String(plate).toUpperCase()))).length
      setLiveQuery((prev) => ({
        ...prev,
        running: true,
        done: plates.length - remaining,
        plates,
        total: plates.length,
        results: all,
        meta,
        message: liveQueryStopRef.current ? '已暫停查詢' : `已完成 ${plates.length - remaining} / ${plates.length} 台，剩 ${remaining} 台需補查`,
        updatedAt: new Date().toISOString(),
      }))
      if (i + 5 < pending.length && !liveQueryStopRef.current) await sleep(2500)
    }

    const byPlate = new Map(all.map((row) => [String(row.plate || '').toUpperCase(), row]))
    const remaining = plates.filter((plate) => isLiveQueryProblem(byPlate.get(String(plate).toUpperCase()))).length
    setLiveQuery((prev) => ({
      ...prev,
      running: false,
      done: plates.length - remaining,
      plates,
      total: plates.length,
      results: all,
      meta,
      message: liveQueryStopRef.current ? `已暫停，剩 ${remaining} 台可繼續補查` : remaining ? `查詢完成，仍有 ${remaining} 台需補查` : '查詢完成',
      updatedAt: new Date().toISOString(),
    }))
    flash(liveQueryStopRef.current ? '已暫停即時查詢，可稍後繼續' : `即時查詢完成：剩 ${remaining} 台需補查`)
  }

  // 把 fee 結果轉成顯示文字/顏色
  const feeLabel = (fee) => {
    if (!fee) return null
    if (fee.loading) return { text: '查詢中…', color: '#64748b' }
    if (fee.ok === false) return { text: `⚠ ${fee.error || '查詢失敗'}${fee.detail ? '：' + fee.detail : ''}`, color: '#dc2626' }
    if (fee.unknown) return { text: '⚠ 回應格式需確認', color: '#b45309' }
    if (fee.owing) return { text: `待繳 ${money(fee.amount)}（${fee.count} 筆）`, color: '#b45309' }
    return { text: '✓ 無待繳', color: '#15803d' }
  }

  // 車輛進場
  const enterVehicle = async () => {
    if (!plate.trim()) return flash('請輸入車牌')
    setEntering(true)
    try {
      const res = await fetch('/api/parking/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId, plate, photoUrl }),
      })
      const data = await res.json()
      if (res.ok) {
        setPlate(''); setPhotoUrl(''); setSingleFee(null)
        if (fileRef.current) fileRef.current.value = ''
        flash('進場登記完成')
        reload(lotId)
      } else flash(data.error || '登記失敗')
    } catch { flash('登記失敗') }
    finally { setEntering(false) }
  }

  // 車輛出場
  const exitVehicle = async (s) => {
    if (!confirm(`確認 ${s.plate} 出場？應繳 ${money(s.liveAmount)}`)) return
    const res = await fetch(`/api/parking/sessions/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'exit' }),
    })
    if (res.ok) { flash(`${s.plate} 已出場`); reload(lotId) }
    else flash('出場失敗')
  }

  // 切換已繳/未繳
  const togglePaid = async (s) => {
    const res = await fetch(`/api/parking/sessions/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: s.paid ? 'unpay' : 'pay' }),
    })
    if (res.ok) reload(lotId)
  }

  // 刪除紀錄
  const removeSession = async (s) => {
    if (!confirm(`刪除 ${s.plate} 這筆紀錄？`)) return
    const res = await fetch(`/api/parking/sessions/${s.id}`, { method: 'DELETE' })
    if (res.ok) { flash('已刪除'); reload(lotId) }
  }

  const reportDatesAsc = useMemo(
    () => [...reportDays].map((day) => day.reportDate).sort(),
    [reportDays]
  )

  const selectedReport = useMemo(
    () => reportDetails[selectedReportDate] || reportDays.find((day) => day.reportDate === selectedReportDate) || null,
    [reportDetails, reportDays, selectedReportDate]
  )

  const reportComparisonRows = useMemo(() => {
    const byPlate = new Map()
    for (const date of reportDatesAsc) {
      for (const row of reportDetails[date]?.rows || []) {
        if (!byPlate.has(row.plate)) byPlate.set(row.plate, {})
        byPlate.get(row.plate)[date] = row
      }
    }

    return [...byPlate.entries()]
      .map(([plate, records]) => {
        const firstRecord = reportDatesAsc.map((date) => records[date]).find(Boolean) || {}
        const latestRecord = [...reportDatesAsc].reverse().map((date) => records[date]).find(Boolean) || firstRecord
        return {
          plate,
          entryAt: recordEntryAt(firstRecord) || recordEntryAt(latestRecord),
          status: latestRecord.status,
          monthlyCandidate: latestRecord.monthlyCandidate,
          amount: latestRecord.amount,
          records,
        }
      })
      .sort((a, b) => (b.amount || 0) - (a.amount || 0) || a.plate.localeCompare(b.plate))
  }, [reportDatesAsc, reportDetails])

  const reportAmountTotals = useMemo(() => {
    return reportDatesAsc.map((date) => {
      const amount = reportComparisonRows.reduce((sum, row) => {
        const current = row.records[date]
        if (!current) return sum
        const previousDate = [...reportDatesAsc].filter((d) => d < date && row.records[d]).pop()
        const previous = previousDate ? row.records[previousDate] : null
        return sum + (previous ? Number(current.amount || 0) - Number(previous.amount || 0) : Number(current.amount || 0))
      }, 0)
      const count = reportComparisonRows.reduce((sum, row) => sum + (row.records[date] ? 1 : 0), 0)
      return { date, amount, count }
    })
  }, [reportComparisonRows, reportDatesAsc])

  const reportPlateMeta = useMemo(() => {
    return Object.fromEntries(reportComparisonRows.map((row) => {
      const records = Object.values(row.records || {})
      return [row.plate, {
        entryAt: row.entryAt || recordEntryAt(records.find((record) => recordEntryAt(record))) || '',
        monthlyCandidate: records.some((record) => record?.monthlyCandidate || record?.status === '月租候選'),
      }]
    }))
  }, [reportComparisonRows])

  useEffect(() => {
    const plates = Object.keys(reportPlateMeta)
    if (!plates.length || (!liveQuery.plates.length && !liveQuery.results.length)) return
    let changed = false
    const meta = { ...(liveQuery.meta || {}) }
    const mergedPlates = [...new Set([...(liveQuery.plates || []), ...plates])]
    for (const plate of plates) {
      const next = reportPlateMeta[plate]
      const prev = meta[plate] || {}
      if ((next.entryAt && prev.entryAt !== next.entryAt) || Boolean(prev.monthlyCandidate) !== Boolean(next.monthlyCandidate)) {
        meta[plate] = { ...prev, ...next }
        changed = true
      }
    }
    if (changed || mergedPlates.length !== liveQuery.plates.length) {
      setLiveQuery((prev) => ({ ...prev, meta, plates: mergedPlates, total: Math.max(prev.total || 0, mergedPlates.length) }))
    }
  }, [liveQuery.meta, liveQuery.plates, liveQuery.results.length, reportPlateMeta])

  const liveQuerySummary = useMemo(() => {
    const summary = liveQuery.results.reduce(
      (acc, row) => {
        acc.checked += 1
        if (liveQuery.meta?.[row.plate]?.monthlyCandidate) acc.checkedMonthlyCandidateCount += 1
        if (row.rateLimited || row.status === 403 || row.status === 429 || /403|429/.test(String(row.error || ''))) acc.rateLimitedCount += 1
        else if (row.ok === false) acc.errorCount += 1
        else if (row.unknown) acc.unknownCount += 1
        else if (row.owing) {
          acc.owingCount += 1
          acc.owingTotal += Number(row.amount || 0)
        } else {
          acc.noOwingCount += 1
        }
        return acc
      },
      { checked: 0, checkedMonthlyCandidateCount: 0, owingCount: 0, noOwingCount: 0, unknownCount: 0, errorCount: 0, rateLimitedCount: 0, owingTotal: 0 }
    )
    summary.monthlyCandidateCount = (liveQuery.plates || []).filter((plate) => liveQuery.meta?.[plate]?.monthlyCandidate).length
    return summary
  }, [liveQuery.meta, liveQuery.plates, liveQuery.results])

  const selectedTdxDay = useMemo(
    () => (tdxAvailability?.daily || []).find((day) => day.reportDate === selectedTdxDate) || null,
    [tdxAvailability, selectedTdxDate]
  )

  const selectedTdxTimeline = useMemo(
    () => (tdxAvailability?.timeline || []).filter((row) => {
      if (!selectedTdxDate) return true
      const value = row.sampledAt || row.rawUpdatedAt || ''
      return fmtDateTimeSeconds(value).startsWith(selectedTdxDate)
    }),
    [tdxAvailability, selectedTdxDate]
  )

  const tdxCandidateResults = useMemo(() => {
    const q = tdxSearch.trim().toLowerCase()
    if (!q) return []
    const favorites = new Set((tdxAvailability?.favorites || []).map((row) => String(row.carParkId)))
    return (tdxAvailability?.candidates || [])
      .filter((row) => !favorites.has(String(row.carParkId)))
      .filter((row) => {
        const haystack = `${row.carParkId || ''} ${row.name || ''}`.toLowerCase()
        return haystack.includes(q)
      })
      .slice(0, 12)
  }, [tdxAvailability, tdxSearch])

  const addTdxFavorite = async (row) => {
    if (!row?.carParkId) return
    setTdxFavoriteSaving(row.carParkId)
    try {
      const res = await fetch('/api/parking/tdx/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carParkId: row.carParkId, name: row.name || row.carParkId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        flash(data.error || '加入收藏失敗')
        return
      }
      setTdxSearch('')
      flash('已加入收藏停車場')
      await reload(lotId, { showTdxStatus: true })
    } catch {
      flash('加入收藏失敗')
    } finally {
      setTdxFavoriteSaving('')
    }
  }

  const removeTdxFavorite = async (carParkId) => {
    if (!carParkId) return
    setTdxFavoriteSaving(carParkId)
    try {
      const res = await fetch(`/api/parking/tdx/favorites?carParkId=${encodeURIComponent(carParkId)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        flash(data.error || '移除收藏失敗')
        return
      }
      flash('已移除收藏停車場')
      await reload(lotId, { showTdxStatus: true })
    } catch {
      flash('移除收藏失敗')
    } finally {
      setTdxFavoriteSaving('')
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#64748b' }}>載入中…</div>
  }

  const tdxLatest = tdxAvailability?.latest || null
  const tdxToday = tdxAvailability?.daily?.find((day) => day.reportDate === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })) || null
  const selectedTdxFavorite = (tdxAvailability?.favorites || []).find((fav) => fav.carParkId === selectedTdxCarParkId) || null
  const selectedTdxLive = (tdxAvailability?.lots || []).find((row) => row.carParkId === selectedTdxCarParkId) || tdxLatest
  const manualRefreshWait = Number(tdxAvailability?.manualRefresh?.waitSeconds || 0)
  const manualRefreshAllowed = tdxAvailability?.manualRefresh?.allowed !== false
  const displayTotalSpaces = tdxLatest?.total ?? stats?.totalSpaces ?? 0
  const displayAvailable = tdxLatest?.available ?? stats?.available ?? 0
  const displayOnsite = tdxLatest?.occupied ?? stats?.onsite ?? 0
  const util = tdxLatest?.utilization ?? stats?.utilization ?? 0
  const displayTodayEntries = tdxToday?.entries ?? stats?.todayEntries ?? 0
  const displayTodayExits = tdxToday?.exits ?? stats?.todayExits ?? 0
  const displayTurnover = displayTotalSpaces ? Math.round((displayTodayEntries / displayTotalSpaces) * 100) / 100 : 0

  // 查詢時合併現場＋歷史用車牌過濾；否則顯示目前分頁
  const shownList = query
    ? [...onsite, ...history].filter((s) => s.plate.includes(query))
    : tab === 'onsite' ? onsite : history

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', color: '#0f172a', fontFamily: 'var(--font-sans, sans-serif)' }}>
      {/* 頂欄 */}
      <header style={{ background: '#0f172a', color: '#fff', padding: '16px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 22 }}>🅿️</span>
          <strong style={{ fontSize: 18, letterSpacing: 1 }}>停車場管理後台</strong>
          <div style={{ flex: 1 }} />
          {lots.length > 0 && (
            <select value={lotId} onChange={(e) => setLotId(e.target.value)}
              style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
              {lots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowSettings(true)}
            style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>
            ⚙️ 設定
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px' }}>
        {/* 統計列 */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 22 }}>
          <StatCard label="在場車輛" value={`${displayOnsite} / ${displayTotalSpaces}`} sub={`剩餘 ${displayAvailable} 格${tdxLatest ? ' · TDX 官方' : ''}`} />
          <StatCard label="車格使用率" value={`${util}%`} accent={util >= 90 ? '#dc2626' : util >= 70 ? '#d97706' : '#16a34a'} sub={tdxLatest?.rawUpdatedAt ? `更新 ${tdxLatest.rawUpdatedAt}` : '在場 ÷ 總車格'} />
          <StatCard label="今日周轉率" value={displayTurnover} sub={`今日進場 ${displayTodayEntries} 車次`} />
          <StatCard label="現場待繳總額" value={money(stats?.dueTotal)} accent="#0369a1" sub={`${stats?.unpaidCount ?? 0} 台未繳`} />
          <StatCard label="今日已收營收" value={money(stats?.revenueToday)} sub={`今日出場 ${displayTodayExits} 台`} />
        </section>

        {/* 使用率進度條 */}
        <div style={{ background: '#e2e8f0', borderRadius: 999, height: 10, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ width: `${Math.min(100, util)}%`, height: '100%', background: util >= 90 ? '#dc2626' : util >= 70 ? '#d97706' : '#16a34a', transition: 'width .3s' }} />
        </div>

        <section style={{ background: '#fff', borderRadius: 16, padding: 18, marginBottom: 24, boxShadow: '0 2px 12px rgba(30,41,59,0.06)', border: '1px solid #eef1f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>TDX 官方剩餘車格</h2>
            <button type="button" disabled={tdxRefreshing || !manualRefreshAllowed} onClick={() => reload(lotId, { showTdxStatus: true, forceTdxRefresh: true })}
              style={{ padding: '8px 12px', background: tdxRefreshing || !manualRefreshAllowed ? '#94a3b8' : '#0369a1', color: '#fff', border: 'none', borderRadius: 10, cursor: tdxRefreshing || !manualRefreshAllowed ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
              {tdxRefreshing ? '更新中…' : manualRefreshAllowed ? '更新 TDX' : `等待 ${manualRefreshWait} 秒`}
            </button>
            {tdxAvailability?.checkedAt && (
              <span style={{ fontSize: 12, color: '#64748b' }}>
                最後檢查 {new Date(tdxAvailability.checkedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })}
                {tdxAvailability.fromCache ? ' · 快取' : ' · 即時'}
                {tdxAvailability.favoriteCacheTtlSeconds ? ` · 收藏 ${tdxAvailability.favoriteCacheTtlSeconds} 秒快取` : ''}
              </span>
            )}
            {tdxAvailability?.fetchError && <span style={{ fontSize: 12, color: '#b45309' }}>{tdxAvailability.fetchError}</span>}
            {tdxAvailability?.carParkFetchError && <span style={{ fontSize: 12, color: '#b45309' }}>{tdxAvailability.carParkFetchError}</span>}
            {tdxAvailability?.parkingSpaceFetchError && <span style={{ fontSize: 12, color: '#b45309' }}>{tdxAvailability.parkingSpaceFetchError}</span>}
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
            資料來源：TDX 官方 OffStreet/ParkingAvailability/City/Taichung。收藏停車場每 30 秒檢查一次；手動更新每 10 分鐘一次。剩餘格下降視為進場、剩餘格上升視為出場；異常跳點不列入進出場。
          </p>
          {tdxAvailability?.notice && (
            <div style={{ padding: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 700 }}>
              {tdxAvailability.notice}
            </div>
          )}
          {tdxAvailability?.diagnostics && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {Object.values(tdxAvailability.diagnostics).map((item) => (
                <span key={item.endpoint} style={{ padding: '6px 9px', borderRadius: 999, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 700 }}>
                  {item.endpoint}: {item.rawItemsLength ?? 0} 筆
                </span>
              ))}
            </div>
          )}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, marginBottom: 14, background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <strong style={{ fontSize: 14 }}>收藏追蹤停車場</strong>
              <span style={{ fontSize: 12, color: '#64748b' }}>只紀錄你加入收藏的 TDX 停車場</span>
            </div>
            <input
              value={tdxSearch}
              onChange={(e) => setTdxSearch(e.target.value)}
              placeholder="搜尋停車場名稱或 ID，例如 01P0C0001E / 自由一期"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 14, marginBottom: tdxCandidateResults.length ? 8 : 0 }}
            />
            {tdxCandidateResults.length > 0 && (
              <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                {tdxCandidateResults.map((row) => (
                  <div key={row.carParkId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{row.name || row.carParkId}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {row.carParkId} · 汽車 {spacePair(row.carAvailable, row.carTotal)} · 機車 {spacePair(row.motorAvailable, row.motorTotal)} · 總 {spacePair(row.available, row.total)}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={tdxFavoriteSaving === row.carParkId}
                      onClick={() => addTdxFavorite(row)}
                      style={{ padding: '7px 10px', border: 'none', borderRadius: 9, background: '#15803d', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                    >
                      加入
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(tdxAvailability?.favorites || []).length > 0 ? (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 960 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>停車場</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>ID</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>汽車格</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>機車格</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>總格數</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>更新時間</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>紀錄</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tdxAvailability.favorites || []).map((fav) => {
                      const live = (tdxAvailability.lots || []).find((row) => row.carParkId === fav.carParkId)
                      return (
                        <tr key={fav.carParkId} style={{ borderTop: '1px solid #f1f5f9', background: selectedTdxCarParkId === fav.carParkId ? '#f0fdf4' : '#fff' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 800 }}>{live?.name || fav.name}</td>
                          <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{fav.carParkId}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: live?.carAvailable === 0 ? '#dc2626' : '#15803d' }}>{spacePair(live?.carAvailable, live?.carTotal)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: live?.motorAvailable === 0 ? '#dc2626' : '#15803d' }}>{spacePair(live?.motorAvailable, live?.motorTotal)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{spacePair(live?.available, live?.total)}</td>
                          <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{live?.rawUpdatedAt || '尚未取得'}</td>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                            <button type="button" onClick={() => setSelectedTdxCarParkId(fav.carParkId)}
                              style={{ padding: '6px 9px', border: selectedTdxCarParkId === fav.carParkId ? '1px solid #15803d' : '1px solid #cbd5e1', borderRadius: 8, background: selectedTdxCarParkId === fav.carParkId ? '#15803d' : '#fff', color: selectedTdxCarParkId === fav.carParkId ? '#fff' : '#0f172a', fontWeight: 800, cursor: 'pointer' }}>
                              {selectedTdxCarParkId === fav.carParkId ? '查看中' : '查看紀錄'}
                            </button>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <button type="button" onClick={() => removeTdxFavorite(fav.carParkId)}
                              disabled={tdxFavoriteSaving === fav.carParkId}
                              style={{ padding: '6px 9px', border: '1px solid #fecaca', borderRadius: 8, background: '#fff', color: '#dc2626', fontWeight: 800, cursor: 'pointer' }}>
                              移除
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 12, color: '#94a3b8', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 10, textAlign: 'center' }}>
                尚未收藏停車場，請先搜尋並加入。未收藏前系統仍會顯示 TDX 第一筆作為預覽。
              </div>
            )}
          </div>
          {selectedTdxCarParkId && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
              <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>目前查看紀錄</div>
                <div style={{ fontWeight: 900 }}>{selectedTdxLive?.name || selectedTdxFavorite?.name || selectedTdxCarParkId}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selectedTdxCarParkId}</div>
              </div>
              <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>汽車格</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: selectedTdxLive?.carAvailable === 0 ? '#dc2626' : '#15803d' }}>{selectedTdxLive?.carAvailable ?? '-'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>總格數 {selectedTdxLive?.carTotal ?? '-'}</div>
              </div>
              <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>機車格</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: selectedTdxLive?.motorAvailable === 0 ? '#dc2626' : '#15803d' }}>{selectedTdxLive?.motorAvailable ?? '-'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>總格數 {selectedTdxLive?.motorTotal ?? '-'}</div>
              </div>
              <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>全部車格</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: selectedTdxLive?.available === 0 ? '#dc2626' : '#15803d' }}>{selectedTdxLive?.available ?? '-'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>總格數 {selectedTdxLive?.total ?? '-'}</div>
              </div>
              <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>最新資料時間</div>
                <div style={{ fontWeight: 900 }}>{selectedTdxLive?.rawUpdatedAt || '尚未取得'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>每筆 TDX 更新會寫入系統紀錄</div>
              </div>
            </div>
          )}
          {(tdxAvailability?.daily || []).length ? (
            <>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
                {(tdxAvailability?.daily || []).map((day) => {
                  const active = selectedTdxDate === day.reportDate
                  return (
                    <button key={day.reportDate} type="button" onClick={() => setSelectedTdxDate(day.reportDate)}
                      style={{ flex: '0 0 auto', padding: '9px 14px', background: active ? '#0f172a' : '#f8fafc', color: active ? '#fff' : '#334155', border: active ? '1px solid #0f172a' : '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>
                      {shortDate(day.reportDate)}
                      <span style={{ display: 'block', marginTop: 2, fontSize: 11, fontWeight: 600, color: active ? '#cbd5e1' : '#94a3b8' }}>進 {day.entries ?? 0} / 出 {day.exits ?? 0}</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
                  <tbody>
                    {[
                      ['進場車次', selectedTdxDay?.entries ?? 0, '出場車次', selectedTdxDay?.exits ?? 0],
                      ['紀錄筆數', selectedTdxDay?.samples ?? 0, '平均使用率', selectedTdxDay?.avgUtilization != null ? `${selectedTdxDay.avgUtilization}%` : '-'],
                      ['最後剩餘格', selectedTdxDay?.lastAvailable ?? '-', '異常跳點', selectedTdxDay?.anomalies ?? 0],
                    ].map((r) => (
                      <tr key={r[0]} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <th style={{ width: '25%', padding: '8px 10px', background: '#f1f5f9', textAlign: 'center', fontWeight: 800 }}>{r[0]}</th>
                        <td style={{ width: '25%', padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{r[1]}</td>
                        <th style={{ width: '25%', padding: '8px 10px', background: '#f1f5f9', textAlign: 'center', fontWeight: 800 }}>{r[2]}</th>
                        <td style={{ width: '25%', padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{r[3]}</td>
                      </tr>
                    ))}
                    {selectedTdxDay?.note && (
                      <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 10px', background: '#f1f5f9', textAlign: 'center', fontWeight: 800 }}>備註</th>
                        <td colSpan={3} style={{ padding: '8px 10px', color: '#64748b' }}>{selectedTdxDay.note}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 14 }}>
              尚未取得 TDX 官方剩餘車格資料
            </div>
          )}
          {tdxAvailability?.dataStatus === 'carpark-list-only' && (tdxAvailability?.lots || []).length > 0 && (
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>停車場 ID</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>停車場名稱</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>總格數</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>地址</th>
                  </tr>
                </thead>
                <tbody>
                  {(tdxAvailability.lots || []).slice(0, 80).map((row) => (
                    <tr key={row.carParkId} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800, whiteSpace: 'nowrap' }}>{row.carParkId}</td>
                      <td style={{ padding: '8px 10px' }}>{row.name || '-'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.total || '-'}</td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{row.address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1040 }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#334155', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>紀錄時間</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>來源更新</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>汽車格</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>機車格</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>剩餘格</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>在場</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>使用率</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>進場</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>出場</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>判斷</th>
                </tr>
              </thead>
              <tbody>
                {selectedTdxTimeline.map((row) => (
                  <tr key={`${row.sampledAt || row.rawUpdatedAt}-${row.available}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{fmtDateTimeSeconds(row.sampledAt)}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#64748b' }}>{row.rawUpdatedAt || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{spacePair(row.carAvailable, row.carTotal)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{spacePair(row.motorAvailable, row.motorTotal)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.available}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.occupied}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{row.utilization}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0369a1', fontWeight: 800 }}>{row.entries}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#15803d', fontWeight: 800 }}>{row.exits}</td>
                    <td style={{ padding: '8px 10px', color: row.anomaly ? '#b45309' : '#64748b' }}>{row.anomaly ? '系統跳點已排除' : '正常'}</td>
                  </tr>
                ))}
                {!selectedTdxTimeline.length && (
                  <tr><td colSpan={10} style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>此日期尚未累積剩餘車位紀錄，只有每日摘要</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 每日繳費報表匯入 */}
        <section style={{ background: '#fff', borderRadius: 16, padding: 18, marginBottom: 24, boxShadow: '0 2px 12px rgba(30,41,59,0.06)', border: '1px solid #eef1f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📊 每日繳費報表</h2>
            <input ref={reportRef} type="file" accept="application/pdf" onChange={onImportReport} style={{ display: 'none' }} id="import-report" />
            <label htmlFor="import-report"
              style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              {importing ? '匯入中...' : '匯入報表 PDF'}
            </label>
            <button type="button" onClick={() => liveQuery.running ? setLiveQuery((prev) => ({ ...prev, open: true })) : startLiveReportQuery()} disabled={!liveQuery.running && reportComparisonRows.length === 0 && liveQuery.plates.length === 0}
              style={{ padding: '8px 16px', background: liveQuery.running ? '#64748b' : '#0369a1', color: '#fff', border: 'none', borderRadius: 10, cursor: !liveQuery.running && reportComparisonRows.length === 0 && liveQuery.plates.length === 0 ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
              {liveQuery.running ? `即時查詢中 ${liveQuery.done}/${liveQuery.total}` : liveQuery.results.length ? '繼續即時查詢' : '即時代繳查詢'}
            </button>
            <button type="button" onClick={downloadReportPdf} disabled={reportExporting || !selectedReport || reportComparisonRows.length === 0}
              style={{ padding: '8px 16px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 10, cursor: reportExporting || !selectedReport || reportComparisonRows.length === 0 ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
              {reportExporting ? '產生 PDF 中...' : '匯出 PDF'}
            </button>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
            判斷規則：RTD 回傳有入場/開始計費時間、actualPrice = 0，且查詢時間距離入場時間超過 15 分鐘，標記為「月租候選」。
          </p>

          {reportDays.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 14 }}>尚未匯入任何報表</div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 14 }}>
                {reportDays.map((d) => {
                  const active = selectedReportDate === d.reportDate
                  return (
                    <button key={d.reportDate} type="button" onClick={() => openDayDetail(d.reportDate)}
                      style={{ flex: '0 0 auto', padding: '9px 14px', background: active ? '#0f172a' : '#f8fafc', color: active ? '#fff' : '#334155', border: active ? '1px solid #0f172a' : '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>
                      {shortDate(d.reportDate)}
                      <span style={{ display: 'block', marginTop: 2, fontSize: 11, fontWeight: 600, color: active ? '#cbd5e1' : '#94a3b8' }}>{d.count} 台</span>
                    </button>
                  )
                })}
                <div style={{ flex: 1 }} />
                {selectedReportDate && (
                  <button type="button" onClick={() => deleteDay(selectedReportDate)}
                    style={{ flex: '0 0 auto', padding: '8px 12px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    刪除本日
                  </button>
                )}
              </div>

              {selectedReport && (
                <>
                  <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800 }}>統計摘要</h3>
                  <div style={{ overflowX: 'auto', marginBottom: 18 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
                      <tbody>
                        {[
                          ['單一車輛', selectedReport.count ?? 0, '月租候選', selectedReport.monthlyCandidateCount ?? 0],
                          ['0元未滿15分鐘', selectedReport.zeroUnder15Count ?? 0, '查無繳費紀錄', selectedReport.noPaymentCount ?? 0],
                          ['有待繳金額', selectedReport.dueCount ?? 0, '待繳總額', money(selectedReport.total)],
                          ['0元無法判斷', selectedReport.zeroUnknownCount ?? 0, '查詢異常', selectedReport.errorCount ?? 0],
                        ].map((r) => (
                          <tr key={r[0]} style={{ borderTop: '1px solid #e2e8f0' }}>
                            <th style={{ width: '25%', padding: '7px 10px', background: '#f1f5f9', textAlign: 'center', fontWeight: 800 }}>{r[0]}</th>
                            <td style={{ width: '25%', padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>{r[1]}</td>
                            <th style={{ width: '25%', padding: '7px 10px', background: '#f1f5f9', textAlign: 'center', fontWeight: 800 }}>{r[2]}</th>
                            <td style={{ width: '25%', padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>{r[3]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800 }}>金額加總</h3>
                  <div style={{ overflowX: 'auto', marginBottom: 18 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: Math.max(560, reportDatesAsc.length * 150) }}>
                      <thead>
                        <tr style={{ color: '#334155', background: '#f8fafc' }}>
                          {reportAmountTotals.map((item, index) => (
                            <th key={item.date} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: 800, textAlign: 'center' }}>
                              {shortDate(item.date)}{index === 0 ? '（初次統計）' : ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {reportAmountTotals.map((item, index) => (
                            <td key={item.date} style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 900, color: index === 0 ? '#0369a1' : item.amount >= 0 ? '#0369a1' : '#dc2626' }}>
                              {index === 0 ? money(item.amount) : signedAmount(item.amount)}
                              <div style={{ marginTop: 3, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{item.count} 台</div>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: Math.max(720, 260 + reportDatesAsc.length * 150) }}>
                      <thead>
                        <tr style={{ color: '#334155', textAlign: 'left', background: '#f8fafc' }}>
                          <th style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', fontWeight: 800 }}>車號</th>
                          <th style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', fontWeight: 800 }}>入場時間</th>
                          {reportDatesAsc.map((date, index) => (
                            <th key={date} style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', fontWeight: 800 }}>
                              {shortDate(date)}{index === 0 ? '（初次統計）' : ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportComparisonRows.map((row) => (
                          <tr key={row.plate} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 10px', fontWeight: 800, letterSpacing: 1, whiteSpace: 'nowrap' }}>{row.plate}</td>
                            <td style={{ padding: '9px 10px', color: '#475569', whiteSpace: 'pre-line', minWidth: 150 }}>{row.entryAt || '-'}</td>
                            {reportDatesAsc.map((date) => {
                              const current = row.records[date]
                              if (!current) {
                                return <td key={date} style={{ padding: '9px 10px', color: '#cbd5e1' }}>—</td>
                              }
                              const previousDate = [...reportDatesAsc].filter((d) => d < date && row.records[d]).pop()
                              const previous = previousDate ? row.records[previousDate] : null
                              const value = previous ? Number(current.amount || 0) - Number(previous.amount || 0) : Number(current.amount || 0)
                              const color = current.monthlyCandidate ? '#b45309' : current.amount > 0 ? '#0369a1' : '#64748b'
                              return (
                                <td key={date} style={{ padding: '9px 10px', color, fontWeight: 800, whiteSpace: 'nowrap' }}>
                                  {previous ? signedAmount(value) : plainAmount(value)}
                                  <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{current.status}</div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
        {/* 批次車牌辨識 */}
        <section style={{ background: '#fff', borderRadius: 16, padding: 18, marginBottom: 24, boxShadow: '0 2px 12px rgba(30,41,59,0.06)', border: '1px solid #eef1f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📸 批次車牌辨識</h2>
            <input ref={batchRef} type="file" accept="image/*" multiple onChange={onPickBatch} style={{ display: 'none' }} id="batch-photos" />
            <label htmlFor="batch-photos"
              style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              ＋ 選多張車牌照片
            </label>
            <input ref={pdfRef} type="file" accept="application/pdf" onChange={onPickPdf} style={{ display: 'none' }} id="batch-pdf" />
            <label htmlFor="batch-pdf"
              style={{ padding: '8px 16px', background: '#0369a1', color: '#fff', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              {pdfLoading ? '分析中…' : '📄 上傳車牌 PDF'}
            </label>
            {batch.length > 0 && (
              <button onClick={() => setBatch([])} style={{ padding: '8px 12px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>清空</button>
            )}
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94a3b8' }}>
            上傳車牌 PDF 或多張照片 → 自動辨識出車牌 → 按「💰 查金額」查各車牌待繳金額（或全部查金額）
          </p>

          {batch.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {batch.map((it) => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, background: '#f8fafc', border: '1px solid #eef1f5', flexWrap: 'wrap' }}>
                  {it.photoUrl || it.dataUrl
                    ? <img src={it.photoUrl || it.dataUrl} alt="車牌" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 8 }} />
                    : <div style={{ width: 60, height: 44, borderRadius: 8, background: '#e2e8f0', display: 'grid', placeItems: 'center', fontSize: 18, color: '#94a3b8' }}>🚘</div>}
                  <input
                    value={it.plate}
                    onChange={(e) => updateBatch(it.id, { plate: e.target.value.toUpperCase() })}
                    placeholder={it.recognizing ? '辨識中…' : '未辨識，可手動填'}
                    style={{ flex: '1 1 130px', minWidth: 110, padding: '10px 12px', fontSize: 15, fontWeight: 700, letterSpacing: 1, border: '1px solid #cbd5e1', borderRadius: 8 }}
                  />
                  {(() => { const f = feeLabel(it.fee); return f ? (
                    <span style={{ fontSize: 13, fontWeight: 700, color: f.color, maxWidth: 260, overflowWrap: 'anywhere' }}>{f.text}</span>
                  ) : null })()}
                  <button onClick={() => queryFeeItem(it)}
                    style={{ padding: '9px 14px', background: '#0369a1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    💰 查金額
                  </button>
                  <button onClick={() => openPay(it.plate)} title="開啟繳費網站（車牌自動複製）"
                    style={{ padding: '9px 11px', background: '#fff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    🔗
                  </button>
                  <button onClick={() => enterBatchItem(it).then((ok) => ok && (flash(`${it.plate} 已進場`), reload(lotId)))}
                    style={{ padding: '9px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    進場
                  </button>
                  <button onClick={() => setBatch((prev) => prev.filter((x) => x.id !== it.id))}
                    style={{ padding: '9px 10px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                <button onClick={queryAllFees}
                  style={{ padding: '10px 20px', background: '#0369a1', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                  💰 全部查金額
                </button>
                <button onClick={enterAllBatch}
                  style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                  全部進場（{batch.filter((x) => x.plate.trim()).length} 台）
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 車牌查詢繳費狀態 */}
        <div style={{ marginBottom: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="🔍 輸入車牌查詢繳費狀態（現場＋歷史）"
            style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #cbd5e1', borderRadius: 10, letterSpacing: 1 }}
          />
        </div>

        {/* 分頁（查詢時隱藏）*/}
        {!query && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[['onsite', `現場車輛 (${onsite.length})`], ['history', `歷史紀錄 (${history.length})`]].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ padding: '9px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  background: tab === k ? '#0f172a' : '#fff', color: tab === k ? '#fff' : '#475569', boxShadow: tab === k ? 'none' : '0 1px 4px rgba(0,0,0,.06)' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 車輛列表 */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shownList.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', background: '#fff', borderRadius: 16, border: '1px solid #eef1f5' }}>
              {query ? `查無車牌「${query}」的紀錄` : tab === 'onsite' ? '目前沒有在場車輛' : '尚無歷史紀錄'}
            </div>
          )}
          {shownList.map((s) => (
            <div key={s.id} style={{ background: '#fff', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 10px rgba(30,41,59,0.05)', border: '1px solid #eef1f5', flexWrap: 'wrap' }}>
              {s.photoUrl
                ? <a href={s.photoUrl} target="_blank" rel="noreferrer"><img src={s.photoUrl} alt={s.plate} style={{ width: 66, height: 48, objectFit: 'cover', borderRadius: 8, background: '#f1f5f9' }} /></a>
                : <div style={{ width: 66, height: 48, borderRadius: 8, background: '#f1f5f9', display: 'grid', placeItems: 'center', fontSize: 20, color: '#cbd5e1' }}>🚘</div>}

              <div style={{ minWidth: 110 }}>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 1, fontFamily: 'var(--font-latin, monospace)' }}>{s.plate}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>進場 {fmtTime(s.entryAt)}</div>
                {s.exitAt && <div style={{ fontSize: 12, color: '#94a3b8' }}>出場 {fmtTime(s.exitAt)}</div>}
              </div>

              <div style={{ minWidth: 80 }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>停放時間</div>
                <div style={{ fontWeight: 600 }}>{durationLabel(s.entryAt, s.exitAt || Date.now())}</div>
              </div>

              <div style={{ minWidth: 90 }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.exitAt ? '代繳金額' : '目前應繳'}</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#0369a1' }}>{money(s.exitAt ? s.amount : s.liveAmount)}</div>
              </div>

              <div style={{ flex: 1 }} />

              <span onClick={() => togglePaid(s)} style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
                background: s.paid ? '#dcfce7' : '#fef3c7', color: s.paid ? '#15803d' : '#b45309' }}>
                {s.paid ? '✓ 已繳費' : '待繳費'}
              </span>

              {!s.exitAt
                ? <button onClick={() => exitVehicle(s)} style={{ padding: '9px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>出場</button>
                : <button onClick={() => removeSession(s)} style={{ padding: '9px 12px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer' }}>刪除</button>}
            </div>
          ))}
        </section>
      </main>

      {liveQuery.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 90, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div style={{ width: 'min(760px, 100%)', maxHeight: '86vh', overflow: 'hidden', background: '#fff', borderRadius: 16, boxShadow: '0 24px 70px rgba(15,23,42,.28)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>即時代繳查詢</h3>
                <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>查詢累積報表車牌目前 RTD 待繳金額，關閉視窗仍會背景繼續</div>
              </div>
              <div style={{ flex: 1 }} />
              {liveQuery.running && (
                <button type="button" onClick={() => { liveQueryStopRef.current = true; setLiveQuery((prev) => ({ ...prev, message: '正在停止，會在目前這批結束後停止...' })) }}
                  style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontWeight: 800 }}>
                  停止查詢
                </button>
              )}
              {!liveQuery.running && (
                <button type="button" onClick={() => startLiveReportQuery()}
                  style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #bae6fd', background: '#0369a1', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>
                  繼續查詢
                </button>
              )}
              {!liveQuery.running && (
                <button type="button" onClick={() => startLiveReportQuery({ reset: true })}
                  style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: 'pointer', fontWeight: 800 }}>
                  重新查詢
                </button>
              )}
              <button type="button" title={liveQuery.running ? '關閉視窗，查詢會在背景繼續' : '關閉視窗'} onClick={() => setLiveQuery((prev) => ({ ...prev, open: false, message: prev.running ? '背景查詢中，可再開啟查看進度' : prev.message }))}
                style={{ width: 34, height: 34, borderRadius: 999, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
                ×
              </button>
            </div>

            <div style={{ padding: 18, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                <span>{liveQuery.message || (liveQuery.running ? '資料查詢中...' : '查詢完成')}</span>
                <span>{liveQuery.done}/{liveQuery.total} 台</span>
              </div>
              <div style={{ height: 10, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ width: `${liveQuery.total ? Math.round((liveQuery.done / liveQuery.total) * 100) : 0}%`, height: '100%', background: '#0369a1', transition: 'width .25s ease' }} />
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
                <tbody>
                  {[
                    ['已查詢', liveQuerySummary.checked, '待繳台數', liveQuerySummary.owingCount],
                    ['待繳總額', money(liveQuerySummary.owingTotal), '無待繳', liveQuerySummary.noOwingCount],
                    ['月租候選(全部)', liveQuerySummary.monthlyCandidateCount, '已查月租候選', liveQuerySummary.checkedMonthlyCandidateCount],
                    ['RTD限制', liveQuerySummary.rateLimitedCount, '查詢失敗', liveQuerySummary.errorCount],
                    ['未知回應', liveQuerySummary.unknownCount, '查詢進度', `${liveQuery.done}/${liveQuery.total}`],
                  ].map((r) => (
                    <tr key={r[0]} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <th style={{ width: '25%', padding: '8px 10px', background: '#f1f5f9', textAlign: 'center', fontWeight: 800 }}>{r[0]}</th>
                      <td style={{ width: '25%', padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{r[1]}</td>
                      <th style={{ width: '25%', padding: '8px 10px', background: '#f1f5f9', textAlign: 'center', fontWeight: 800 }}>{r[2]}</th>
                      <td style={{ width: '25%', padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#334155', textAlign: 'left' }}>
                      <th style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>車號</th>
                      <th style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>入場時間</th>
                      <th style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>狀態</th>
                      <th style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>待繳金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveQuery.results.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: 18, textAlign: 'center', color: '#94a3b8' }}>尚未取得結果</td></tr>
                    ) : liveQuery.results
                      .slice()
                      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0) || String(a.plate).localeCompare(String(b.plate)))
                      .map((row) => {
                        const meta = liveQuery.meta?.[row.plate] || {}
                        return (
                          <tr key={row.plate} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 10px', fontWeight: 900, letterSpacing: 1 }}>{row.plate}</td>
                            <td style={{ padding: '9px 10px', color: '#475569', whiteSpace: 'nowrap' }}>{meta.entryAt || '-'}</td>
                            <td style={{ padding: '9px 10px', color: row.rateLimited || row.status === 403 || row.status === 429 ? '#b45309' : row.ok === false ? '#dc2626' : row.unknown ? '#b45309' : row.owing ? '#0369a1' : '#15803d', fontWeight: 800 }}>
                              {row.rateLimited || row.status === 403 || row.status === 429 ? 'RTD限制' : row.ok === false ? (row.error || '查詢失敗') : row.unknown ? '未知回應' : row.owing ? `待繳 ${row.count || 0} 筆` : '無待繳'}
                              {meta.monthlyCandidate && <div style={{ marginTop: 2, fontSize: 11, color: '#b45309' }}>月租候選</div>}
                            </td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900, color: row.owing ? '#0369a1' : '#64748b' }}>{money(row.amount)}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 設定彈窗 */}
      {showSettings && <SettingsModal lots={lots} lotId={lotId} onClose={() => setShowSettings(false)}
        onSaved={(newLots, newId) => { setLots(newLots); if (newId) setLotId(newId); reload(newId || lotId) }} flash={flash} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#fff', padding: '12px 22px', borderRadius: 999, fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,.2)', zIndex: 100 }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ── 設定彈窗 ──────────────────────────────────────
function SettingsModal({ lots, lotId, onClose, onSaved, flash }) {
  const cur = lots.find((l) => l.id === lotId)
  const [form, setForm] = useState({
    name: cur?.name || '', totalSpaces: cur?.totalSpaces || 100,
    hourlyRate: cur?.hourlyRate || 30, freeMinutes: cur?.freeMinutes || 0, dailyMax: cur?.dailyMax || 0,
    payUrl: cur?.payUrl || '',
    rtdVendorId: cur?.rtdVendorId || '', rtdScanCode: cur?.rtdScanCode || '',
  })
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/parking/lots/${lotId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      onSaved(lots.map((l) => (l.id === lotId ? updated : l)))
      flash('設定已儲存'); onClose()
    } else flash('儲存失敗')
  }

  const addLot = async () => {
    if (!newName.trim()) return
    const res = await fetch('/api/parking/lots', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }),
    })
    if (res.ok) {
      const lot = await res.json()
      onSaved([...lots, lot], lot.id); flash('已新增停車場'); onClose()
    }
  }

  const field = (label, k, suffix) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#475569' }}>
      {label}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="number" value={form[k]} onChange={(e) => set(k, e.target.value)}
          style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15 }} />
        {suffix && <span style={{ color: '#94a3b8', fontSize: 13 }}>{suffix}</span>}
      </div>
    </label>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 24, width: 'min(440px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 800 }}>⚙️ 停車場設定</h2>
        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#475569' }}>
            停車場名稱
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15 }} />
          </label>
          {field('總車格數', 'totalSpaces', '格')}
          {field('每小時費率', 'hourlyRate', '元')}
          {field('免費停車時間', 'freeMinutes', '分鐘')}
          {field('單日收費上限（0 = 無上限）', 'dailyMax', '元')}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#475569' }}>
            繳費網站網址（「開繳費網站」會開這個）
            <input value={form.payUrl} onChange={(e) => set('payUrl', e.target.value)}
              placeholder="留空則用預設 RTD 繳費連結"
              style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#475569' }}>
            RTD 廠商代碼 siteVendorId（查金額用）
            <input value={form.rtdVendorId} onChange={(e) => set('rtdVendorId', e.target.value)}
              placeholder={`留空則用預設 ${DEFAULT_VENDOR_ID}`}
              style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#475569' }}>
            RTD 入口掃碼代碼 scanCode（查金額用）
            <input value={form.rtdScanCode} onChange={(e) => set('rtdScanCode', e.target.value)}
              placeholder="留空則用預設值"
              style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>取消</button>
          <button onClick={save} disabled={saving} style={{ flex: 1, padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>{saving ? '儲存中…' : '儲存'}</button>
        </div>

        <div style={{ borderTop: '1px solid #eef1f5', marginTop: 22, paddingTop: 18 }}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>新增另一個停車場</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="停車場名稱"
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }} />
            <button onClick={addLot} style={{ padding: '10px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>新增</button>
          </div>
        </div>
      </div>
    </div>
  )
}
