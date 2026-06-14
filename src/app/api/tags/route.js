import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const tags = await db.propertyTag.findMany({
    select: { name: true },
    distinct: ['name'],
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(tags.map(t => t.name))
}
