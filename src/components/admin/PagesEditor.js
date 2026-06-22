'use client'
// src/components/admin/PagesEditor.js

import { useState } from 'react'

const TABS = [
  { key: 'about',   label: '關於我們' },
  { key: 'guide',   label: '租屋須知' },
  { key: 'privacy', label: '隱私權政策' },
  { key: 'terms',   label: '服務條款' },
]

export default function PagesEditor({ initData }) {
  const [tab, setTab] = useState('about')
  const [data, setData] = useState(initData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (key, field) => (e) => {
    setSaved(false)
    setData(prev => ({ ...prev, [key]: { ...prev[key], [field]: e.target.value } }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) setSaved(true)
      else alert('儲存失敗，請稍後再試')
    } catch (e) {
      alert('儲存失敗：' + e.message)
    }
    setSaving(false)
  }

  const current = data[tab] || { title: '', body: '' }

  return (
    <main style={{ minHeight: 'calc(100vh - 62px)', background: 'var(--oat-light)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900, color: 'var(--charcoal)', marginBottom: 24 }}>
          網站頁面管理
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 18px', borderRadius: 20,
              border: tab === t.key ? '1.5px solid var(--sage)' : '1.5px solid var(--oat-mid)',
              background: tab === t.key ? 'var(--sage)' : 'white',
              color: tab === t.key ? 'white' : 'var(--gray-mid)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div style={{ background: 'white', borderRadius: 22, padding: 32, boxShadow: 'var(--shadow-md)' }}>
          <label style={labelStyle}>頁面標題</label>
          <input
            value={current.title}
            onChange={update(tab, 'title')}
            placeholder={TABS.find(t => t.key === tab)?.label}
            style={inputStyle}
          />

          <label style={{ ...labelStyle, marginTop: 18 }}>頁面內容</label>
          <textarea
            value={current.body}
            onChange={update(tab, 'body')}
            rows={14}
            placeholder="輸入頁面內容..."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.8 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '12px 28px', borderRadius: 12, border: 'none',
              background: 'var(--sage)', color: 'white', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? '儲存中...' : '儲存所有頁面'}
            </button>
            {saved && <span style={{ fontSize: 13, color: 'var(--sage-dark)' }}>✅ 已儲存</span>}
          </div>
        </div>
      </div>
    </main>
  )
}

const labelStyle = { fontSize: 12, color: 'var(--gray-mid)', display: 'block', marginBottom: 4 }
const inputStyle = {
  width: '100%', padding: '12px 14px', border: '1.5px solid var(--oat-mid)',
  borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'inherit',
}
