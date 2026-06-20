// src/app/page.js
import { db } from '@/lib/db'
import { unstable_cache } from 'next/cache'
import Navbar from '@/components/layout/NavbarWrapper'
import SearchBar from '@/components/search/SearchBar'
import PropertyGrid from '@/components/property/PropertyGrid'
import StatsRow from '@/components/ui/StatsRow'
import HeroSlideshow from '@/components/home/HeroSlideshow'

export const dynamic = 'force-dynamic'

// ⚠️ 不在 cache 內 catch：錯誤時不快取空值，下次請求自動重試
const getFeaturedProperties = unstable_cache(
  async () => {
    return await db.property.findMany({
      where:   { featured: true, status: { in: ['AVAILABLE', 'COMING_SOON'] }, deletedAt: null },
      include: {
        landlord: { select: { id: true, name: true, handle: true, avatar: true, verified: true } },
        owner:    { select: { id: true, name: true, siteName: true, avatar: true } },
        images:   { where: { isCover: true }, take: 1 },
        tags:     true,
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    })
  },
  ['featured-properties'],
  { revalidate: 120 }
)

const getPlatformStats = unstable_cache(
  async () => {
    const [listings, landlords, matches] = await Promise.all([
      db.property.count({ where: { deletedAt: null } }),
      db.user.count({ where: { role: 'LANDLORD', verified: true, deletedAt: null } }),
      db.property.count({ where: { status: 'RENTED', deletedAt: null } }),
    ])
    return { listings, landlords, matches }
  },
  ['platform-stats'],
  { revalidate: 300 }
)

export default async function HomePage() {
  // 元件層 catch：DB 失敗時頁面仍正常渲染（顯示空列表）
  let featured = []
  let stats = { listings: 0, landlords: 0, matches: 0 }
  try {
    ;[featured, stats] = await Promise.all([
      getFeaturedProperties(),
      getPlatformStats(),
    ])
  } catch {}

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-bg-layer">
            <HeroSlideshow />
            <svg className="hero-spiral" viewBox="0 0 200 200" fill="none" aria-hidden="true">
              <path d="M100 100 m0 -2 a2 2 0 0 1 2 2 a4 4 0 0 1 -4 4 a8 8 0 0 1 -8 -8 a14 14 0 0 1 14 -14 a22 22 0 0 1 22 22 a32 32 0 0 1 -32 32 a44 44 0 0 1 -44 -44 a58 58 0 0 1 58 -58 a74 74 0 0 1 74 74 a92 92 0 0 1 -92 92"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <div className="hero-inner">
            <div className="hero-eyebrow">SNAIL RENTAL · 台中</div>
            <h1 className="hero-title">
              慢慢住，<span>好好生活</span><br />城市裡安心回家的地方
            </h1>
            <p className="hero-sub">嚴選整理的套房雅房・房東親自管理・像蝸牛一樣，把家好好背在身上</p>
            <SearchBar />
            <StatsRow
              listings={stats.listings}
              landlords={stats.landlords}
              matches={stats.matches}
            />
          </div>
        </section>

        {/* 精選房源 */}
        <section className="section-wrap">
          <div className="section-header">
            <div>
              <h2 className="section-title-main">精選房源</h2>
              <p className="section-subtitle">每一間都親自看過、整理過</p>
            </div>
            <a href="/listings" className="section-link">查看全部 →</a>
          </div>
          <PropertyGrid properties={featured} />
        </section>
      </main>
    </>
  )
}
