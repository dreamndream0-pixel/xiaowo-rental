// src/app/page.js
import { db } from '@/lib/db'
import Navbar from '@/components/layout/Navbar'
import SearchBar from '@/components/search/SearchBar'
import PropertyGrid from '@/components/property/PropertyGrid'
import StatsRow from '@/components/ui/StatsRow'

// Server Component: 在伺服器端取得精選房源
export const revalidate = 60 // ISR: 每60秒重新生成

async function getFeaturedProperties() {
  return db.property.findMany({
    where:   { featured: true, status: 'AVAILABLE', deletedAt: null },
    include: {
      landlord: { select: { id: true, name: true, handle: true, avatar: true, verified: true } },
      images:   { where: { isCover: true }, take: 1 },
      amenities: { take: 4 },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })
}

async function getPlatformStats() {
  const [listings, landlords, matches] = await Promise.all([
    db.property.count({ where: { status: 'AVAILABLE', deletedAt: null } }),
    db.user.count({ where: { role: 'LANDLORD', verified: true, deletedAt: null } }),
    db.property.count({ where: { status: 'RENTED', deletedAt: null } }),
  ])
  return { listings, landlords, matches }
}

export default async function HomePage() {
  const [featured, stats] = await Promise.all([
    getFeaturedProperties(),
    getPlatformStats(),
  ])

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-inner">
            <h1 className="hero-title">
              城市裡的<span>小窩</span><br />安心回家的地方
            </h1>
            <p className="hero-sub">優質房源・貼心服務・生活更美好</p>

            {/* 搜尋欄 (Client Component) */}
            <SearchBar />

            {/* 統計 */}
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
              <p className="section-subtitle">每週精選推薦・品質保證</p>
            </div>
            <a href="/listings" className="section-link">查看全部 →</a>
          </div>
          <PropertyGrid properties={featured} />
        </section>
      </main>
    </>
  )
}
