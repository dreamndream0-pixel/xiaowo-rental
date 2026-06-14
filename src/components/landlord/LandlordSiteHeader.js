import Link from 'next/link'

export default function LandlordSiteHeader({ landlord }) {
  const siteName = landlord.siteName || `${landlord.name} 的租屋`

  return (
    <header style={{
      background: 'linear-gradient(135deg, var(--sage), var(--sage-dark))',
      padding: 0, position: 'sticky', top: 0, zIndex: 200,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        maxWidth: 1120, margin: '0 auto', padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <Link href={`/site/${landlord.id}`} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          textDecoration: 'none', minWidth: 0,
        }}>
          {landlord.siteLogo ? (
            <img src={landlord.siteLogo} alt={siteName} style={{
              height: 40, width: 40, borderRadius: 10,
              objectFit: 'cover', background: 'white', flexShrink: 0,
            }} />
          ) : (
            <div style={{
              height: 40, width: 40, borderRadius: 10,
              background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>🏠</div>
          )}
          <span style={{
            color: 'white', fontWeight: 800, fontSize: 18, letterSpacing: 1,
            fontFamily: 'var(--font-serif)', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{siteName}</span>
        </Link>
        <Link href={`/site/${landlord.id}`} style={{
          color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          padding: '8px 16px', borderRadius: 99,
          border: '1.5px solid rgba(255,255,255,0.5)', whiteSpace: 'nowrap',
        }}>🏡 房源首頁</Link>
      </div>
    </header>
  )
}
