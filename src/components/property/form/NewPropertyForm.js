'use client'
// src/components/property/form/NewPropertyForm.js
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ALL_CITIES, getDistricts } from '@/lib/districts'

const TYPES = [
  { value: 'SUITE',        label: '套房' },
  { value: 'ROOM',         label: '雅房' },
  { value: 'WHOLE_FLOOR',  label: '整層住家' },
  { value: 'SHARED_SUITE', label: '分租套房' },
  { value: 'STUDIO',       label: '獨立套房' },
  { value: 'STORE',        label: '店面' },
  { value: 'OFFICE',       label: '辦公室' },
  { value: 'LIVE_OFFICE',  label: '住辦' },
  { value: 'FACTORY',      label: '廠房' },
  { value: 'PARKING',      label: '車位' },
  { value: 'LAND',         label: '土地' },
  { value: 'OTHER',        label: '其他' },
]

const ELECTRIC_TYPES = ['台電', '一口價', '另計']

const DEFAULT = {
  title: '', type: 'SUITE', city: '', district: '', address: '',
  price: '', deposit: '兩個月', mgmtFee: '', size: '', floor: '', totalFloors: '',
  description: '',
  inclWifi: false, inclWater: false, inclCable: false,
  allowPets: false, allowCook: false, allowShortTerm: false, welcomeStudent: true,
  electricType: '', electricRate: '', electricFlat: '',
  tags: '',
}

