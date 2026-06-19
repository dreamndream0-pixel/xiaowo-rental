// src/components/ui/StatsRow.js

export default function StatsRow({ listings = 0, landlords = 0, matches = 0 }) {
  const items = [
    { num: listings.toLocaleString(), label: '上架房源' },
    { num: landlords.toLocaleString(), label: '認證房東' },
    { num: matches.toLocaleString(), label: '成功媒合' },
    { num: '4.8', label: '平均評分' },
  ]
  return (
    <div style={{
      display: 'flex', gap: 0, marginTop: 44,
      background: 'rgba(250,250,248,0.7)', backdropFilter: 'blur(8px)',
      borderRadius: 'var(--radius-lg)', border: '1px solid var(--oat-mid)',
      overflow: 'hidden', maxWidth: 560, width: '100%',
    }}>
      {items.map(({ num, label }, i) => (
        <div key={label} style={{
          flex: 1, minWidth: 0, textAlign: 'center',
          padding: '18px 4px',
          borderLeft: i > 0 ? '1px solid var(--oat-mid)' : 'none',
        }}>
          <div style={{
            fontSize: 'clamp(16px, 4vw, 26px)',
            fontWeight: 800, color: 'var(--sage-dark)',
            lineHeight: 1, fontFamily: 'Montserrat,sans-serif', letterSpacing: -0.5,
          }}>{num}</div>
          <div style={{
            fontSize: 'clamp(9px, 2.2vw, 11px)',
            color: 'var(--gray-mid)', letterSpacing: 2, marginTop: 7,
            whiteSpace: 'nowrap',
          }}>{label}</div>
        </div>
      ))}
    </div>
  )
}
