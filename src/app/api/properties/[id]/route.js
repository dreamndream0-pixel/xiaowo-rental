// src/app/api/properties/[id]/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request, { params }) {
  const { id } = params

  try {
    const property = await db.property.findFirst({
      where: { id, deletedAt: null },
      include: {
        landlord: {
          select: {
            id: true, name: true, handle: true,
            avatar: true, verified: true,
            avgRating: true, reviewCount: true,
            yearsActive: true, bio: true, lineId: true,
          },
        },
        images:    { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        amenities: true,
        tags:      true,
      },
    })

    if (!property) {
      return NextResponse.json({ error: '找不到此房源' }, { status: 404 })
    }

    // Increment view count (fire-and-forget)
    db.property.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

    return NextResponse.json(property)
  } catch (error) {
    return NextResponse.json({ error: '載入失敗' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  const { id } = params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const property = await db.property.findFirst({ where: { id, deletedAt: null } })
    if (!property) {
      return NextResponse.json({ error: '找不到此房源' }, { status: 404 })
    }
    if (property.landlordId !== session.user.id) {
      return NextResponse.json({ error: '無權限編輯此房源' }, { status: 403 })
    }

    const body = await request.json()
    const { amenities, tags, ...fields } = body

    // Build scalar update data
    const data = {}
    const allowed = ['title','type','city','district','address','price','deposit','mgmtFee','cleaningFee','size','electricType','description']
    for (const key of allowed) {
      if (key in fields) {
        const numFields = ['price','mgmtFee','cleaningFee','size']
        data[key] = numFields.includes(key) ? (Number(fields[key]) || 0) : fields[key]
      }
    }

    // Allow admin-only direct status change; regular edit always re-queues for review
    if (fields.statusOnly === true && fields.status) {
      // Only allow: RENTED, PAUSED (user-controlled state changes without review)
      if (['RENTED','PAUSED','AVAILABLE'].includes(fields.status)) {
        data.status = fields.status
      }
    } else {
      // Content was edited — reset to PENDING for re-review
      data.status = 'PENDING'
    }

    const updated = await db.$transaction(async tx => {
      // Update scalar fields
      const p = await tx.property.update({ where: { id }, data })

      // Replace amenities
      if (Array.isArray(amenities)) {
        await tx.propertyAmenity.deleteMany({ where: { propertyId: id } })
        if (amenities.length > 0) {
          await tx.propertyAmenity.createMany({
            data: amenities.map(name => ({ propertyId: id, name })),
            skipDuplicates: true,
          })
        }
      }

      // Replace tags
      if (Array.isArray(tags)) {
        await tx.propertyTag.deleteMany({ where: { propertyId: id } })
        if (tags.length > 0) {
          await tx.propertyTag.createMany({
            data: tags.map(name => ({ propertyId: id, name })),
            skipDuplicates: true,
          })
        }
      }

      return p
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/properties/[id]', error)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const { id } = params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const property = await db.property.findFirst({ where: { id, deletedAt: null } })
    if (!property) {
      return NextResponse.json({ error: '找不到此房源' }, { status: 404 })
    }
    if (property.landlordId !== session.user.id) {
      return NextResponse.json({ error: '無權限刪除此房源' }, { status: 403 })
    }

    // Soft delete
    await db.property.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'PAUSED' },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  }
}
