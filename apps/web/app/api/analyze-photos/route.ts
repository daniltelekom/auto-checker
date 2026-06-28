import { analyzePhotos } from '@/lib/analyzePhoto'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.YANDEX_API_KEY?.trim()
    const folderId = process.env.YANDEX_FOLDER_ID?.trim()
    const cloudId = process.env.YANDEX_CLOUD_ID?.trim()

    if (!apiKey || !folderId || !cloudId) {
      return NextResponse.json(
        { error: 'Yandex API не настроен' },
        { status: 500 }
      )
    }

    const { photos } = await request.json()
    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: 'Нет фото' }, { status: 400 })
    }

    const results = await analyzePhotos(photos, { apiKey, folderId, cloudId }, 4)

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Photo analysis error:', error)
    return NextResponse.json({ error: 'Ошибка анализа фото' }, { status: 500 })
  }
}
