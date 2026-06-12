// src/types/index.ts

export type UserRole = 'TENANT' | 'LANDLORD' | 'ADMIN'
export type PropertyType = 'SUITE' | 'ROOM' | 'WHOLE_FLOOR' | 'SHARED_SUITE'
export type PropertyStatus = 'PENDING' | 'AVAILABLE' | 'RENTED' | 'PAUSED' | 'REJECTED'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  SUITE:        '套房',
  ROOM:         '雅房',
  WHOLE_FLOOR:  '整層住家',
  SHARED_SUITE: '分租套房',
}

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  PENDING:   '審核中',
  AVAILABLE: '可租',
  RENTED:    '已租',
  PAUSED:    '暫停刊登',
  REJECTED:  '審核未通過',
}

// ── API Response types ────────────────────────
export interface PropertyCard {
  id:             string
  landlordId:     string
  landlordName:   string
  landlordHandle: string
  landlordAvatar: string | null
  landlordVerified: boolean
  landlordRating: number | null
  title:          string
  type:           PropertyType
  status:         PropertyStatus
  featured:       boolean
  city:           string
  district:       string
  size:           number
  price:          number
  coverUrl:       string | null
  tags:           string[]       // derived from amenities + inclusions
  favoriteCount:  number
  createdAt:      string
}

export interface PropertyDetail extends PropertyCard {
  description:    string
  address:        string         // 僅授權後顯示
  floor:          string | null
  deposit:        string
  mgmtFee:        number
  inclWifi:       boolean
  inclWater:      boolean
  inclCable:      boolean
  allowPets:      boolean
  allowCook:      boolean
  allowShortTerm: boolean
  welcomeStudent: boolean
  images:         PropertyImage[]
  amenities:      string[]
  lat:            number | null
  lng:            number | null
}

export interface PropertyImage {
  id:       string
  url:      string
  order:    number
  isCover:  boolean
}

export interface LandlordProfile {
  id:            string
  name:          string
  handle:        string
  avatar:        string | null
  bio:           string | null
  verified:      boolean
  yearsActive:   number
  avgRating:     number | null
  reviewCount:   number
  totalListings: number
  lineId:        string | null
}

export interface SearchParams {
  keyword?:  string
  city?:     string
  district?: string
  type?:     string
  minPrice?: number
  maxPrice?: number
  page?:     number
  limit?:    number
}

export interface SearchResult {
  properties:  PropertyCard[]
  total:       number
  page:        number
  totalPages:  number
}
