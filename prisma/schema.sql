-- ================================================================
--  小蝸出租 PostgreSQL Schema
--  版本: 1.0.0
--  適用: PostgreSQL 14+
--  使用方式: psql -U postgres -d xiaowo_db -f schema.sql
-- ================================================================

-- 建立資料庫 (若尚未建立)
-- CREATE DATABASE xiaowo_db ENCODING 'UTF8';

-- ── Extensions ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- 模糊搜尋

-- ── ENUM Types ──────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('TENANT', 'LANDLORD', 'ADMIN');
CREATE TYPE property_type AS ENUM ('SUITE', 'ROOM', 'WHOLE_FLOOR', 'SHARED_SUITE');
CREATE TYPE property_status AS ENUM ('PENDING', 'AVAILABLE', 'RENTED', 'PAUSED', 'REJECTED');
CREATE TYPE boost_plan AS ENUM ('NONE', 'BASIC', 'PREMIUM');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- ================================================================
--  USERS  使用者（租客 + 房東 + 管理員）
-- ================================================================
CREATE TABLE users (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email           TEXT        UNIQUE NOT NULL,
  email_verified  TIMESTAMPTZ,
  phone           TEXT        UNIQUE,
  password_hash   TEXT,
  role            user_role   NOT NULL DEFAULT 'TENANT',

  -- 個人資料
  name            TEXT        NOT NULL,
  handle          TEXT        UNIQUE,          -- 房東專屬 URL slug
  avatar          TEXT,
  bio             TEXT,
  line_id         TEXT,
  verified        BOOLEAN     NOT NULL DEFAULT FALSE,

  -- 房東統計 (反正規化，加速查詢)
  total_listings  INT         NOT NULL DEFAULT 0,
  avg_rating      NUMERIC(3,2),
  review_count    INT         NOT NULL DEFAULT 0,
  years_active    INT         NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ                    -- 軟刪除
);

CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_handle ON users(handle);
CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_handle_trgm ON users USING GIN (handle gin_trgm_ops);

COMMENT ON TABLE  users                IS '使用者：租客、房東、管理員共用此表，以 role 區分';
COMMENT ON COLUMN users.handle         IS '房東個人頁面 URL 識別碼，例：wang_rental';
COMMENT ON COLUMN users.verified       IS '房東身份認證狀態';
COMMENT ON COLUMN users.total_listings IS '反正規化統計，更新房源時同步更新';

