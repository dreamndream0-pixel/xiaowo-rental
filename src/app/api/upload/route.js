// src/app/api/upload/route.js
import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request) {
  try {
    const data = await request.formData()
    const file = data.get('file')

    if (!file) return NextResponse.json({ error: '未選擇檔案' }, { status: 400 })

    // Convert to base64
    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64, {
      folder:         'xiaowo-rental/properties',
      transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto:good' }],
    })

    return NextResponse.json({
      url:          result.secure_url,
      cloudinaryId: result.public_id,
      width:        result.width,
      height:       result.height,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '上傳失敗，請稍後再試' }, { status: 500 })
  }
}

