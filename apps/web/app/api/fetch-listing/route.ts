import { NextRequest, NextResponse } from 'next/server';
import { fetchListing } from '@/lib/parseListing';
import { detectListingSite } from '@/lib/parseListingHtml';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = typeof body.url === 'string' ? body.url.trim() : '';

    if (!url) {
      return NextResponse.json(
        { error: 'URL обязателен' },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Некорректный URL' },
        { status: 400 }
      );
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Поддерживаются только HTTP(S) ссылки' },
        { status: 400 }
      );
    }

    if (!detectListingSite(url)) {
      return NextResponse.json(
        { error: 'Поддерживаются только Avito, Auto.ru и Drom' },
        { status: 400 }
      );
    }

    const data = await fetchListing(url);

    if (!data) {
      return NextResponse.json(
        { error: 'Не удалось загрузить объявление. Попробуйте скопировать текст вручную.' },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
