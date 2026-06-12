// src/app/api/properties/[id]/images/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request, { params }) {
  const { id } = params
  const images = await request.json()

  try {
    // Delete existing images then re-insert in order
    await db.propertyImage.deleteMany({ where: { propertyId: id } })
    await db.propertyImage.createMany({
      data: images.map((img, i) => ({
        propertyId:   id,
        url:          img.url,
        cloudinaryId: img.cloudinaryId ?? null,
        order:        i,
        isCover:      i === 0,
        width:        img.width ?? null,
        height:       img.height ?? null,
      })),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: '圖片儲存失敗' }, { status: 500 })
  }
}
