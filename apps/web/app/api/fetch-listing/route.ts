import { NextRequest, NextResponse } from "next/server"

import {
  detectListingSite,
  fetchListingFromUrl,
  type ParsedListingPage,
} from "@/lib/parseListingHtml"

type FetchListingRequestBody = {
  url?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FetchListingRequestBody
    const url = body.url?.trim()

    if (!url) {
      return NextResponse.json(
        { error: "Поле url обязательно" },
        { status: 400 }
      )
    }

    let parsedUrl: URL

    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: "Некорректный URL" },
        { status: 400 }
      )
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Поддерживаются только HTTP(S) ссылки" },
        { status: 400 }
      )
    }

    if (!detectListingSite(url)) {
      return NextResponse.json(
        {
          error: "unsupported_site",
          message: "Поддерживаются только Avito, Auto.ru и Drom",
        },
        { status: 400 }
      )
    }

    const listing: ParsedListingPage = await fetchListingFromUrl(url)

    return NextResponse.json(listing)
  } catch (error) {
    console.error("[fetch-listing] failed:", error)

    return NextResponse.json(
      {
        error: "fetch_failed",
        message: "Не удалось загрузить объявление",
      },
      { status: 502 }
    )
  }
}
