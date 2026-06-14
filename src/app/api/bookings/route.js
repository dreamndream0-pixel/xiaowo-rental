// src/app/api/bookings/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { propertyId, date, timeslot, visitorName, visitorPhone, visitorLineId, note } = await request.json()

    if (!propertyId || !date || !timeslot || !visitorName || !visitorPhone) {
      return NextResponse.json({ error: '請填寫必填欄位' }, { status: 400 })
    }

    // 確認房源存在且可預約
    const property = await db.property.findFirst({
      where: { id: propertyId, deletedAt: null, status: 'AVAILABLE' },
      include: { owner: { select: { id: true, lineChannelToken: true, lineChannelSecret: true, notifyLineUserId: true } } }
    })
    if (!property) {
      return NextResponse.json({ error: '此房源目前無法預約' }, { status: 400 })
    }

    // 建立預約紀錄
    const booking = await db.booking.create({
      data: {
        propertyId,
        date: new Date(date),
        timeslot,
        visitorName,
        visitorPhone,
        visitorLineId: visitorLineId || null,
        note: note || null,
        landlordId: property.ownerId || null,
        status: 'PENDING',
      }
    })

    // 通知房東（LINE）
    await notifyLandlord(property, booking, visitorName, visitorPhone, visitorLineId, date, timeslot)

    return NextResponse.json({ ok: true, bookingId: booking.id }, { status: 201 })
  } catch (e) {
    console.error('POST /api/bookings error:', e)
    return NextResponse.json({ error: '預約失敗，請稍後再試' }, { status: 500 })
  }
}

async function notifyLandlord(property, booking, name, phone, lineId, date, timeslot) {
  const owner = property.owner
  if (!owner?.notifyLineUserId || !owner?.lineChannelToken) return

  const dateStr = new Date(date).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' })
  const msg = `📅 新預約看房通知\n\n🏠 ${property.title}\n📆 ${dateStr} ${timeslot}\n👤 姓名：${name}\n📞 電話：${phone}${lineId ? `\n💬 LINE：${lineId}` : ''}\n\n請至後台確認或聯繫租客。`

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.lineChannelToken}`,
      },
      body: JSON.stringify({
        to: owner.notifyLineUserId,
        messages: [{ type: 'text', text: msg }],
      }),
    })
    if (!res.ok) console.error('LINE 通知失敗:', await res.text())
  } catch (e) {
    console.error('LINE 通知失敗:', e.message)
  }
}
