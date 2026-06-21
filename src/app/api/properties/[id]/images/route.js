// src/app/api/properties/[id]/images/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request, { params }) {
  const { id } = params
  const body = await request.json()

  try {
    // If body has `replace: true`, delete existing and re-insert in order (original behavior)
    // Otherwise, append new images to the existing set
    if (body.replace) {
      const images = body.images ?? body
      await db.propertyImage.deleteMany({ where: { propertyId: id } })
      await db.propertyImage.createMany({
        data: images.map((img, i) => ({
          propertyId:   id,
          url:          img.url,
          cloudinaryId: img.cloudinaryId ?? null,
          order:        img.order ?? i,
          isCover:      img.isCover ?? i === 0,
          width:        img.width ?? null,
          height:       img.height ?? null,
        })),
      })
    } else {
      // body is an array — append mode (used by NewPropertyForm and edit add)
      const images = Array.isArray(body) ? body : [body]
      const existing = await db.propertyImage.count({ where: { propertyId: id } })
      await db.propertyImage.createMany({
        data: images.map((img, i) => ({
          propertyId:   id,
          url:          img.url,
          cloudinaryId: img.cloudinaryId ?? null,
          order:        img.order ?? existing + i,
          isCover:      img.isCover ?? false,
          width:        img.width ?? null,
          height:       img.height ?? null,
        })),
        skipDuplicates: true,
      })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: '圖片儲存失敗' }, { status: 500 })
  }
}
