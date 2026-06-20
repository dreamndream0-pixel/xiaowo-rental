// src/app/api/tags/route.js
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

// 無過濾條件：快取所有標籤 5 分鐘
const getAllTags = unstable_cache(
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

// 有過濾條件：動態查詢符合房源的標籤
async function getFilteredTags({ city, district, keyword, type, landlord }) {
  const where = {
    deletedAt: null,
    status: { in: ['AVAILABLE', 'COMING_SOON', 'RENTED'] },
    ...(city     && { city }),
    ...(district && { district }),
    ...(landlord && { ownerId: landlord }),
    ...(type     && { type: { in: type.split(',') } }),
    ...(keyword  && {
      OR: [
        { title:       { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { city:        { contains: keyword, mode: 'insensitive' } },
        { district:    { contains: keyword, mode: 'insensitive' } },
        { address:     { contains: keyword, mode: 'insensitive' } },
        { tags:        { some: { name: { contains: keyword, mode: 'insensitive' } } } },
      ],
    }),
  }
  const props = await db.property.findMany({
    where,
    select: { tags: { select: { name: true } } },
  })
  const nameSet = new Set()
  props.forEach(p => p.tags.forEach(t => nameSet.add(t.name)))
  return Array.from(nameSet).sort()
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const city     = searchParams.get('city')     || null
    const district = searchParams.get('district') || null
    const keyword  = searchParams.get('keyword')  || null
    const type     = searchParams.get('type')     || null
    const landlord = searchParams.get('landlord') || null

    const hasFilter = city || district || keyword || type || landlord

    const tags = hasFilter
      ? await getFilteredTags({ city, district, keyword, type, landlord })
      : await getAllTags()

    return NextResponse.json(tags, {
      headers: {
        'Cache-Control': hasFilter ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
  } catch (e) {
    return NextResponse.json([])
  }
}
