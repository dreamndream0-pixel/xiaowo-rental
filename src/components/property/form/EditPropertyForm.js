'use client'
// src/components/property/form/EditPropertyForm.js
import { useState, useRef } from 'react'
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

const ALL_AMENITIES = ['冷氣','熱水器','洗衣機','冰箱','電視','網路/Wifi','床架','衣櫥','書桌','椅子','沙發','微波爐','電磁爐','抽油煙機','陽台','車位']
const PRESET_TAGS = ['可租補','免仲介費','獨立衛浴','獨洗曬','可開伙','可養寵物','垃圾代收','機車位','腳踏車位','近捷運','近學校','近超商','電梯大樓']

export default function EditPropertyForm({ property }) {
  const router = useRouter()

  const [form, setForm] = useState({
    title:       property.title        ?? '',
    type:        property.type         ?? 'SUITE',
    city:        property.city         ?? '台中市',
    district:    property.district     ?? '',
    address:     property.address      ?? '',
    price:       property.price        ?? '',
    deposit:     property.deposit      ?? '兩個月',
    mgmtFee:     property.mgmtFee      ?? '0',
    cleaningFee: property.cleaningFee  ?? '0',
    size:        property.size         ?? '',
    electricType:property.electricType ?? '',
    description: property.description  ?? '',
    status:      property.status       ?? 'AVAILABLE',
  })

  const [amenities, setAmenities] = useState(
    property.amenities?.map(a => a.name) ?? []
  )
  const [tags, setTags] = useState(
    property.tags?.map(t => t.name) ?? []
  )
  const [customAmenity, setCustomAmenity] = useState('')
  const [customTag, setCustomTag]         = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

  // Photos: existing photos have an `id`; new ones don't yet
  const [photos, setPhotos] = useState(
    property.images?.map(img => ({
      id:          img.id,
      url:         img.url,
      cloudinaryId:img.cloudinaryId,
      isCover:     img.isCover,
      uploading:   false,
      error:       null,
    })) ?? []
  )
  // Track which existing photo ids to delete
  const [deletedPhotoIds, setDeletedPhotoIds] = useState([])
  const fileInputRefs = useRef([])

  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const districts = getDistricts(form.city)
  const MAX_PHOTOS = 9

  function toggleAmenity(name) {
    setAmenities(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name])
  }
  function toggleTag(name) {
    setTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name])
  }
  function addCustomAmenity() {
    const v = customAmenity.trim()
    if (v && !amenities.includes(v)) setAmenities(prev => [...prev, v])
    setCustomAmenity('')
  }
  function addCustomTag() {
    const v = customTag.trim()
    if (v && !tags.includes(v)) setTags(prev => [...prev, v])
    setCustomTag('')
  }

  // ── Photo Upload ───────────────────────────────────────────────
  async function handleFileSelect(e, slotIndex) {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotos(prev => {
      const next = [...prev]
      next[slotIndex] = { url: null, cloudinaryId: null, uploading: true, error: null }
      return next
    })

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上傳失敗')
      setPhotos(prev => {
        const next = [...prev]
        next[slotIndex] = { url: data.url, cloudinaryId: data.cloudinaryId || null, uploading: false, error: null }
        return next
      })
    } catch (err) {
      setPhotos(prev => {
        const next = [...prev]
        next[slotIndex] = { url: null, cloudinaryId: null, uploading: false, error: err.message }
        return next
      })
    }

    if (fileInputRefs.current[slotIndex]) fileInputRefs.current[slotIndex].value = ''
  }

  function removePhoto(index) {
    const photo = photos[index]
    if (photo?.id) {
      setDeletedPhotoIds(prev => [...prev, photo.id])
    }
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  // ── Submit ─────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('')
    if (!form.title || !form.city || !form.district || !form.address || !form.price || !form.size) {
      setError('請填寫必填欄位（標題、地址、租金、坪數）')
      return
    }
    setLoading(true)
    try {
      // 1. PATCH scalar fields + amenities + tags (status excluded — API forces PENDING)
      const { status: _ignored, ...formFields } = form
      const payload = {
        ...formFields,
        price:       Number(form.price),
        mgmtFee:     Number(form.mgmtFee) || 0,
        cleaningFee: Number(form.cleaningFee) || 0,
        size:        Number(form.size),
        amenities,
        tags,
      }
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '更新失敗'); setLoading(false); return }

      // 2. Delete removed existing photos
      await Promise.all(
        deletedPhotoIds.map(imageId =>
          fetch(`/api/properties/${property.id}/images/${imageId}`, { method: 'DELETE' }).catch(() => {})
        )
      )

      // 3. Upload new photos (those without an id)
      const newPhotos = photos.filter(p => !p.id && p.url && !p.uploading)
      if (newPhotos.length > 0) {
        await fetch(`/api/properties/${property.id}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPhotos.map((p, i) => ({
            url:         p.url,
            cloudinaryId:p.cloudinaryId,
            isCover:     false,
            order:       100 + i, // append after existing
          }))),
        }).catch(() => {})
      }

      router.push('/account?mode=landlord')
    } catch {
      setError('更新失敗，請稍後再試')
      setLoading(false)
    }
  }

  // ── Photo slots ────────────────────────────────────────────────
  const filledSlots = photos.filter(p => p.url || p.uploading || p.error)
  const showSlots = Math.min(filledSlots.length + 1, MAX_PHOTOS)
  const photoSlots = Array.from({ length: showSlots }, (_, i) => photos[i] || null)

  return (
    <main style={{ minHeight: 'calc(100vh - 62px)', background: '#F5F3EF', padding: '32px 16px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#3d3d3d', marginBottom: 4 }}>✏️ 編輯房源</h1>
        </div>

        {/* Re-review notice */}
        <div style={{ background: '#FFF9EC', border: '1.5px solid #F5E0A0', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#7A5C1E' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div>
            <strong>儲存後將重新送審</strong>：編輯內容後，房源狀態會自動改為「審核中」，待管理員審核通過後才會重新上架。
            <br />若只需要更改狀態（如標記已租出），請使用下方「快速更改狀態」。
          </div>
        </div>

        {/* Quick status change (no re-review) */}
        <QuickStatusBar propertyId={property.id} currentStatus={property.status} />

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

        {/* ── Section: 房源照片 ── */}
        <Section title="房源照片">
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>
            最多 {MAX_PHOTOS} 張照片。點擊 ✕ 移除照片，第一張為封面。
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {photoSlots.map((slot, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '4/3' }}>
                {slot?.url ? (
                  <>
                    <img src={slot.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, border: '1.5px solid #E5DFD5' }} />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                    >✕</button>
                    {i === 0 && (
                      <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 10, background: '#4E7153', color: 'white', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>封面</div>
                    )}
                  </>
                ) : slot?.uploading ? (
                  <div style={{ width: '100%', height: '100%', borderRadius: 10, border: '1.5px dashed #ccc', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 18 }}>⏳</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>上傳中...</div>
                  </div>
                ) : slot?.error ? (
                  <div
                    onClick={() => { if (fileInputRefs.current[i]) fileInputRefs.current[i].click() }}
                    style={{ width: '100%', height: '100%', borderRadius: 10, border: '1.5px dashed #e53935', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: 18 }}>❌</div>
                    <div style={{ fontSize: 10, color: '#e53935', textAlign: 'center', padding: '0 4px' }}>{slot.error}</div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>點擊重試</div>
                    <input
                      ref={el => fileInputRefs.current[i] = el}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleFileSelect(e, i)}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => { if (fileInputRefs.current[i]) fileInputRefs.current[i].click() }}
                    style={{ width: '100%', height: '100%', borderRadius: 10, border: '1.5px dashed #ccc', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: 24, color: '#ccc' }}>＋</div>
                    <div style={{ fontSize: 11, color: '#bbb' }}>新增照片</div>
                    <input
                      ref={el => fileInputRefs.current[i] = el}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleFileSelect(e, i)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Error */}
        {error && <div style={{ padding: '12px 16px', background: '#FAEAEA', color: '#e53935', borderRadius: 10, fontSize: 13 }}>{error}</div>}

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => router.back()} style={outlineBtn}>← 取消</button>
          <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, flex: 1, opacity: loading ? 0.6 : 1 }}>
            {loading ? '儲存中...' : '✅ 儲存變更'}
          </button>
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

// ── Quick status change (no re-review) ─────────────────────────
function QuickStatusBar({ propertyId, currentStatus }) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const STATUS_OPTS = [
    { value: 'AVAILABLE', label: '✅ 上架中', color: '#22C55E' },
    { value: 'RENTED',    label: '🔵 已租出', color: '#3B82F6' },
    { value: 'PAUSED',    label: '⏸ 暫停刊登', color: '#9CA3AF' },
  ]

  async function save(newStatus) {
    setSaving(true); setMsg('')
    const res = await fetch(`/api/properties/${propertyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusOnly: true, status: newStatus }),
    })
    if (res.ok) { setStatus(newStatus); setMsg('已更新') }
    else { setMsg('更新失敗') }
    setSaving(false)
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div style={{ background: 'white', borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#3d3d3d', marginBottom: 10 }}>⚡ 快速更改狀態（不需重新審核）</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_OPTS.map(opt => (
          <button key={opt.value} onClick={() => save(opt.value)} disabled={saving || status === opt.value}
            style={{ padding: '7px 16px', borderRadius: 99, border: `1.5px solid ${status === opt.value ? opt.color : '#ddd'}`,
              background: status === opt.value ? opt.color + '18' : 'white', color: status === opt.value ? opt.color : '#888',
              fontSize: 13, fontWeight: status === opt.value ? 700 : 400, cursor: status === opt.value ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
            {opt.label}
          </button>
        ))}
        {msg && <span style={{ fontSize: 12, color: '#4E7153', marginLeft: 4 }}>{msg}</span>}
      </div>
    </div>
  )
}

const inputSt = { width: '100%', padding: '11px 14px', border: '1.5px solid #E5DFD5', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', color: '#3d3d3d', boxSizing: 'border-box' }
const primaryBtn = { padding: '14px 0', borderRadius: 12, border: 'none', background: '#4E7153', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
const outlineBtn = { padding: '14px 24px', borderRadius: 12, border: '1.5px solid #E5DFD5', background: 'white', color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const chipAddBtn = { padding: '11px 18px', borderRadius: 10, border: '1.5px solid #4E7153', background: '#EBF2EC', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#3A5740', flexShrink: 0 }
