// src/app/api/properties/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureMigrations } from '@/lib/migrations'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request) {
  await ensureMigrations()
  const { searchParams } = new URL(request.url)

  const city     = searchParams.get('city')     || undefined
  const district = searchParams.get('district') || undefined
  const keyword  = searchParams.get('keyword')  || undefined
  const type     = searchParams.get('type')     || undefined
  const minPrice = parseInt(searchParams.get('minPrice') || '0')
  const maxPrice = parseInt(searchParams.get('maxPrice') || '999999')
  const landlord = searchParams.get('landlord') || undefined
  const page     = parseInt(searchParams.get('page')  || '1')
  const limit    = parseInt(searchParams.get('limit') || '20')
  const offset   = (page - 1) * limit

  try {
    // Build filters
    const where = {
      deletedAt: null,
      status: 'AVAILABLE',
      ...(city     && { city }),
      ...(district && { district }),
      ...(type     && { type }),
      ...(landlord && { ownerId: landlord }),
      price: { gte: minPrice, lte: maxPrice },
      ...(keyword && {
        OR: [
          { title:       { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
          { district:    { contains: keyword, mode: 'insensitive' } },
          { city:        { contains: keyword, mode: 'insensitive' } },
          { amenities:   { some: { name: { contains: keyword, mode: 'insensitive' } } } },
        ],
      }),
    }

    const [properties, total] = await Promise.all([
      db.property.findMany({
        where,
        include: {
          landlord: { select: { id: true, name: true, handle: true, avatar: true, verified: true, avgRating: true } },
          images:   { where: { isCover: true }, take: 1 },
          amenities: { take: 5 },
        },
        orderBy: [
          { boostPlan: 'desc' },
          { featured: 'desc' },
          { createdAt: 'desc' },
        ],
        skip:  offset,
        take:  limit,
      }),
      db.property.count({ where }),
    ])

    // Shape response
    const cards = properties.map(p => ({
      id:               p.id,
      landlordId:       p.landlord.id,
      landlordName:     p.landlord.name,
      landlordHandle:   p.landlord.handle,
      landlordAvatar:   p.landlord.avatar,
      landlordVerified: p.landlord.verified,
      landlordRating:   p.landlord.avgRating,
      title:            p.title,
      type:             p.type,
      status:           p.status,
      featured:         p.featured,
      city:             p.city,
      district:         p.district,
      size:             p.size,
      price:            p.price,
      coverUrl:         p.images[0]?.url ?? null,
      tags:             p.amenities.map(a => a.name),
      favoriteCount:    p.favoriteCount,
      createdAt:        p.createdAt,
    }))

    return NextResponse.json({
      properties: cards,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/properties error:', error)
    return NextResponse.json({ error: '搜尋失敗，請稍後再試' }, { status: 500 })
  }
}

export async function POST(request) {
  // 刊登新房源（需驗證登入 + 房東角色）
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'TENANT') {
    return NextResponse.json({ error: '請先登入房東帳號' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const property = await db.property.create({
      data: {
        landlordId:  session.user.id,
        title:       body.title,
        type:        body.type,
        description: body.description,
        city:        body.city,
        district:    body.district,
        address:     body.address,
        size:        parseFloat(body.size),
        floor:       body.floor,
        price:       parseInt(body.price),
        deposit:     body.deposit,
        mgmtFee:     parseInt(body.mgmtFee || 0),
        inclWifi:    !!body.inclWifi,
        inclWater:   !!body.inclWater,
        inclCable:   !!body.inclCable,
        allowPets:   !!body.allowPets,
        allowCook:   !!body.allowCook,
        status:      'PENDING',  // 需審核
      },
    })
    return NextResponse.json({ id: property.id }, { status: 201 })
  } catch (error) {
    console.error('POST /api/properties error:', error)
    return NextResponse.json({ error: '刊登失敗，請稍後再試' }, { status: 500 })
  }
}
