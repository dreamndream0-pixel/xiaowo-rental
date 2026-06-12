# 小蝸出租 · Snail Rental

> 城市裡的小窩・安心回家的地方

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端框架 | Next.js 14 (App Router) |
| 資料庫 ORM | Prisma 5 |
| 資料庫 | PostgreSQL 14+ |
| 認證 | NextAuth.js 4 |
| 圖片儲存 | Cloudinary |
| 部署-前端 | Vercel |
| 部署-資料庫 | Railway / Supabase |

---

## 本地開發環境設定

### 1. 安裝相依套件
```bash
npm install
```

### 2. 設定環境變數
```bash
cp .env.example .env.local
# 編輯 .env.local 填入你的設定值
```

### 3. 設定資料庫

**方法 A：使用 Supabase（推薦初學者）**
1. 前往 https://supabase.com 建立免費專案
2. 複製 Connection string 填入 DATABASE_URL

**方法 B：本機 PostgreSQL**
```bash
createdb xiaowo_db
```

### 4. 建立資料表 + 初始化資料
```bash
# 推送 Prisma Schema 到資料庫
npm run db:push

# 或使用純 SQL（適合生產環境）
psql -U postgres -d xiaowo_db -f prisma/schema.sql

# 植入測試資料
npm run db:seed
```

### 5. 啟動開發伺服器
```bash
npm run dev
# 開啟 http://localhost:3000
```

---

## 專案結構

```
xiaowo/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.js             # 首頁
│   │   ├── listings/
│   │   │   └── page.js         # 房源列表
│   │   ├── property/[id]/
│   │   │   └── page.js         # 房源詳情
│   │   ├── landlord/[handle]/
│   │   │   └── page.js         # 房東個人頁面
│   │   ├── dashboard/
│   │   │   └── page.js         # 房東後台
│   │   └── api/
│   │       ├── auth/           # NextAuth
│   │       ├── properties/     # 房源 CRUD
│   │       ├── landlords/      # 房東資料
│   │       └── upload/         # 圖片上傳
│   ├── components/
│   │   ├── layout/             # Navbar, Footer
│   │   ├── property/           # PropertyCard, PropertyGrid, PropertyDetail
│   │   ├── landlord/           # LandlordProfile
│   │   ├── search/             # SearchBar, FilterBar
│   │   ├── dashboard/          # DashboardLayout
│   │   └── ui/                 # Button, Badge, Toast 等
│   ├── lib/
│   │   ├── db.js               # Prisma Client
│   │   ├── auth.js             # NextAuth 設定
│   │   └── districts.js        # 全台縣市資料
│   ├── types/
│   │   └── index.ts            # TypeScript 型別
│   └── styles/
│       └── globals.css         # 全域樣式 + 設計 Token
├── prisma/
│   ├── schema.prisma           # Prisma ORM Schema
│   ├── schema.sql              # 純 SQL 版本（可直接執行）
│   └── seed.js                 # 測試資料
├── public/
│   └── images/                 # 靜態圖片（Logo 等）
├── .env.example                # 環境變數範本
├── next.config.js
└── package.json
```

---

## 部署到正式環境

### 前端 → Vercel（免費）
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel

# 設定環境變數
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ... 其他環境變數
```

### 資料庫 → Railway（每月約 $5 USD）
1. 前往 https://railway.app
2. 新增 PostgreSQL 服務
3. 複製 DATABASE_URL 填入 Vercel 環境變數
4. 執行 `npm run db:push` 建立資料表

### 圖片 → Cloudinary（免費 25GB）
1. 前往 https://cloudinary.com 申請帳號
2. 填入 CLOUDINARY_* 環境變數

---

## 測試帳號（seed 資料）

| 角色 | Email | 密碼 |
|------|-------|------|
| 房東 | wang@example.com | password123 |
| 房東 | chen@example.com | password123 |
| 管理員 | admin@xiaowo.com.tw | admin_password_change_me |

> ⚠️ 正式上線前請修改管理員密碼！

---

## 預留功能接口

以下功能在資料庫 Schema 已建立資料表，等待前端實作：

- `bookings` 表 → 看房預約系統
- `messages` 表 → 站內訊息
- `reviews` 表 → 評價系統

API 路由預留位置：
- `src/app/api/bookings/` → 預約管理
- `src/app/api/messages/` → 訊息系統
- `src/app/api/reviews/` → 評價系統
