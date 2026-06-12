// prisma/seed.js
// 初始化測試資料

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始植入種子資料...')

  // ── 建立房東 ──────────────────────────────────
  const landlord1 = await prisma.user.upsert({
    where: { email: 'wang@example.com' },
    update: {},
    create: {
      email:        'wang@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      role:         'LANDLORD',
      name:         '王小明',
      handle:       'wang_rental',
      bio:          '在台北深耕租屋市場 8 年，旗下所有房源均由本人親自整理，保持整潔、設備完善。',
      verified:     true,
      yearsActive:  8,
    },
  })

  const landlord2 = await prisma.user.upsert({
    where: { email: 'chen@example.com' },
    update: {},
    create: {
      email:        'chen@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      role:         'LANDLORD',
      name:         '陳美珍',
      handle:       'chen_home',
      bio:          '提供高品質長期租屋，注重居住品質與隱私。歡迎上班族與學生。',
      verified:     true,
      yearsActive:  5,
    },
  })

  // ── 建立房源 ──────────────────────────────────
  const property1 = await prisma.property.create({
    data: {
      landlordId:  landlord1.id,
      title:       '大安區溫馨套房・捷運三分鐘',
      type:        'SUITE',
      status:      'AVAILABLE',
      featured:    true,
      description: '位於大安區精華地段，捷運大安站步行約3分鐘。房間採光良好，12坪套房空間寬敞，所有家具家電一應俱全。',
      city:        '台北市',
      district:    '大安區',
      address:     '和平東路二段100號3樓',
      lat:         25.0255,
      lng:         121.5430,
      size:        12,
      floor:       '3/8',
      price:       12000,
      deposit:     '兩個月',
      inclWifi:    true,
      allowCook:   true,
      welcomeStudent: true,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', isCover: true, order: 0 },
          { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', isCover: false, order: 1 },
        ]
      },
      amenities: {
        create: [
          { name: '冷氣' }, { name: '冰箱' }, { name: '洗衣機' },
          { name: '熱水器' }, { name: '床' }, { name: '衣櫃' },
          { name: '書桌' }, { name: '網路' },
        ]
      },
    },
  })

  const property2 = await prisma.property.create({
    data: {
      landlordId:  landlord2.id,
      title:       '板橋精裝套房・新埔捷運旁',
      type:        'SUITE',
      status:      'AVAILABLE',
      featured:    true,
      description: '板橋新埔捷運旁，2023年全新裝潢，現代簡約風格。10坪套房，空間規劃合理。',
      city:        '新北市',
      district:    '板橋區',
      address:     '文化路一段200號4樓',
      size:        10,
      floor:       '4/10',
      price:       9800,
      mgmtFee:     800,
      inclWifi:    true,
      allowPets:   true,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', isCover: true, order: 0 },
        ]
      },
      amenities: {
        create: [
          { name: '冷氣' }, { name: '冰箱' }, { name: '洗衣機' },
          { name: '熱水器' }, { name: '床' }, { name: '衣櫃' }, { name: '網路' },
        ]
      },
    },
  })

  // ── 建立管理員 ────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@xiaowo.com.tw' },
    update: {},
    create: {
      email:        'admin@xiaowo.com.tw',
      passwordHash: await bcrypt.hash('admin_password_change_me', 10),
      role:         'ADMIN',
      name:         '小蝸管理員',
    },
  })

  console.log('✅ 種子資料植入完成！')
  console.log(`   房東: ${landlord1.name} (${landlord1.email})`)
  console.log(`   房東: ${landlord2.name} (${landlord2.email})`)
  console.log(`   房源: ${property1.title}`)
  console.log(`   房源: ${property2.title}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
