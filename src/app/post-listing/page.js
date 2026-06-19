'use client'
// src/app/post-listing/page.js

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Navbar from '@/components/layout/NavbarWrapper'
import Button from '@/components/ui/Button'
import { ALL_CITIES, getDistricts } from '@/lib/districts'

const STEPS = ['基本資訊', '照片上傳', '設施設備', '確認刊登']

const AMENITY_LIST = [
  '冷氣', '冰箱', '洗衣機', '烘衣機', '熱水器',
  '床組', '衣櫃', '書桌', '沙發', '網路',
  '第四台', '獨立衛浴', '陽台', '停車位', '電梯',
  '倉庫', '保全', '門禁',
]

const AMENITY_ICONS = {
  冷氣: '❄️', 冰箱: '🧊', 洗衣機: '👕', 烘衣機: '🔄', 熱水器: '🚿',
  床組: '🛏️', 衣櫃: '🪟', 書桌: '📖', 沙發: '🛋️', 網路: '📶',
  第四台: '📺', 獨立衛浴: '🚿', 陽台: '🌿', 停車位: '🚗',
  電梯: '🛗', 倉庫: '📦', 保全: '🔐', 門禁: '🚪',
}

export default function PostListingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step,      setStep]      = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [errors,    setErrors]    = useState({})
  const [photos,    setPhotos]    = useState([])   // { url, file, uploading }
  const [amenities, setAmenities] = useState(new Set())
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    title: '', type: '', city: '', district: '', address: '',
    size: '', floor: '', price: '', deposit: '兩個月', mgmtFee: '',
    inclWifi: false, inclWater: false, inclCable: false,
    allowPets: false, allowCook: false, allowShortTerm: false, welcomeStudent: true,
    description: '',
  })

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }
  const districts = form.city ? getDistricts(form.city) : []

  // ── Validation ──────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = '請填寫房源標題'
    if (!form.type)         e.type  = '請選擇房型'
    if (!form.city)         e.city  = '請選擇縣市'
    if (!form.address.trim()) e.address = '請填寫地址'
    if (!form.size || isNaN(Number(form.size))) e.size = '請填寫坪數'
    if (!form.price || isNaN(Number(form.price))) e.price = '請填寫月租金'
    if (!form.description.trim()) e.description = '請填寫房源介紹'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Photo upload ─────────────────────────────
  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const tempUrl = URL.createObjectURL(file)
      const tempId  = Date.now() + Math.random()
      setPhotos(prev => [...prev, { id: tempId, url: tempUrl, file, uploading: true }])

      // Upload to API
      const data = new FormData()
      data.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: data })
        const json = await res.json()
        setPhotos(prev => prev.map(p =>
          p.id === tempId ? { ...p, url: json.url, cloudinaryId: json.cloudinaryId, uploading: false } : p
        ))
      } catch {
        setPhotos(prev => prev.filter(p => p.id !== tempId))
      }
    }
  }

  const removePhoto = id => setPhotos(prev => prev.filter(p => p.id !== id))
  const toggleAmenity = name => setAmenities(prev => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })

  // ── Step navigation ──────────────────────────
  const nextStep = () => {
    if (step === 0 && !validate()) return
    setStep(s => Math.min(s + 1, 3))
    window.scrollTo(0, 0)
  }
  const prevStep = () => { setStep(s => Math.max(s - 1, 0)); window.scrollTo(0, 0) }

  // ── Submit ───────────────────────────────────
  const submit = async () => {
    if (!session) { router.push('/login?callbackUrl=/post-listing'); return }
    setLoading(true)
    try {
      // 1. Create property
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          size:     parseFloat(form.size),
          price:    parseInt(form.price),
          mgmtFee:  parseInt(form.mgmtFee || 0),
          amenities: [...amenities],
        }),
      })
      const { id } = await res.json()

      // 2. Save images
      if (photos.length > 0) {
        await fetch(`/api/properties/${id}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photos.map((p, i) => ({
            url: p.url, cloudinaryId: p.cloudinaryId,
            order: i, isCover: i === 0,
          }))),
        })
      }

      // 3. Redirect to dashboard
      router.push('/dashboard?success=listing_created')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Shared styles ─────────────────────────────
  const card  = { background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 20 }
  const ch    = { padding: '18px 24px', borderBottom: '1px solid var(--oat-mid)', display: 'flex', alignItems: 'center', gap: 10 }
  const cb    = { padding: 24 }
  const label = { fontSize: 11, fontWeight: 700, color: 'var(--charcoal)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', marginBottom: 6, display: 'block' }
  const input = (err) => ({
    padding: '10px 14px', borderRadius: 8, width: '100%',
    border: `1.5px solid ${err ? 'var(--danger)' : 'var(--oat-mid)'}`,
    fontSize: 13.5, color: 'var(--charcoal)', fontFamily: 'inherit',
    outline: 'none', background: 'white', boxSizing: 'border-box',
  })
  const errMsg = (k) => errors[k] && <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>{errors[k]}</div>
  const checkLabel = (key, label) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
      <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} style={{ accentColor: 'var(--sage)', width: 16, height: 16 }} />
      {label}
    </label>
  )

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>刊登房源</h1>
            <p style={{ fontSize: 12, color: 'var(--gray-light)', marginTop: 3 }}>填寫詳細資訊，讓租客快速找到您的房源</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>← 返回後台</Button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i < STEPS.length - 1 && (
                <div style={{ position: 'absolute', top: 16, left: '50%', width: '100%', height: 2, background: i < step ? 'var(--sage)' : 'var(--oat-mid)', zIndex: 0 }} />
              )}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', zIndex: 1,
                background: i < step ? 'var(--sage-dark)' : i === step ? 'var(--sage)' : 'var(--oat-mid)',
                color: i <= step ? 'white' : 'var(--gray-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 11, color: i === step ? 'var(--sage-dark)' : 'var(--gray-light)', marginTop: 6, fontWeight: i === step ? 700 : 400, letterSpacing: 0.5 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* ── STEP 0: 基本資訊 ── */}
        {step === 0 && (
          <>
            <div style={card}>
              <div style={ch}><span>🏷️</span><span style={{ fontSize: 14, fontWeight: 700 }}>房源標題與類型</span></div>
              <div style={cb}>
                <div style={{ marginBottom: 18 }}>
                  <label style={label}>標題 <span style={{ color: 'var(--sage)' }}>*</span></label>
                  <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="例：大安區溫馨套房，近捷運，採光佳" maxLength={60} style={input(errors.title)} />
                  {errMsg('title')}
                  <div style={{ fontSize: 11, color: 'var(--gray-light)', marginTop: 4 }}>建議 20–40 字，清楚描述房源特色</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={label}>房型 <span style={{ color: 'var(--sage)' }}>*</span></label>
                    <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...input(errors.type), cursor: 'pointer' }}>
                      <option value="">請選擇</option>
                      <option value="SUITE">套房</option>
                      <option value="ROOM">雅房</option>
                      <option value="WHOLE_FLOOR">整層住家</option>
                      <option value="SHARED_SUITE">分租套房</option>
                    </select>
                    {errMsg('type')}
                  </div>
                  <div>
                    <label style={label}>坪數 <span style={{ color: 'var(--sage)' }}>*</span></label>
                    <input type="number" value={form.size} onChange={e => set('size', e.target.value)} placeholder="12" min="1" style={input(errors.size)} />
                    {errMsg('size')}
                  </div>
                  <div>
                    <label style={label}>樓層</label>
                    <input value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="3/8" style={input()} />
                  </div>
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={ch}><span>📍</span><span style={{ fontSize: 14, fontWeight: 700 }}>地址與位置</span></div>
              <div style={cb}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={label}>縣市 <span style={{ color: 'var(--sage)' }}>*</span></label>
                    <select value={form.city} onChange={e => { set('city', e.target.value); set('district', '') }} style={{ ...input(errors.city), cursor: 'pointer' }}>
                      <option value="">請選擇縣市</option>
                      {ALL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errMsg('city')}
                  </div>
                  <div>
                    <label style={label}>行政區</label>
                    <select value={form.district} onChange={e => set('district', e.target.value)} disabled={!form.city} style={{ ...input(), cursor: form.city ? 'pointer' : 'not-allowed', opacity: form.city ? 1 : 0.5 }}>
                      <option value="">不限</option>
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={label}>詳細地址 <span style={{ color: 'var(--sage)' }}>*</span></label>
                  <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="路名＋門牌號（實際地址僅房東可見，租客看到大概位置）" style={input(errors.address)} />
                  {errMsg('address')}
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={ch}><span>💰</span><span style={{ fontSize: 14, fontWeight: 700 }}>租金與費用</span></div>
              <div style={cb}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={label}>月租金 <span style={{ color: 'var(--sage)' }}>*</span></label>
                    <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="12000" min="0" style={input(errors.price)} />
                    {errMsg('price')}
                  </div>
                  <div>
                    <label style={label}>押金</label>
                    <select value={form.deposit} onChange={e => set('deposit', e.target.value)} style={{ ...input(), cursor: 'pointer' }}>
                      <option>兩個月</option>
                      <option>一個月</option>
                      <option>三個月</option>
                      <option>不需押金</option>
                    </select>
                  </div>
                  <div>
                    <label style={label}>管理費</label>
                    <input type="number" value={form.mgmtFee} onChange={e => set('mgmtFee', e.target.value)} placeholder="0（含管理費填0）" style={input()} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {checkLabel('inclWifi',  '含網路')}
                  {checkLabel('inclWater', '含水費')}
                  {checkLabel('inclCable', '含第四台')}
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={ch}><span>📝</span><span style={{ fontSize: 14, fontWeight: 700 }}>房源介紹</span></div>
              <div style={cb}>
                <label style={label}>詳細介紹 <span style={{ color: 'var(--sage)' }}>*</span></label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="描述房源特色、周邊環境、交通便利性、生活機能…" rows={6} style={{ ...input(errors.description), resize: 'vertical' }} />
                {errMsg('description')}
              </div>
            </div>
          </>
        )}

        {/* ── STEP 1: 照片上傳 ── */}
        {step === 1 && (
          <div style={card}>
            <div style={ch}><span>📸</span><span style={{ fontSize: 14, fontWeight: 700 }}>房源照片</span></div>
            <div style={cb}>
              {/* Drop zone */}
              <div onClick={() => fileInputRef.current?.click()} style={{
                border: '2px dashed var(--oat-mid)', borderRadius: 'var(--radius-md)',
                padding: 32, textAlign: 'center', cursor: 'pointer',
                background: 'var(--oat-light)', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sage)'; e.currentTarget.style.background = 'var(--sage-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--oat-mid)'; e.currentTarget.style.background = 'var(--oat-light)' }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 13, color: 'var(--gray-mid)' }}>點擊或拖曳上傳照片</div>
                <div style={{ fontSize: 11, color: 'var(--gray-light)', marginTop: 4 }}>支援 JPG、PNG，建議至少 4 張，第一張為封面</div>
              </div>
              <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />

              {/* Preview grid */}
              {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
                  {photos.map((p, i) => (
                    <div key={p.id} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', position: 'relative', background: 'var(--oat-mid)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {p.uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>上傳中…</div>
                      )}
                      {i === 0 && <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'var(--sage)', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>封面</div>}
                      <button onClick={() => removePhoto(p.id)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(61,61,61,0.7)', color: 'white', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: 設施設備 ── */}
        {step === 2 && (
          <>
            <div style={card}>
              <div style={ch}><span>⚙️</span><span style={{ fontSize: 14, fontWeight: 700 }}>設施設備</span></div>
              <div style={cb}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {AMENITY_LIST.map(name => {
                    const sel = amenities.has(name)
                    return (
                      <button key={name} onClick={() => toggleAmenity(name)} style={{
                        padding: '8px 10px', borderRadius: 8, fontSize: 12,
                        border: `1.5px solid ${sel ? 'var(--sage)' : 'var(--oat-mid)'}`,
                        background: sel ? 'var(--sage-bg)' : 'none',
                        color: sel ? 'var(--sage-dark)' : 'var(--gray-mid)',
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: sel ? 700 : 500,
                        display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                      }}>
                        <span>{AMENITY_ICONS[name] ?? '✓'}</span>{name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={ch}><span>🏡</span><span style={{ fontSize: 14, fontWeight: 700 }}>入住條件</span></div>
              <div style={cb}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                  {checkLabel('allowPets',    '🐾 可養寵物')}
                  {checkLabel('allowCook',    '🍳 可開伙')}
                  {checkLabel('allowShortTerm', '📅 可短租')}
                  {checkLabel('welcomeStudent', '🎓 歡迎學生')}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3: 確認刊登 ── */}
        {step === 3 && (
          <div style={card}>
            <div style={ch}><span>✅</span><span style={{ fontSize: 14, fontWeight: 700 }}>確認並刊登</span></div>
            <div style={cb}>
              {/* Preview */}
              <div style={{ background: 'var(--oat-light)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>{form.title || '（未填寫標題）'}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginBottom: 12 }}>📍 {form.city}{form.district}・{form.type}・{form.size} 坪</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--sage-dark)', marginBottom: 12 }}>
                  ${Number(form.price || 0).toLocaleString()}
                  <span style={{ fontSize: 12, color: 'var(--gray-light)', fontWeight: 400, marginLeft: 4 }}>/月</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-mid)', lineHeight: 1.8 }}>{form.description?.slice(0, 150)}{form.description?.length > 150 ? '…' : ''}</div>
                {amenities.size > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {[...amenities].map(a => (
                      <span key={a} style={{ background: 'var(--sage-bg)', color: 'var(--sage-dark)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                        {AMENITY_ICONS[a]} {a}
                      </span>
                    ))}
                  </div>
                )}
                {photos.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--sage)' }}>📸 已上傳 {photos.length} 張照片</div>
                )}
              </div>

              {/* Notice */}
              <div style={{ background: 'var(--sage-bg)', borderRadius: 'var(--radius-md)', padding: '16px 18px', borderLeft: '3px solid var(--sage)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sage-dark)', marginBottom: 6 }}>刊登說明</div>
                <div style={{ fontSize: 12, color: 'var(--gray-mid)', lineHeight: 1.9 }}>
                  • 房源刊登後會進入審核流程，通常於 1 個工作天內完成<br />
                  • 審核通過後房源即刻上架，可在後台管理頁面查看狀態<br />
                  • 如需修改，可隨時在房東後台編輯房源資訊
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
          <div>
            {step > 0 && (
              <Button variant="outline" onClick={prevStep}>← 上一步</Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {step < 3 ? (
              <Button onClick={nextStep}>
                下一步：{STEPS[step + 1]} →
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => {}}>💾 儲存草稿</Button>
                <Button onClick={submit} loading={loading}>🚀 送出刊登</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