-- ================================================================
--  ACCOUNTS  第三方 OAuth (NextAuth)
-- ================================================================
CREATE TABLE accounts (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,
  provider            TEXT NOT NULL,                 -- 'google' | 'line'
  provider_account_id TEXT NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          INT,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  session_state       TEXT,

  UNIQUE (provider, provider_account_id)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- ================================================================
--  SESSIONS  登入 Session (NextAuth)
-- ================================================================
CREATE TABLE sessions (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_token TEXT        UNIQUE NOT NULL,
  user_id       TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- ================================================================
--  PROPERTIES  房源
-- ================================================================
CREATE TABLE properties (
  id            TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::text,
  landlord_id   TEXT            NOT NULL REFERENCES users(id),

  -- 基本資訊
  title         TEXT            NOT NULL,
  type          property_type   NOT NULL,
  status        property_status NOT NULL DEFAULT 'PENDING',
  featured      BOOLEAN         NOT NULL DEFAULT FALSE,
  description   TEXT            NOT NULL,

  -- 地址
  city          TEXT            NOT NULL,
  district      TEXT            NOT NULL,
  address       TEXT            NOT NULL,     -- 完整地址，加密或僅房東可見
  lat           NUMERIC(10,7),
  lng           NUMERIC(10,7),

  -- 規格
  size          NUMERIC(6,2)    NOT NULL,     -- 坪數
  floor         TEXT,                         -- '3/8'
  total_floors  INT,

  -- 租金
  price         INT             NOT NULL,     -- 月租金（新台幣）
  deposit       TEXT            NOT NULL DEFAULT '兩個月',
  mgmt_fee      INT             NOT NULL DEFAULT 0,

  -- 包含費用
  incl_wifi     BOOLEAN         NOT NULL DEFAULT FALSE,
  incl_water    BOOLEAN         NOT NULL DEFAULT FALSE,
  incl_cable    BOOLEAN         NOT NULL DEFAULT FALSE,

  -- 入住條件
  allow_pets        BOOLEAN     NOT NULL DEFAULT FALSE,
  allow_cook        BOOLEAN     NOT NULL DEFAULT FALSE,
  allow_short_term  BOOLEAN     NOT NULL DEFAULT FALSE,
  welcome_student   BOOLEAN     NOT NULL DEFAULT TRUE,

  -- 曝光方案
  boost_plan    boost_plan      NOT NULL DEFAULT 'NONE',
  boost_until   TIMESTAMPTZ,

  -- 統計
  view_count    INT             NOT NULL DEFAULT 0,
  favorite_count INT            NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_properties_landlord_id  ON properties(landlord_id);
CREATE INDEX idx_properties_city_district ON properties(city, district);
CREATE INDEX idx_properties_status       ON properties(status);
CREATE INDEX idx_properties_price        ON properties(price);
CREATE INDEX idx_properties_type         ON properties(type);
CREATE INDEX idx_properties_featured     ON properties(featured) WHERE featured = TRUE;
CREATE INDEX idx_properties_boost        ON properties(boost_until) WHERE boost_plan != 'NONE';

-- 全文搜尋索引 (title + description)
ALTER TABLE properties ADD COLUMN fts_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(district, '') || ' ' || coalesce(city, ''))
  ) STORED;
CREATE INDEX idx_properties_fts ON properties USING GIN(fts_vector);

COMMENT ON COLUMN properties.address      IS '完整門牌，僅租客預約後或房東確認後顯示';
COMMENT ON COLUMN properties.fts_vector   IS '全文搜尋向量，由 title+description+city+district 自動生成';

-- ================================================================
--  PROPERTY_IMAGES  房源照片
-- ================================================================
CREATE TABLE property_images (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  property_id    TEXT        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url            TEXT        NOT NULL,
  cloudinary_id  TEXT,
  "order"        INT         NOT NULL DEFAULT 0,
  is_cover       BOOLEAN     NOT NULL DEFAULT FALSE,
  width          INT,
  height         INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_images_property_id ON property_images(property_id);
CREATE INDEX idx_property_images_cover ON property_images(property_id) WHERE is_cover = TRUE;

-- ================================================================
--  PROPERTY_AMENITIES  設施設備
-- ================================================================
CREATE TABLE property_amenities (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,

  UNIQUE (property_id, name)
);

CREATE INDEX idx_property_amenities_property_id ON property_amenities(property_id);

-- ================================================================
--  FAVORITES  收藏
-- ================================================================
CREATE TABLE favorites (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, property_id)
);

CREATE INDEX idx_favorites_user_id     ON favorites(user_id);
CREATE INDEX idx_favorites_property_id ON favorites(property_id);

-- ================================================================
--  BOOKINGS  看房預約 (預留功能)
-- ================================================================
CREATE TABLE bookings (
  id            TEXT           PRIMARY KEY DEFAULT gen_random_uuid()::text,
  property_id   TEXT           NOT NULL REFERENCES properties(id),
  tenant_id     TEXT           NOT NULL REFERENCES users(id),

  date          DATE           NOT NULL,
  timeslot      TEXT           NOT NULL,    -- '10:00-11:00'
  status        booking_status NOT NULL DEFAULT 'PENDING',
  note          TEXT,
  reject_reason TEXT,

  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_property_id ON bookings(property_id);
CREATE INDEX idx_bookings_tenant_id   ON bookings(tenant_id);
CREATE INDEX idx_bookings_status      ON bookings(status);
CREATE INDEX idx_bookings_date        ON bookings(date);

-- ================================================================
--  MESSAGES  站內訊息 (預留功能)
-- ================================================================
CREATE TABLE messages (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sender_id   TEXT        NOT NULL REFERENCES users(id),
  receiver_id TEXT        NOT NULL REFERENCES users(id),
  property_id TEXT        REFERENCES properties(id),
  content     TEXT        NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_sender_id   ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_property_id ON messages(property_id);
CREATE INDEX idx_messages_unread      ON messages(receiver_id) WHERE read_at IS NULL;

-- ================================================================
--  REVIEWS  評價 (預留功能)
-- ================================================================
CREATE TABLE reviews (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  property_id  TEXT        NOT NULL REFERENCES properties(id),
  user_id      TEXT        NOT NULL REFERENCES users(id),
  rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content      TEXT,
  is_anonymous BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (property_id, user_id)    -- 每人每房源只能評一次
);

CREATE INDEX idx_reviews_property_id ON reviews(property_id);
CREATE INDEX idx_reviews_user_id     ON reviews(user_id);

-- ================================================================
--  TRIGGERS  自動更新 updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_properties
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_bookings
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_reviews
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ================================================================
--  FUNCTION  搜尋房源（整合全文搜尋 + 篩選）
-- ================================================================
CREATE OR REPLACE FUNCTION search_properties(
  p_city        TEXT    DEFAULT NULL,
  p_district    TEXT    DEFAULT NULL,
  p_keyword     TEXT    DEFAULT NULL,
  p_type        TEXT    DEFAULT NULL,
  p_min_price   INT     DEFAULT 0,
  p_max_price   INT     DEFAULT 999999,
  p_limit       INT     DEFAULT 20,
  p_offset      INT     DEFAULT 0
)
RETURNS TABLE (
  id TEXT, landlord_id TEXT, title TEXT, type property_type,
  status property_status, city TEXT, district TEXT,
  size NUMERIC, price INT, featured BOOLEAN,
  view_count INT, favorite_count INT, created_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.landlord_id, p.title, p.type,
    p.status, p.city, p.district,
    p.size, p.price, p.featured,
    p.view_count, p.favorite_count, p.created_at,
    COUNT(*) OVER() AS total_count
  FROM properties p
  WHERE
    p.deleted_at IS NULL
    AND p.status = 'AVAILABLE'
    AND (p_city     IS NULL OR p.city     = p_city)
    AND (p_district IS NULL OR p.district = p_district)
    AND (p_type     IS NULL OR p.type::text = p_type)
    AND p.price BETWEEN p_min_price AND p_max_price
    AND (
      p_keyword IS NULL
      OR p.fts_vector @@ plainto_tsquery('simple', p_keyword)
    )
  ORDER BY
    p.boost_plan DESC,  -- 曝光方案優先
    p.featured DESC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
--  VIEWS  常用查詢視圖
-- ================================================================

-- 完整房源卡片（含封面照片 + 房東基本資料）
CREATE OR REPLACE VIEW property_cards AS
SELECT
  p.*,
  u.name         AS landlord_name,
  u.handle       AS landlord_handle,
  u.avatar       AS landlord_avatar,
  u.verified     AS landlord_verified,
  u.avg_rating   AS landlord_rating,
  img.url        AS cover_url
FROM properties p
JOIN users u ON p.landlord_id = u.id
LEFT JOIN LATERAL (
  SELECT url FROM property_images
  WHERE property_id = p.id AND is_cover = TRUE
  LIMIT 1
) img ON TRUE
WHERE p.deleted_at IS NULL;

-- 房東個人頁面統計
CREATE OR REPLACE VIEW landlord_stats AS
SELECT
  u.id,
  u.name,
  u.handle,
  u.avatar,
  u.bio,
  u.verified,
  u.years_active,
  COUNT(p.id)          AS active_listings,
  AVG(r.rating)        AS avg_rating,
  COUNT(DISTINCT r.id) AS review_count
FROM users u
LEFT JOIN properties p ON p.landlord_id = u.id AND p.status = 'AVAILABLE' AND p.deleted_at IS NULL
LEFT JOIN reviews r ON r.property_id = p.id
WHERE u.role = 'LANDLORD' AND u.deleted_at IS NULL
GROUP BY u.id;