export default function NewPropertyForm({ userId }) {
  const router = useRouter()
  const [form, setForm]     = useState(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [step, setStep]     = useState(1)  // 1:基本資訊  2:設施費用  3:說明

  const up = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const districts = form.city ? getDistricts(form.city) : []

  async function handleSubmit() {
    setError('')
    if (!form.title || !form.city || !form.district || !form.address || !form.price || !form.size) {
      setError('請填寫必填欄位（標題、地址、租金、坪數）')
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        price:      Number(form.price),
        mgmtFee:    Number(form.mgmtFee) || 0,
        size:       Number(form.size),
        totalFloors: Number(form.totalFloors) || null,
        electricRate: form.electricRate ? Number(form.electricRate) : null,
        electricFlat: form.electricFlat ? Number(form.electricFlat) : null,
        tags: form.tags ? form.tags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean) : [],
      }
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '建立失敗'); setLoading(false); return }
      router.push(`/account?mode=landlord`)
    } catch (e) {
      setError('建立失敗，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 62px)', background: '#F5F3EF', padding: '32px 16px 60px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#3d3d3d', marginBottom: 4 }}>🏠 新增房源</h1>
          <p style={{ fontSize: 14, color: '#aaa' }}>填寫完成後送出審核，審核通過即上架</p>
        </div>

        {/* Step tabs */}
        <div style={{ display: 'flex', gap: 0, background: 'white', borderRadius: 14, padding: 4, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {[['1','📍 基本資訊'],['2','💰 費用設施'],['3','📝 說明標籤']].map(([s, label]) => (
            <button key={s} onClick={() => setStep(Number(s))} style={{
              flex: 1, padding: '10px 0', borderRadius: 11, border: 'none', fontFamily: 'inherit',
              fontSize: 13, fontWeight: step === Number(s) ? 700 : 400, cursor: 'pointer',
              background: step === Number(s) ? '#4E7153' : 'transparent',
              color: step === Number(s) ? 'white' : '#aaa',
              transition: 'all 0.2s',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 20, padding: '28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>

          {/* ── Step 1：基本資訊 ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="房源標題 *">
                <input value={form.title} onChange={up('title')} placeholder="例：台中市西區近科博館精緻套房" style={inputSt} />
              </Field>
              <Field label="房源類型 *">
                <select value={form.type} onChange={up('type')} style={inputSt}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="縣市 *">
                  <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value, district: '' }))} style={inputSt}>
                    <option value="">選擇縣市</option>
                    {ALL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="行政區 *">
                  <select value={form.district} onChange={up('district')} style={inputSt} disabled={!form.city}>
                    <option value="">選擇行政區</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="詳細地址 *">
                <input value={form.address} onChange={up('address')} placeholder="路名、門牌（不含縣市行政區）" style={inputSt} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <Field label="坪數 *">
                  <input type="number" value={form.size} onChange={up('size')} placeholder="10" style={inputSt} />
                </Field>
                <Field label="樓層">
                  <input value={form.floor} onChange={up('floor')} placeholder="3F" style={inputSt} />
                </Field>
                <Field label="總樓層">
                  <input type="number" value={form.totalFloors} onChange={up('totalFloors')} placeholder="8" style={inputSt} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 2：費用設施 ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="月租金（元）*">
                  <input type="number" value={form.price} onChange={up('price')} placeholder="8000" style={inputSt} />
                </Field>
                <Field label="管理費（元）">
                  <input type="number" value={form.mgmtFee} onChange={up('mgmtFee')} placeholder="0" style={inputSt} />
                </Field>
              </div>
              <Field label="押金">
                <select value={form.deposit} onChange={up('deposit')} style={inputSt}>
                  {['一個月','兩個月','三個月','半年','一年','面議'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="電費計算">
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <select value={form.electricType} onChange={up('electricType')} style={{ ...inputSt, flex: '0 0 auto', width: 120 }}>
                    <option value="">不設定</option>
                    {ELECTRIC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {form.electricType === '台電' && <input type="number" value={form.electricRate} onChange={up('electricRate')} placeholder="每度 NT$" style={{ ...inputSt, flex: 1 }} />}
                  {form.electricType === '一口價' && <input type="number" value={form.electricFlat} onChange={up('electricFlat')} placeholder="每月固定 NT$" style={{ ...inputSt, flex: 1 }} />}
                </div>
              </Field>

              <div>
                <div style={labelSt}>費用包含</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                  {[['inclWifi','📶 網路'],['inclWater','🚿 水費'],['inclCable','📺 有線電視']].map(([k,l]) => (
                    <CheckChip key={k} label={l} checked={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} />
                  ))}
                </div>
              </div>

              <div>
                <div style={labelSt}>租客條件</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                  {[['allowPets','🐾 可養寵物'],['allowCook','🍳 可開伙'],['allowShortTerm','📅 可短租'],['welcomeStudent','🎓 歡迎學生']].map(([k,l]) => (
                    <CheckChip key={k} label={l} checked={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3：說明標籤 ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="房源說明">
                <textarea value={form.description} onChange={up('description')} rows={6}
                  placeholder="詳細描述房源特色、周邊環境、交通便利性等..."
                  style={{ ...inputSt, resize: 'vertical', lineHeight: 1.7 }} />
              </Field>
              <Field label="標籤（用逗號分隔）">
                <input value={form.tags} onChange={up('tags')} placeholder="例：近捷運, 含網路, 新裝潢" style={inputSt} />
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>標籤可幫助租客更快找到您的房源</div>
              </Field>
            </div>
          )}

          {/* Error */}
          {error && <div style={{ marginTop: 16, padding: '10px 14px', background: '#FAEAEA', color: '#e53935', borderRadius: 10, fontSize: 13 }}>{error}</div>}

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            {step > 1 && <button onClick={() => setStep(s => s - 1)} style={outlineBtn}>← 上一步</button>}
            <div style={{ flex: 1 }} />
            {step < 3
              ? <button onClick={() => setStep(s => s + 1)} style={primaryBtn}>下一步 →</button>
              : <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>
                  {loading ? '送出中...' : '✅ 送出刊登'}
                </button>
            }
          </div>
        </div>

        {/* Tips */}
        <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: 'white', fontSize: 12, color: '#aaa', lineHeight: 1.8 }}>
          💡 提示：送出後需等待審核（通常 1 個工作天）。審核通過後可在「我的帳號 → 房東模式」上傳照片和修改詳情。
        </div>
      </div>
    </main>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <div style={labelSt}>{label}</div>
    <div style={{ marginTop: 5 }}>{children}</div>
  </div>
)
const CheckChip = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${checked ? '#4E7153' : '#E5DFD5'}`, background: checked ? '#EBF2EC' : 'white', fontSize: 13, fontWeight: checked ? 700 : 400, color: checked ? '#3A5740' : '#888', cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
    {label}
  </label>
)

const labelSt = { fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 2 }
const inputSt = { width: '100%', padding: '11px 14px', border: '1.5px solid #E5DFD5', borderRadius: 11, fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', color: '#3d3d3d' }
const primaryBtn = { padding: '12px 28px', borderRadius: 12, border: 'none', background: '#4E7153', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
const outlineBtn = { padding: '12px 24px', borderRadius: 12, border: '1.5px solid #E5DFD5', background: 'white', color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
