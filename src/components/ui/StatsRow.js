// src/components/ui/StatsRow.js

export default function StatsRow({ listings = 0, landlords = 0, matches = 0 }) {
  const items = [
    { num: listings.toLocaleString(), label: '上架房源' },
    { num: landlords.toLocaleString(), label: '認證房東' },
    { num: matches.toLocaleString(), label: '成功媒合' },
    { num: '4.8', label: '平均評分' },
  ]
  return (
    <div style={{ display: 'flex', gap: 0, marginTop: 44, flexWrap: 'wrap', background: 'rgba(250,250,248,0.7)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--oat-mid)', overflow: 'hidden', maxWidth: 560 }}>
      {items.map(({ num, label }, i) => (
        <div key={label} style={{ flex: 1, minWidth: 110, textAlign: 'center', padding: '20px 12px', borderLeft: i > 0 ? '1px solid var(--oat-mid)' : 'none' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--sage-dark)', lineHeight: 1, fontFamily: 'Montserrat,sans-serif', letterSpacing: -0.5 }}>{num}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-mid)', letterSpacing: 3, marginTop: 7 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}
