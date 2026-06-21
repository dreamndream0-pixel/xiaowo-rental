'use client'
// src/components/account/UserDashboard.js
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

const PROPERTY_STATUS_TABS = [
  { id: 'all',       label: '全部' },
  { id: 'AVAILABLE', label: '上架中' },
  { id: 'INACTIVE',  label: '已下架' },
  { id: 'RENTED',    label: '已成交' },
  { id: 'boost',     label: '刊登廣告' },
]

const REPAIR_STATUS = { PENDING: '待處理', IN_PROGRESS: '處理中', DONE: '已完成' }
const STATUS_COLOR  = { AVAILABLE: '#22C55E', INACTIVE: '#9CA3AF', RENTED: '#3B82F6', PENDING: '#F59E0B', PAUSED: '#F59E0B' }
const STATUS_LABEL  = { AVAILABLE: '上架中', INACTIVE: '已下架', RENTED: '已成交', PENDING: '審核中', PAUSED: '暫停', REJECTED: '未通過' }

export default function UserDashboard({ user, favCount, propCount, initTab, initSuper, initMode }) {
  const [mode, setMode]         = useState(initMode || 'tenant')
  const [animating, setAnim]    = useState(false)
  const [direction, setDir]     = useState(1)
  const [superModal, setSuper]  = useState(!!initSuper)

  // tenant state
  const [tenantTab, setTenantTab]     = useState(initTab || 'home')
  const [zone, setZone]               = useState(null)
  const [zoneLoading, setZL]          = useState(false)
  const [phoneInput, setPhoneInput]   = useState(user.phone || '')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneMsg, setPhoneMsg]       = useState('')
  const [favs, setFavs]               = useState(null)
  const [favsLoading, setFL]          = useState(false)
  const [history, setHistory]         = useState([])

  // landlord state
  const [properties, setProperties]   = useState(null)
  const [propsLoading, setPropsLoading] = useState(false)
  const [propTab, setPropTab]         = useState('all')

  // ── Mode switch ────────────────────────────────
  function switchMode(next) {
    if (next === mode || animating) return
    setDir(next === 'landlord' ? 1 : -1)
    setAnim(true)
    setTimeout(() => { setMode(next); setAnim(false) }, 280)
  }

  // ── Load tenant zone ────────────────────────────
  useEffect(() => {
    if (mode === 'tenant' && tenantTab === 'home' && !zone && !zoneLoading) {
      setZL(true)
      fetch('/api/tenant/zone').then(r => r.json()).then(d => { setZone(d); setZL(false) }).catch(() => setZL(false))
    }
  }, [mode, tenantTab])

  // ── Load favorites ──────────────────────────────
  useEffect(() => {
    if (mode === 'tenant' && tenantTab === 'favorites' && !favs && !favsLoading) {
      setFL(true)
      fetch('/api/favorites').then(r => r.json()).then(d => { setFavs(Array.isArray(d) ? d : []); setFL(false) }).catch(() => { setFavs([]); setFL(false) })
    }
  }, [mode, tenantTab])

  // ── Load browse history ─────────────────────────
  useEffect(() => {
    if (mode === 'tenant' && tenantTab === 'history') {
      try {
        const ids = JSON.parse(localStorage.getItem('viewHistory') || '[]').slice(0, 20)
        if (!ids.length) { setHistory([]); return }
        fetch('/api/properties?ids=' + ids.join(',')).then(r => r.json()).then(d => {
          const sorted = ids.map(id => (Array.isArray(d) ? d : []).find(p => p.id === id)).filter(Boolean)
          setHistory(sorted)
        }).catch(() => setHistory([]))
      } catch { setHistory([]) }
    }
  }, [mode, tenantTab])

  // ── Load landlord properties ────────────────────
  useEffect(() => {
    if (mode === 'landlord' && !properties && !propsLoading) {
      setPropsLoading(true)
      fetch('/api/user/properties').then(r => r.json()).then(d => { setProperties(Array.isArray(d) ? d : []); setPropsLoading(false) }).catch(() => { setProperties([]); setPropsLoading(false) })
    }
  }, [mode])

  async function savePhone() {
    if (!phoneInput.trim()) return
    setPhoneSaving(true); setPhoneMsg('')
    const res = await fetch('/api/tenant/zone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phoneInput.trim() }) })
    const data = await res.json()
    if (res.ok) {
      setPhoneMsg('✅ 比對中...')
      setZone(null)
      setTimeout(() => { setZL(true); fetch('/api/tenant/zone').then(r => r.json()).then(d => { setZone(d); setZL(false) }) }, 600)
    } else { setPhoneMsg('❌ ' + (data.error || '失敗')) }
    setPhoneSaving(false)
  }

  async function removeFav(propertyId) {
    await fetch('/api/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId }) })
    setFavs(prev => prev.filter(f => f.propertyId !== propertyId))
  }

  const filteredProps = (properties || []).filter(p => {
    if (propTab === 'all')   return true
    if (propTab === 'boost') return p.boostPlan !== 'NONE'
    return p.status === propTab
  })

  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-TW') : ''

  return (
    <main style={{ minHeight: 'calc(100vh - 62px)', background: '#F5F3EF' }}>

      {/* ── Profile header ── */}
      <div style={{ background: 'linear-gradient(135deg, #4E7153 0%, #3A5740 100%)', padding: '36px 20px 100px', position: 'relative' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2.5px solid rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
              {user.avatar ? <img src={user.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" /> : '👤'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 4 }}>{user.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{user.email} · 加入 {joinDate}</div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <StatChip label="收藏" value={favCount} />
              <StatChip label="我的房源" value={propCount} />
            </div>
          </div>

          {/* Mode switch */}
          <div style={{ display: 'flex', gap: 0, marginTop: 28, background: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: 4, alignSelf: 'flex-start', width: 'fit-content' }}>
            {[['tenant', '🏠 租客模式'], ['landlord', '🏢 房東模式']].map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)} style={{
                padding: '9px 24px', borderRadius: 11, border: 'none', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.22s',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#3A5740' : 'rgba(255,255,255,0.75)',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main card (with slide animation) ── */}
      <div style={{ maxWidth: 780, margin: '-64px auto 40px', padding: '0 16px' }}>
        <div style={{
          background: 'white', borderRadius: 22, boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
          overflow: 'hidden',
          transform: animating ? `translateX(${direction * 40}px)` : 'translateX(0)',
          opacity: animating ? 0 : 1,
          transition: 'transform 0.28s cubic-bezier(.4,0,.2,1), opacity 0.28s',
        }}>

          {/* ═══ TENANT MODE ═══ */}
          {mode === 'tenant' && (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid #EDE8DF', overflowX: 'auto' }}>
                {[['home','🏡 我的租屋處'],['favorites','❤️ 收藏'],['history','👀 瀏覽記錄'],['support','💬 客服']].map(([id, label]) => (
                  <Tab key={id} active={tenantTab === id} onClick={() => setTenantTab(id)}>{label}</Tab>
                ))}
              </div>

              <div style={{ padding: '28px 24px', minHeight: 360 }}>
                {tenantTab === 'home' && (
                  zoneLoading ? <Spinner /> :
                  !zone ? null :
                  zone.status === 'no_phone' ? (
                    <PhoneSection phoneInput={phoneInput} setPhoneInput={setPhoneInput} saving={phoneSaving} onSave={savePhone} msg={phoneMsg} />
                  ) : zone.status === 'not_found' ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
                      <p style={{ fontWeight: 700, color: '#3d3d3d', marginBottom: 6 }}>找不到租客資料</p>
                      <p style={{ fontSize: 13, color: '#999', lineHeight: 1.8, marginBottom: 20 }}>電話 <b>{zone.user?.phone}</b> 未找到記錄<br />請確認與房東登記的電話一致</p>
                      <button onClick={() => setZone({ ...zone, status: 'no_phone' })} style={outlineBtn}>修改電話</button>
                    </div>
                  ) : zone.status === 'found' ? (
                    <TenantZone tenant={zone.tenant} />
                  ) : null
                )}

                {tenantTab === 'favorites' && (
                  favsLoading ? <Spinner /> :
                  !favs ? null :
                  favs.length === 0 ? <Empty icon="❤️" text="尚無收藏" sub={<Link href="/listings" style={{ color: '#4E7153', fontWeight: 600 }}>去看看房源 →</Link>} /> :
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14 }}>
                    {favs.map(f => f.property && <MiniCard key={f.id} p={f.property} onRemove={() => removeFav(f.propertyId)} />)}
                  </div>
                )}

                {tenantTab === 'history' && (
                  history.length === 0 ? <Empty icon="👀" text="尚無瀏覽記錄" /> :
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                      <button onClick={() => { localStorage.removeItem('viewHistory'); setHistory([]) }} style={{ fontSize: 12, color: '#bbb', background: 'none', border: '1px solid #eee', borderRadius: 8, padding: '3px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>清除記錄</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14 }}>
                      {history.map(p => <MiniCard key={p.id} p={p} />)}
                    </div>
                  </div>
                )}

                {tenantTab === 'support' && (
                  <div style={{ maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <SupportRow icon="💬" title="LINE 官方帳號" desc="即時諮詢" href="https://lin.ee/5qLEcxX" />
                    <SupportRow icon="📞" title="客服電話" desc="0800-899-969" href="tel:0800899969" />
                    <SupportRow icon="✉️" title="填寫諮詢表單" desc="我們主動回覆" href="/contact" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══ LANDLORD MODE ═══ */}
          {mode === 'landlord' && (
            <>
              <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                  {PROPERTY_STATUS_TABS.map(t => (
                    <button key={t.id} onClick={() => setPropTab(t.id)} style={{
                      padding: '7px 16px', borderRadius: 99, border: '1.5px solid', fontFamily: 'inherit',
                      fontSize: 12, fontWeight: propTab === t.id ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap',
                      borderColor: propTab === t.id ? '#4E7153' : '#E5DFD5',
                      background: propTab === t.id ? '#4E7153' : 'white',
                      color: propTab === t.id ? 'white' : '#888',
                    }}>{t.label}</button>
                  ))}
                </div>
                <Link href="/property/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, background: '#4E7153', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  ＋ 新增房源
                </Link>
              </div>

              <div style={{ padding: '20px 24px 28px', minHeight: 320 }}>
                {propsLoading ? <Spinner /> :
                 filteredProps.length === 0 ? (
                  <Empty icon="🏠" text={propTab === 'all' ? '還沒有刊登房源' : '此分類目前沒有房源'}
                    sub={propTab === 'all' && <Link href="/property/new" style={{ color: '#4E7153', fontWeight: 600 }}>立即新增第一間房源 →</Link>} />
                 ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredProps.map(p => <PropertyRow key={p.id} p={p} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── 成為超級房東 CTA ── */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={() => setSuper(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 99,
            background: 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
            border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(212,168,67,0.35)',
          }}>
            ⭐ 成為超級房東
          </button>
        </div>
      </div>

      {/* ── 超級房東 Modal ── */}
      {superModal && <SuperModal onClose={() => setSuper(false)} />}
    </main>
  )
}

// ── 超級房東 Modal ────────────────────────────────────────────────
function SuperModal({ onClose }) {
  const benefits = [
    { icon: '🤖', title: 'LINE Bot 機器人', desc: '專屬 LINE Bot，租客直接在 LINE 上預約看房、回報維修，自動通知房東' },
    { icon: '🌐', title: '專屬個人官網', desc: '擁有自己的房源官網 /site/你的名字，分享給租客直接看你的所有房源' },
    { icon: '📊', title: '後台管理系統', desc: '完整的後台管理，管理所有租客、預約、維修記錄、社區資訊' },
    { icon: '💬', title: '圖文選單', desc: '客製化 LINE 圖文選單，讓租客一鍵找到所需資訊' },
    { icon: '🔧', title: '維修管理', desc: '租客透過 LINE 提交維修申請，房東在後台統一管理處理進度' },
    { icon: '📅', title: '預約看房', desc: '線上預約看房，自動發送確認通知，有效管理帶看時間' },
  ]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 24, maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #D4A843 0%, #8B6914 100%)', padding: '28px 28px 24px', borderRadius: '24px 24px 0 0', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⭐</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'white', marginBottom: 6 }}>超級房東</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
            升級為超級房東，擁有 LINE Bot 機器人與專屬管理後台<br />
            讓出租更輕鬆、更專業
          </div>
        </div>

        {/* Benefits */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#B8860B', letterSpacing: 2, marginBottom: 16 }}>專屬功能</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {benefits.map(b => (
              <div key={b.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FEF9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{b.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#3d3d3d', marginBottom: 3 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ marginTop: 28, padding: 20, borderRadius: 16, background: '#FAFAF8', border: '1.5px solid #E8E0D0' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#3d3d3d', marginBottom: 12 }}>立即申請成為超級房東</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="https://lin.ee/5qLEcxX" target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 12, background: '#06C755', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                💬 LINE 諮詢
              </a>
              <a href="tel:0800899969" style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 12, background: '#4E7153', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                📞 0800-899-969
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 租客專區 ─────────────────────────────────────────────────────
function TenantZone({ tenant }) {
  const p = tenant.property
  const cover = p?.images?.[0]?.url
  const moveIn = tenant.moveInDate ? new Date(tenant.moveInDate).toLocaleDateString('zh-TW') : '未設定'
  const repairs = tenant.repairs || []
  const RCOLOR = { PENDING: '#F59E0B', IN_PROGRESS: '#3B82F6', DONE: '#22C55E' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* 房源 */}
      <Section title="🏠 承租房源">
        {!p ? <Muted>尚未設定房源，請聯絡房東</Muted> : (
          <Link href={`/property/${p.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 14, background: '#F5F3EF', alignItems: 'center' }}>
              <div style={{ width: 72, height: 58, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#E5DFD5' }}>
                {cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#3d3d3d' }}>{p.title}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{p.city}{p.district}</div>
                <div style={{ fontSize: 13, color: '#4E7153', fontWeight: 700, marginTop: 4 }}>NT$ {p.price?.toLocaleString()} / 月</div>
              </div>
              <span style={{ color: '#ccc' }}>›</span>
            </div>
          </Link>
        )}
      </Section>

      {/* 租約資訊 */}
      <Section title="📋 租約資訊">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
          {[['📅','入住日期',moveIn],['💴','繳租日',tenant.rentDue ? `每月 ${tenant.rentDue} 號` : '未設定'],['🔐','押金',p?.deposit||'未設定'],['🏢','管理費',p?.mgmtFee ? `NT$ ${p.mgmtFee}` : '含在租金']].map(([ic,lb,vl])=>(
            <div key={lb} style={{ background: '#F5F3EF', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 16 }}>{ic}</div>
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>{lb}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3d3d3d', marginTop: 2 }}>{vl}</div>
            </div>
          ))}
        </div>
        {p?.electricType && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: '#F5F3EF', fontSize: 12, color: '#888' }}>
            ⚡ 電費：{p.electricType}{p.electricRate ? `（每度 NT$${p.electricRate}）` : ''}
            {p.inclWater && '  🚿 水費含租金'}
            {p.inclWifi  && '  📶 網路含租金'}
          </div>
        )}
      </Section>

      {/* 維修 */}
      <Section title="🔧 維修記錄">
        {!repairs.length ? <Muted>目前無維修記錄</Muted> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {repairs.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 12, border: '1px solid #EDE8DF' }}>
                <span style={{ background: RCOLOR[r.status]+'22', color: RCOLOR[r.status], fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 99, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>{REPAIR_STATUS[r.status]}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#3d3d3d' }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{new Date(r.createdAt).toLocaleDateString('zh-TW')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 房東聯絡 */}
      {(tenant.landlord?.phone || p?.owner?.phone) && (
        <Section title="📞 聯絡房東">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={`tel:${tenant.landlord?.phone || p?.owner?.phone}`} style={{ padding: '10px 20px', borderRadius: 99, background: '#EBF2EC', color: '#3A5740', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>📞 撥打電話</a>
          </div>
        </Section>
      )}
    </div>
  )
}

function PhoneSection({ phoneInput, setPhoneInput, saving, onSave, msg }) {
  return (
    <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#3d3d3d', marginBottom: 8 }}>查詢租客資料</div>
      <p style={{ fontSize: 13, color: '#999', lineHeight: 1.8, marginBottom: 20 }}>輸入您與房東登記的電話，系統自動比對租約、維修等資訊</p>
      <input value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="0912-345-678"
        onKeyDown={e => e.key === 'Enter' && onSave()}
        style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5DFD5', borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit', marginBottom: 12 }} />
      {msg && <div style={{ fontSize: 13, marginBottom: 10, color: msg.startsWith('✅') ? '#4E7153' : '#e53935' }}>{msg}</div>}
      <button onClick={onSave} disabled={saving}
        style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: '#4E7153', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? '查詢中...' : '查詢我的租約'}
      </button>
    </div>
  )
}

function PropertyRow({ p }) {
  const cover = p.images?.[0]?.url
  const sc = STATUS_COLOR[p.status] || '#aaa'
  const sl = STATUS_LABEL[p.status] || p.status
  return (
    <div style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 14, border: '1.5px solid #EDE8DF', alignItems: 'center' }}>
      <div style={{ width: 72, height: 58, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#E5DFD5' }}>
        {cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#3d3d3d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
          {p.boostPlan !== 'NONE' && <span style={{ fontSize: 10, background: '#FEF9EC', color: '#B8860B', padding: '2px 8px', borderRadius: 99, fontWeight: 700, flexShrink: 0 }}>廣告中</span>}
        </div>
        <div style={{ fontSize: 12, color: '#aaa' }}>{p.city}{p.district} · NT${p.price?.toLocaleString()}/月</div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>收藏 {p._count?.favorites} · 預約 {p._count?.bookings}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + '18', padding: '3px 10px', borderRadius: 99 }}>{sl}</span>
        <Link href={`/property/${p.id}`} style={{ fontSize: 12, color: '#4E7153', fontWeight: 600, textDecoration: 'none' }}>查看 ›</Link>
        <Link href={`/property/${p.id}/edit`} style={{ fontSize: 12, color: '#888', fontWeight: 600, textDecoration: 'none', padding: '3px 10px', border: '1px solid #ddd', borderRadius: 8 }}>✏️ 編輯</Link>
      </div>
    </div>
  )
}

function MiniCard({ p, onRemove }) {
  const cover = p.images?.[0]?.url || p.coverUrl
  return (
    <div style={{ borderRadius: 14, border: '1.5px solid #EDE8DF', overflow: 'hidden', position: 'relative' }}>
      {onRemove && <button onClick={onRemove} style={{ position: 'absolute', top: 7, right: 7, zIndex: 2, background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 26, height: 26, color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
      <Link href={`/property/${p.id}`} style={{ textDecoration: 'none' }}>
        <div style={{ height: 130, background: '#E5DFD5' }}>{cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3d3d3d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
          <div style={{ fontSize: 12, color: '#4E7153', fontWeight: 700, marginTop: 4 }}>NT${p.price?.toLocaleString()}</div>
        </div>
      </Link>
    </div>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────
const Tab = ({ children, active, onClick }) => (
  <button onClick={onClick} style={{ flex: '0 0 auto', padding: '14px 18px', border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#4E7153' : '#aaa', borderBottom: active ? '2.5px solid #4E7153' : '2.5px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>{children}</button>
)
const Section = ({ title, children }) => (
  <div><div style={{ fontSize: 13, fontWeight: 800, color: '#3d3d3d', marginBottom: 10 }}>{title}</div>{children}</div>
)
const StatChip = ({ label, value }) => (
  <div style={{ textAlign: 'center', color: 'white' }}>
    <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'Montserrat,sans-serif' }}>{value}</div>
    <div style={{ fontSize: 11, opacity: 0.75 }}>{label}</div>
  </div>
)
const SupportRow = ({ icon, title, desc, href }) => (
  <a href={href} target={href.startsWith('http') ? '_blank' : '_self'} rel="noreferrer"
    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, border: '1.5px solid #EDE8DF', textDecoration: 'none', background: 'white' }}
    onMouseEnter={e => e.currentTarget.style.background = '#F5F3EF'}
    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EBF2EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
    <div><div style={{ fontSize: 14, fontWeight: 700, color: '#3d3d3d' }}>{title}</div><div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{desc}</div></div>
    <span style={{ marginLeft: 'auto', color: '#ccc', fontSize: 18 }}>›</span>
  </a>
)
const Muted = ({ children }) => <div style={{ fontSize: 13, color: '#bbb' }}>{children}</div>
const Empty = ({ icon, text, sub }) => (
  <div style={{ textAlign: 'center', padding: '50px 20px' }}>
    <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 14, color: '#bbb', marginBottom: 8 }}>{text}</div>
    {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
  </div>
)
const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#bbb', gap: 8 }}>
    <span style={{ fontSize: 20 }}>🐌</span> 載入中...
  </div>
)
const outlineBtn = { padding: '9px 22px', borderRadius: 99, border: '1.5px solid #4E7153', background: 'none', color: '#4E7153', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
