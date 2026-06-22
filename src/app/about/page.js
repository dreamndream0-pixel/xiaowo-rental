// src/app/about/page.js  (Server Component)
import Navbar from '@/components/layout/NavbarWrapper'
import Footer from '@/components/layout/Footer'
import { getSitePage } from '@/lib/sitePages'

export const metadata = { title: '關於我們 | 小蝸出租' }
export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const { title, body } = await getSitePage('page_about')
  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 62px)', background: 'var(--oat-light)', padding: '48px 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', background: 'white', borderRadius: 22, padding: 36, boxShadow: 'var(--shadow-md)' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, color: 'var(--charcoal)', marginBottom: 20 }}>
            {title || '關於我們'}
          </h1>
          <div style={{ fontSize: 15, color: 'var(--gray-mid)', lineHeight: 2, whiteSpace: 'pre-wrap' }}>
            {body || '內容準備中。'}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
