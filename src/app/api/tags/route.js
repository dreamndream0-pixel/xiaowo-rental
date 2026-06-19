import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

// 標籤很少變動，快取 5 分鐘
const getCachedTags = unstable_cache(
  async () => {
    const tags = await db.propertyTag.groupBy({
      by: ['name'],
      orderBy: { name: 'asc' },
    })
    return tags.map(t => t.name)
  },
  ['all-tags'],
  { revalidate: 300 }
)

export async function GET() {
  const tags = await getCachedTags()
  return NextResponse.json(tags, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
  })
}
