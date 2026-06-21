// src/app/api/landlord/me/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, image: true, role: true },
  })

  if (!user) return NextResponse.json(null)

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email?.endsWith('@xiaowo.local') ? null : user.email,
    phone: user.phone,
    avatar: user.image,
    isSuper: false, // future: user.role === 'SUPER_LANDLORD'
  })
}
