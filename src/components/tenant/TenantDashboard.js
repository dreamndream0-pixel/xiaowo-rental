'use client'
// src/components/tenant/TenantDashboard.js
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { buildLineContactUrl } from '@/lib/lineContact'

const TABS = [
  { id: 'zone',      label: '🏠 租客專區' },
  { id: 'favorites', label: '❤️ 我的收藏' },
  { id: 'history',   label: '👀 瀏覽記錄' },
  { id: 'support',   label: '💬 聯絡客服' },
]

const REPAIR_STATUS = { PENDING: '待處理', IN_PROGRESS: '處理中', DONE: '已完成' }
const REPAIR_COLOR  = { PENDING: '#F59E0B', IN_PROGRESS: '#3B82F6', DONE: '#22C55E' }

export default function TenantDashboard({ user, favCount }) {
  const [tab, setTab]           = useState('zone')
  const [zone, setZone]         = useState(null)
  const [zoneLoading, setZL]    = useState(false)
  const [favs, setFavs]         = useState(null)
  const [favsLoading, setFL]    = useState(false)
  const [history, setHistory]   = useState([])
  const [histLoading, setHistL] = useState(false)
  const [phoneInput, setPhoneInput] = useState(user.phone || '')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneMsg, setPhoneMsg]   = useState('')

  // 載入租客專區
  useEffect(() => {
    if (tab === 'zone' && !zone && !zoneLoading) {
      setZL(true)
      fetch('/api/tenant/zone').then(r => r.json()).then(d => { setZone(d); setZL(false) }).catch(() => setZL(false))
    }
  }, [tab])

  // 載入收藏
  useEffect(() => {
    if (tab === 'favorites' && !favs && !favsLoading) {
      setFL(true)
      fetch('/api/favorites').then(r => r.json()).then(d => { setFavs(Array.isArray(d) ? d : []); setFL(false) }).catch(() => { setFavs([]); setFL(false) })
    }
  }, [tab])

  // 瀏覽記錄（localStorage）
  useEffect(() => {
    if (tab === 'history' && !histLoading) {
      setHistL(true)
      try {
        const ids = JSON.parse(localStorage.getItem('viewHistory') || '[]').slice(0, 30)
        if (!ids.length) { setHistory([]); setHistL(false); return }
        fetch('/api/properties?ids=' + ids.join(',')).then(r => r.json()).then(d => {
          const sorted = ids.map(id => (Array.isArray(d) ? d : []).find(p => p.id === id)).filter(Boolean)
          setHistory(sorted); setHistL(false)
        }).catch(() => { setHistory([]); setHistL(false) })
      } catch { setHistory([]); setHistL(false) }
    }
  }, [tab])

  async function savePhone() {
    if (!phoneInput.trim()) return
    setPhoneSaving(true); setPhoneMsg('')
    try {
      const res = await fetch('/api/tenant/zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setPhoneMsg('✅ 電話已儲存，正在比對租客資料...')
        setZone(null)
        setTimeout(() => { setZL(true); fetch('/api/tenant/zone').then(r => r.json()).then(d => { setZone(d); setZL(false) }) }, 800)
      } else {
        setPhoneMsg('❌ ' + (data.error || '儲存失敗'))
      }
    } catch { setPhoneMsg('❌ 儲存失敗，請稍後再試') }
    setPhoneSaving(false)
  }

  async function removeFav(propertyId) {
    await fetch('/api/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId }) })
    setFavs(prev => prev.filter(f => f.propertyId !== propertyId))
  }

  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }) : ''

  return (
    <main style={{ minHeight: 'calc(100vh - 62px)', background: 'var(--oat-light)' }}>
      {/* ── 頂部個人資訊 ── */}
      <div style={{ background: 'linear-gradient(135deg, var(--sage) 0%, var(--sage-dark) 100%)', padding: '32px 20px 80px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, border: '2.5px solid rgba(255,255,255,0.5)' }}>
            {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', fontFamily: 'var(--font-serif)', marginBottom: 4 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{user.email}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>加入日期：{joinDate}</div>
          </div>
          {/* 快速統計 */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Montserrat,sans-serif' }}>{favCount}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>收藏</div>
            </div>
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Montserrat,sans-serif' }}>{user.lineId ? '✓' : '—'}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>LINE</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 主內容卡片 ── */}
      <div style={{ maxWidth: 860, margin: '-48px auto 40px', padding: '0 16px' }}>
        <div style={{ background: 'white', borderRadius: 22, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>

          {/* 頁籤 */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--oat-mid)', overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: '0 0 auto', padding: '16px 20px', border: 'none', background: 'none',
                fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? 'var(--sage-dark)' : 'var(--gray-mid)',
                borderBottom: tab === t.id ? '2.5px solid var(--sage)' : '2.5px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* 內容區 */}
          <div style={{ padding: '28px 24px' }}>

            {/* ── 租客專區 ── */}
            {tab === 'zone' && (
              zoneLoading ? <Loading /> :
              !zone ? null :
              zone.status === 'no_phone' ? (
                <PhoneSection phoneInput={phoneInput} setPhoneInput={setPhoneInput} saving={phoneSaving} onSave={savePhone} msg={phoneMsg} />
              ) : zone.status === 'not_found' ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <p style={{ fontSize: 15, color: 'var(--charcoal)', fontWeight: 700, marginBottom: 8 }}>找不到租客資料</p>
                  <p style={{ fontSize: 14, color: 'var(--gray-mid)', lineHeight: 1.8, marginBottom: 24 }}>
                    電話 <strong>{zone.user?.phone}</strong> 未找到對應的租客記錄<br />請確認電話是否與房東登記的一致
                  </p>
                  <button onClick={() => { setZone({ status: 'no_phone', user: zone.user }) }}
                    style={{ padding: '10px 24px', borderRadius: 99, border: '1.5px solid var(--sage)', background: 'none', color: 'var(--sage-dark)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    修改電話號碼
                  </button>
                </div>
              ) : zone.status === 'found' ? (
                <TenantZoneContent tenant={zone.tenant} />
              ) : null
            )}

            {/* ── 收藏 ── */}
            {tab === 'favorites' && (
              favsLoading ? <Loading /> :
              !favs ? null :
              favs.length === 0 ? (
                <Empty icon="❤️" text="還沒有收藏的房源" sub={<Link href="/listings" style={{ color: 'var(--sage-dark)', fontWeight: 600 }}>去逛逛房源 →</Link>} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                  {favs.map(f => f.property && (
                    <FavCard key={f.id} property={f.property} onRemove={() => removeFav(f.propertyId)} />
                  ))}
                </div>
              )
            )}

            {/* ── 瀏覽記錄 ── */}
            {tab === 'history' && (
              histLoading ? <Loading /> :
              history.length === 0 ? (
                <Empty icon="👀" text="還沒有瀏覽記錄" sub="看過的房源會出現在這裡" />
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <button onClick={() => { localStorage.removeItem('viewHistory'); setHistory([]) }}
                      style={{ fontSize: 12, color: 'var(--gray-light)', background: 'none', border: '1px solid var(--oat-mid)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      清除記錄
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                    {history.map(p => <HistoryCard key={p.id} property={p} />)}
                  </div>
                </div>
              )
            )}

            {/* ── 聯絡客服 ── */}
            {tab === 'support' && (
              <div style={{ maxWidth: 480, margin: '0 auto' }}>
                <p style={{ fontSize: 14, color: 'var(--gray-mid)', lineHeight: 1.8, marginBottom: 24 }}>
                  有任何問題歡迎直接聯絡我們，我們會盡快為您解答。
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SupportCard icon="💬" title="LINE 官方帳號" desc="加好友即時諮詢" href="https://lin.ee/5qLEcxX" color="#06C755" />
                  <SupportCard icon="📞" title="客服電話" desc="0800-899-969" href="tel:0800899969" color="var(--sage)" />
                  <SupportCard icon="✉️" title="填寫表單" desc="留下聯絡資料，我們主動回覆" href="/contact" color="var(--sage-dark)" />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  )
}

// ── 子元件 ──────────────────────────────────────

function TenantZoneContent({ tenant }) {
  const property = tenant.property
  const repairs  = tenant.repairs || []
  const coverUrl = property?.images?.[0]?.url

  const moveIn = tenant.moveInDate
    ? new Date(tenant.moveInDate).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 承租房源 */}
      <Section title="🏠 承租房源">
        {!property ? (
          <p style={{ color: 'var(--gray-light)', fontSize: 14 }}>尚未設定房源，請聯絡房東</p>
        ) : (
          <Link href={`/property/${property.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16, borderRadius: 14, background: 'var(--oat-light)', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#EEE9DF'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--oat-light)'}>
              <div style={{ width: 80, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--oat-mid)' }}>
                {coverUrl && <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--charcoal)', marginBottom: 4 }}>{property.title}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-mid)' }}>{property.city}{property.district} · {property.address}</div>
                <div style={{ fontSize: 13, color: 'var(--sage-dark)', fontWeight: 700, marginTop: 4 }}>NT$ {property.price?.toLocaleString()} / 月</div>
              </div>
              <div style={{ fontSize: 18, color: 'var(--gray-light)', flexShrink: 0 }}>›</div>
            </div>
          </Link>
        )}
      </Section>

      {/* 租約資訊 */}
      <Section title="📋 租約資訊">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          <InfoCard label="入住日期" value={moveIn || '未設定'} icon="📅" />
          <InfoCard label="繳租日" value={tenant.rentDue ? `每月 ${tenant.rentDue} 號` : '未設定'} icon="💴" />
          <InfoCard label="押金" value={property?.deposit || '未設定'} icon="🔐" />
          <InfoCard label="管理費" value={property?.mgmtFee ? `NT$ ${property.mgmtFee}` : '含在租金內'} icon="🏢" />
        </div>

        {/* 水電費資訊 */}
        {property && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'var(--oat-light)', fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: 'var(--charcoal)', marginBottom: 10 }}>⚡ 水電費計算方式</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--gray-mid)' }}>
              {property.electricType && (
                <div>💡 電費：{property.electricType}
                  {property.electricRate ? `（每度 NT$ ${property.electricRate}）` : ''}
                  {property.electricFlat ? `（每月固定 NT$ ${property.electricFlat}）` : ''}
                </div>
              )}
              {property.inclWater && <div>🚿 水費：含在租金內</div>}
              {property.inclWifi  && <div>📶 網路：含在租金內</div>}
              {property.inclCable && <div>📺 有線電視：含在租金內</div>}
              {!property.electricType && !property.inclWater && !property.inclWifi && (
                <div>請直接向房東確認</div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* 維修清單 */}
      <Section title="🔧 維修記錄">
        {repairs.length === 0 ? (
          <p style={{ color: 'var(--gray-light)', fontSize: 14 }}>目前沒有維修記錄</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {repairs.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, border: '1.5px solid var(--oat-mid)' }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <span style={{ background: REPAIR_COLOR[r.status] + '22', color: REPAIR_COLOR[r.status], fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                    {REPAIR_STATUS[r.status] || r.status}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--charcoal)' }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>{r.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-light)', marginTop: 4 }}>
                    {new Date(r.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 房東聯絡方式 */}
      {(tenant.landlord || property?.owner) && (
        <Section title="📞 房東聯絡">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(tenant.landlord?.phone || property?.owner?.phone) && (
              <a href={`tel:${tenant.landlord?.phone || property?.owner?.phone}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 99, background: 'var(--sage-bg)', color: 'var(--sage-dark)', fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1.5px solid var(--sage-light)' }}>
                📞 撥打電話
              </a>
            )}
            {(tenant.landlord?.lineOfficialId || property?.owner?.lineOfficialId) && (
              <a href={buildLineContactUrl(tenant.landlord?.lineOfficialId || property?.owner?.lineOfficialId)}
                target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 99, background: '#EDFAF1', color: '#06C755', fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1.5px solid #06C75544' }}>
                💬 LINE 聯絡
              </a>
            )}
          </div>
        </Section>
      )}
    </div>
  )
}

function PhoneSection({ phoneInput, setPhoneInput, saving, onSave, msg }) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📱</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 8 }}>查詢租客資料</h2>
      <p style={{ fontSize: 14, color: 'var(--gray-mid)', lineHeight: 1.8, marginBottom: 24 }}>
        輸入您與房東登記的電話號碼，即可查看承租房源、維修記錄、水電費等資訊。
      </p>
      <div style={{ textAlign: 'left', marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--gray-mid)', display: 'block', marginBottom: 4 }}>聯絡電話</label>
        <input value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="0912-345-678"
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--oat-mid)', borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
          onKeyDown={e => e.key === 'Enter' && onSave()} />
        <p style={{ fontSize: 11, color: 'var(--gray-light)', marginTop: 6 }}>
          請填寫您給房東的聯絡電話，系統將自動比對租客記錄
        </p>
      </div>
      {msg && <div style={{ fontSize: 13, marginBottom: 12, color: msg.startsWith('✅') ? 'var(--sage-dark)' : 'var(--danger)' }}>{msg}</div>}
      <button onClick={onSave} disabled={saving}
        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'var(--sage)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? '查詢中...' : '查詢租客資料'}
      </button>
      <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: 'var(--oat-light)', fontSize: 13, color: 'var(--gray-mid)', textAlign: 'left' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>找不到資料？</div>
        <div>確認電話是否與房東登記的一致，或聯絡房東請其在後台建立您的租客資料。</div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function InfoCard({ label, value, icon }) {
  return (
    <div style={{ background: 'var(--oat-light)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: 'var(--gray-light)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>{value}</div>
    </div>
  )
}

function FavCard({ property, onRemove }) {
  const cover = property.images?.[0]?.url
  return (
    <div style={{ borderRadius: 14, border: '1.5px solid var(--oat-mid)', overflow: 'hidden', position: 'relative' }}>
      <button onClick={onRemove} style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: 'white', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      <Link href={`/property/${property.id}`} style={{ textDecoration: 'none' }}>
        <div style={{ height: 140, background: 'var(--oat-mid)' }}>
          {cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{property.title}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-mid)' }}>{property.city}{property.district}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sage-dark)', marginTop: 6 }}>NT$ {property.price?.toLocaleString()}</div>
        </div>
      </Link>
    </div>
  )
}

function HistoryCard({ property }) {
  const cover = property.images?.[0]?.url || property.coverUrl
  return (
    <Link href={`/property/${property.id}`} style={{ textDecoration: 'none' }}>
      <div style={{ borderRadius: 14, border: '1.5px solid var(--oat-mid)', overflow: 'hidden' }}>
        <div style={{ height: 130, background: 'var(--oat-mid)' }}>
          {cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{property.title}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-mid)' }}>{property.city}{property.district}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sage-dark)', marginTop: 4 }}>NT$ {property.price?.toLocaleString()}</div>
        </div>
      </div>
    </Link>
  )
}

function SupportCard({ icon, title, desc, href, color }) {
  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : '_self'} rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 14, border: '1.5px solid var(--oat-mid)', textDecoration: 'none', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--oat-light)'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--charcoal)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 18, color: 'var(--gray-light)' }}>›</div>
    </a>
  )
}

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--gray-light)', gap: 10 }}>
      <span style={{ fontSize: 24 }}>🐌</span> 載入中...
    </div>
  )
}

function Empty({ icon, text, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 15, color: 'var(--gray-mid)', marginBottom: 8 }}>{text}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--gray-light)' }}>{sub}</div>}
    </div>
  )
}
