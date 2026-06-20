// src/app/api/tags/route.js
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

// 無過濾條件：依使用次數排序，取前 20 個熱門標籤，快取 5 分鐘
const getAllTags = unstable_cache(
  async () => {
    const tags = await db.propertyTag.groupBy({
      by: ['name'],
      _count: { name: true },
      orderBy: { _count: { name: 'desc' } },
      take: 20,
    })
    return tags.map(t => t.name)
  },
  ['all-tags'],
  { revalidate: 300, tags: ['all-tags'] }
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
        'Cache-Control': 'no-store'
      }
    })
  } catch (e) {
    return NextResponse.json([])
  }
}
