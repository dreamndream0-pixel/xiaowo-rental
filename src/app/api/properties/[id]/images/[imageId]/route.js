// src/app/api/properties/[id]/images/[imageId]/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(request, { params }) {
  const { id, imageId } = params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    // Verify property ownership
    const property = await db.property.findFirst({ where: { id, deletedAt: null } })
    if (!property) {
      return NextResponse.json({ error: '找不到此房源' }, { status: 404 })
    }
    if (property.landlordId !== session.user.id) {
      return NextResponse.json({ error: '無權限' }, { status: 403 })
    }

    await db.propertyImage.delete({ where: { id: imageId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: '刪除圖片失敗' }, { status: 500 })
  }
}
