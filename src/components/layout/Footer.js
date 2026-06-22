// src/components/layout/Footer.js
import Link from 'next/link'

const FOOTER_LINKS = [
  { label: '關於我們',   href: '/about' },
  { label: '租屋須知',   href: '/rental-guide' },
  { label: '隱私權政策', href: '/privacy' },
  { label: '服務條款',   href: '/terms' },
  { label: '聯絡我們',   href: '/contact' },
]

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--oat-mid)',
      background: 'var(--oat-light)',
      padding: '32px 24px',
      marginTop: 'auto',
    }}>
      <div style={{
        maxWidth: 960, margin: '0 auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        <nav style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 24px' }}>
          {FOOTER_LINKS.map(link => (
            <Link key={link.href} href={link.href} style={{
              fontSize: 13, color: 'var(--gray-mid)', textDecoration: 'none',
            }}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div style={{
          fontSize: 11, color: 'var(--gray-light)',
          fontFamily: 'Montserrat,sans-serif', letterSpacing: 0.5,
        }}>
          © {new Date().getFullYear()} 小蝸出租 Snail Rental. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
