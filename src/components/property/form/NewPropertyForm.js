'use client'
// src/components/property/form/NewPropertyForm.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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

const ALL_AMENITIES = ['冷氣','熱水器','洗衣機','冰箱','電視','網路/Wifi','床架','衣櫥','書桌','椅子','沙發','微波爐','電磁爐','抽油煙機','陽台','車位']

const PRESET_TAGS = ['可租補','免仲介費','獨立衛浴','獨洗曬','可開伙','可養寵物','垃圾代收','機車位','腳踏車位','近捷運','近學校','近超商','電梯大樓']

const DEFAULT = {
  title: '', type: 'SUITE', city: '台中市', district: '', address: '',
  price: '', deposit: '兩個月', mgmtFee: '0', cleaningFee: '0', size: '',
  electricType: '', description: '',
}

export default function NewPropertyForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [form, setForm]       = useState(DEFAULT)
  const [amenities, setAmenities] = useState([])
  const [tags, setTags]       = useState([])
  const [customAmenity, setCustomAmenity] = useState('')
  const [customTag, setCustomTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [landlord, setLandlord] = useState(null)

  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const districts = getDistricts(form.city)

  // Load landlord profile
  useEffect(() => {
    fetch('/api/landlord/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setLandlord(d)
    }).catch(() => {})
  }, [])

  function toggleAmenity(name) {
    setAmenities(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name])
  }
  function toggleTag(name) {
    setTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name])
  }
  function addCustomAmenity() {
    const v = customAmenity.trim()
    if (v && !amenities.includes(v)) { setAmenities(prev => [...prev, v]) }
    setCustomAmenity('')
  }
  function addCustomTag() {
    const v = customTag.trim()
    if (v && !tags.includes(v)) { setTags(prev => [...prev, v]) }
    setCustomTag('')
  }

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
        price:       Number(form.price),
        mgmtFee:     Number(form.mgmtFee) || 0,
        cleaningFee: Number(form.cleaningFee) || 0,
        size:        Number(form.size),
        amenities,
        tags,
      }
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '建立失敗'); setLoading(false); return }
      router.push('/account?mode=landlord')
    } catch {
      setError('建立失敗，請稍後再試')
      setLoading(false)
    }
  }

  const isSuper = landlord?.isSuper

  return (
    <main style={{ minHeight: 'calc(100vh - 62px)', background: '#F5F3EF', padding: '32px 16px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#3d3d3d', marginBottom: 4 }}>🏠 新增房源</h1>
          <p style={{ fontSize: 13, color: '#aaa' }}>填寫完整資訊，讓租客更快找到您的房源</p>
        </div>

        {/* Landlord profile card */}
        {landlord ? (
          <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--sage-bg,#EBF2EC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {landlord.avatar ? <img src={landlord.avatar} alt="" style={{ width: 46, height: 46, borderRadius: 12, objectFit: 'cover' }} /> : '🏠'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#3d3d3d' }}>
                {landlord.name}
                {isSuper && <span style={{ marginLeft: 6, background: '#FEF3D0', color: '#B8860B', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>⭐ 超級房東</span>}
              </div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                {landlord.phone && <span>📱 {landlord.phone}</span>}
                {landlord.email && <span style={{ marginLeft: 8 }}>✉️ {landlord.email}</span>}
              </div>
            </div>
            <button onClick={() => router.push('/account?mode=landlord')} style={{ fontSize: 12, color: '#4E7153', background: 'none', border: '1px solid #4E7153', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              編輯資料
            </button>
          </div>
        ) : session && (
          <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 22 }}>🏠</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#3d3d3d' }}>{session.user.name || '我的帳號'}</div>
              <div style={{ fontSize: 12, color: '#bbb' }}>尚未設定房東資料</div>
            </div>
            <button onClick={() => router.push('/account?mode=landlord')} style={{ fontSize: 12, color: '#4E7153', background: 'none', border: '1px solid #4E7153', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              完善資料
            </button>
          </div>
        )}

        {/* Super landlord CTA */}
        {!isSuper && (
          <div style={{ background: 'linear-gradient(135deg,#FFFBF0 0%,#FEF3D0 100%)', borderRadius: 14, padding: '14px 18px', border: '1px solid #F5E9C6', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>⭐</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#B8860B' }}>升級超級房東，解鎖更多功能</div>
              <div style={{ fontSize: 12, color: '#C9A227', marginTop: 2 }}>獲得 LINE Bot 推播通知、置頂曝光、專屬標章...</div>
            </div>
            <button onClick={() => router.push('/account?super=1')} style={{ fontSize: 12, fontWeight: 700, color: '#B8860B', background: 'white', border: '1.5px solid #F5E9C6', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              了解更多
            </button>
          </div>
        )}

        {/* ── Section: 基本資訊 ── */}
        <Section title="基本資訊">
          <Field label="房源名稱 *">
            <input value={form.title} onChange={up('title')} placeholder="例：致富讚201 採光套房" style={inputSt} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="類型">
              <select value={form.type} onChange={up('type')} style={inputSt}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="月租金 *（元）">
              <input type="number" value={form.price} onChange={up('price')} placeholder="8000" style={inputSt} />
            </Field>
            <Field label="坪數">
              <input type="number" step="0.1" value={form.size} onChange={up('size')} placeholder="5.5" style={inputSt} />
            </Field>
          </div>
          <Field label="押金">
            <input value={form.deposit} onChange={up('deposit')} placeholder="兩個月" style={inputSt} />
          </Field>
        </Section>

        {/* ── Section: 地點 ── */}
        <Section title="地點">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="縣市">
              <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value, district: '' }))} style={inputSt}>
                {ALL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="區域">
              <select value={form.district} onChange={up('district')} style={inputSt} disabled={!form.city}>
                <option value="">選擇行政區</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          <Field label="地址（不公開，僅自己看）">
            <input value={form.address} onChange={up('address')} placeholder="例：中山路一段100號3樓" style={inputSt} />
          </Field>
        </Section>

        {/* ── Section: 費用明細 ── */}
        <Section title="費用明細">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="管理費（元/月，0=含在租金）">
              <input type="number" value={form.mgmtFee} onChange={up('mgmtFee')} placeholder="0" style={inputSt} />
            </Field>
            <Field label="清潔費（元，0=無）">
              <input type="number" value={form.cleaningFee} onChange={up('cleaningFee')} placeholder="0" style={inputSt} />
            </Field>
          </div>
          <Field label="電費計算方式">
            <select value={form.electricType} onChange={up('electricType')} style={inputSt}>
              <option value="">請選擇</option>
              <option value="meter">台水台電計費</option>
              <option value="flat">固定平均電價</option>
              <option value="included">含在租金內</option>
            </select>
          </Field>
        </Section>

        {/* ── Section: 設備 ── */}
        <Section title="設備">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {ALL_AMENITIES.map(name => {
              const on = amenities.includes(name)
              return (
                <button key={name} type="button" onClick={() => toggleAmenity(name)} style={{
                  padding: '6px 14px', borderRadius: 9, border: `1.5px solid ${on ? '#5B8FA8' : '#ddd'}`,
                  background: on ? '#EBF3F7' : 'white', fontSize: 13,
                  fontWeight: on ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit',
                  color: on ? '#1E4F6B' : '#555', transition: 'all 0.15s',
                }}>{name}</button>
              )
            })}
            {amenities.filter(a => !ALL_AMENITIES.includes(a)).map(name => (
              <button key={name} type="button" onClick={() => toggleAmenity(name)} style={{
                padding: '6px 14px', borderRadius: 9, border: '1.5px solid #5B8FA8',
                background: '#EBF3F7', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#1E4F6B',
              }}>{name} <span style={{ color: '#aaa', fontSize: 11 }}>✕</span></button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={customAmenity} onChange={e => setCustomAmenity(e.target.value)}
              placeholder="自訂設備（按 Enter 新增）" style={{ ...inputSt, flex: 1 }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity() } }} />
            <button type="button" onClick={addCustomAmenity} style={chipAddBtn}>新增</button>
          </div>
        </Section>

        {/* ── Section: 房源標籤 ── */}
        <Section title="房源標籤">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {PRESET_TAGS.map(tag => {
              const on = tags.includes(tag)
              return (
                <button key={tag} type="button" onClick={() => toggleTag(tag)} style={{
                  padding: '6px 14px', borderRadius: 9, border: `1.5px solid ${on ? '#4E7153' : '#ddd'}`,
                  background: on ? '#EBF2EC' : 'white', fontSize: 13,
                  fontWeight: on ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit',
                  color: on ? '#3A5740' : '#555', transition: 'all 0.15s',
                }}>{tag}</button>
              )
            })}
            {tags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)} style={{
                padding: '6px 14px', borderRadius: 9, border: '1.5px solid #4E7153',
                background: '#EBF2EC', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#3A5740',
              }}>{tag} <span style={{ color: '#aaa', fontSize: 11 }}>✕</span></button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={customTag} onChange={e => setCustomTag(e.target.value)}
              placeholder="自訂標籤（按 Enter 新增）" style={{ ...inputSt, flex: 1 }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }} />
            <button type="button" onClick={addCustomTag} style={chipAddBtn}>新增</button>
          </div>
        </Section>

        {/* ── Section: 描述 ── */}
        <Section title="描述">
          <textarea value={form.description} onChange={up('description')} rows={5}
            placeholder="採光良好，含冷氣熱水器，近捷運站..."
            style={{ ...inputSt, resize: 'vertical', lineHeight: 1.7 }} />
        </Section>

        {/* Error */}
        {error && <div style={{ padding: '12px 16px', background: '#FAEAEA', color: '#e53935', borderRadius: 10, fontSize: 13 }}>{error}</div>}

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => router.back()} style={outlineBtn}>← 取消</button>
          <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, flex: 1, opacity: loading ? 0.6 : 1 }}>
            {loading ? '送出中...' : '✅ 刊登房源'}
          </button>
        </div>

        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'white', fontSize: 12, color: '#bbb', lineHeight: 1.8, textAlign: 'center' }}>
          💡 刊登後可在「我的帳號 → 房東模式」管理房源、上傳照片。
        </div>
      </div>
    </main>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <div style={{ background: 'white', borderRadius: 18, padding: '22px 22px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#3d3d3d', marginBottom: 16, paddingBottom: 10, borderBottom: '1.5px solid #F0EDE8' }}>{title}</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
  </div>
)

const Field = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 5 }}>{label}</div>
    {children}
  </div>
)

const inputSt = { width: '100%', padding: '11px 14px', border: '1.5px solid #E5DFD5', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', color: '#3d3d3d', boxSizing: 'border-box' }
const primaryBtn = { padding: '14px 0', borderRadius: 12, border: 'none', background: '#4E7153', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
const outlineBtn = { padding: '14px 24px', borderRadius: 12, border: '1.5px solid #E5DFD5', background: 'white', color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const chipAddBtn = { padding: '11px 18px', borderRadius: 10, border: '1.5px solid #4E7153', background: '#EBF2EC', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#3A5740', flexShrink: 0 }
