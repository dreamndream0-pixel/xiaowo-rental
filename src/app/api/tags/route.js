import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // groupBy to get distinct tag names across all properties
  const tags = await db.propertyTag.groupBy({
    by: ['name'],
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(tags.map(t => t.name))
}
