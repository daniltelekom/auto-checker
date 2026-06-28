import * as cheerio from "cheerio"

export type ListingSite = "avito" | "auto.ru" | "drom"

export type ParsedListingPage = {
  title: string
  price: string | null
  year: string | null
  mileage: string | null
  description: string
  seller: string | null
}

export function detectListingSite(url: string): ListingSite | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")

    if (hostname === "avito.ru" || hostname.endsWith(".avito.ru")) {
      return "avito"
    }

    if (hostname === "auto.ru" || hostname.endsWith(".auto.ru")) {
      return "auto.ru"
    }

    if (hostname === "drom.ru" || hostname.endsWith(".drom.ru")) {
      return "drom"
    }
  } catch {
    return null
  }

  return null
}

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return cleanText(match[1])
    }
  }

  return null
}

function extractJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  let result: Record<string, unknown> | null = null

  $("script[type='application/ld+json']").each((_, element) => {
    try {
      const raw = $(element).html()
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as Record<string, unknown> | Record<string, unknown>[]
      const items = Array.isArray(parsed) ? parsed : [parsed]

      for (const item of items) {
        const type = String(item["@type"] ?? "").toLowerCase()

        if (
          type.includes("product") ||
          type.includes("car") ||
          type.includes("vehicle") ||
          item.name
        ) {
          result = item
          return false
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  })

  return result
}

function parsePriceAmount(raw: string | null | undefined): number | null {
  if (!raw) {
    return null
  }

  const cleaned = raw.replace(/[^\d.,]/g, "").replace(",", ".")
  const value = Number(cleaned)

  if (Number.isNaN(value) || value <= 0) {
    return null
  }

  return Math.round(value)
}

function formatRubPrice(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`
}

function extractPrice($: cheerio.CheerioAPI, selectors: string[]): string | null {
  const metaCandidates = [
    $('meta[property="product:price:amount"]').attr("content"),
    $('meta[itemprop="price"]').attr("content"),
    $('[itemprop="price"]').attr("content"),
  ]

  for (const candidate of metaCandidates) {
    const value = parsePriceAmount(candidate)

    if (value && value >= 10_000) {
      return formatRubPrice(value)
    }
  }

  for (const selector of selectors) {
    const text = cleanText($(selector).text())

    if (!text || !/\d/.test(text)) {
      continue
    }

    const value = parsePriceAmount(text)

    if (value && value >= 10_000) {
      return formatRubPrice(value)
    }
  }

  return null
}

function parseFromJsonLd(jsonLd: Record<string, unknown>): Partial<ParsedListingPage> {
  const offers = jsonLd.offers as Record<string, unknown> | undefined
  const seller = jsonLd.seller as Record<string, unknown> | undefined
  const priceValue = parsePriceAmount(String(offers?.price ?? ""))

  return {
    title: cleanText(String(jsonLd.name ?? "")),
    price: priceValue ? formatRubPrice(priceValue) : null,
    description: cleanText(String(jsonLd.description ?? "")),
    seller: seller?.name ? cleanText(String(seller.name)) : null,
  }
}

function parseAvito($: cheerio.CheerioAPI): ParsedListingPage {
  const jsonLd = extractJsonLd($)
  const fromJsonLd = jsonLd ? parseFromJsonLd(jsonLd) : {}

  const title =
    cleanText($('[data-marker="item-view/title-info"] h1').first().text()) ||
    cleanText($("h1[itemprop='name']").first().text()) ||
    cleanText($("h1").first().text()) ||
    fromJsonLd.title ||
    ""

  const price =
    extractPrice($, [
      '[data-marker="item-view/item-price"]',
      '[data-marker="item-price"]',
      '[itemprop="price"]',
    ]) ||
    fromJsonLd.price ||
    null

  const paramsText = cleanText($('[data-marker="item-view/item-params"]').text())
  const fullText = cleanText($("body").text())

  const year =
    firstMatch(paramsText, [/(\d{4})\s*г\.?/i, /выпуск[:\s]*(\d{4})/i]) ||
    firstMatch(fullText, [/(\d{4})\s*г\.?\s*в\.?/i]) ||
    null

  const mileage =
    firstMatch(paramsText, [/([\d\s]+)\s*км/i]) ||
    firstMatch(fullText, [/пробег[:\s]*([\d\s]+)\s*км/i]) ||
    null

  const description =
    cleanText($('[data-marker="item-view/item-description"]').text()) ||
    cleanText($('[data-marker="item-view/item-description"] .styles-module-root').text()) ||
    fromJsonLd.description ||
    ""

  const seller =
    cleanText($('[data-marker="seller-info/name"]').text()) ||
    cleanText($('[data-marker="seller-link/link"]').text()) ||
    fromJsonLd.seller ||
    null

  return { title, price, year, mileage, description, seller }
}

function parseAutoRu($: cheerio.CheerioAPI): ParsedListingPage {
  const jsonLd = extractJsonLd($)
  const fromJsonLd = jsonLd ? parseFromJsonLd(jsonLd) : {}

  const title =
    cleanText($("h1").first().text()) ||
    cleanText($('[data-seo="title"]').text()) ||
    fromJsonLd.title ||
    ""

  const price =
    extractPrice($, [
      '[data-seo="price"]',
      ".OfferPriceCaption__price",
      ".PriceCaption__price",
      '[itemprop="price"]',
    ]) ||
    fromJsonLd.price ||
    null

  const specsText = cleanText(
    $(".CardInfoSummary__summary, .CardInfo__summary, .OfferSummary").text()
  )
  const fullText = cleanText($("body").text())

  const year =
    firstMatch(specsText, [/(\d{4})\s*г/i]) ||
    firstMatch(fullText, [/(\d{4})\s*г/i]) ||
    null

  const mileage =
    firstMatch(specsText, [/([\d\s]+)\s*км/i]) ||
    firstMatch(fullText, [/пробег[:\s]*([\d\s]+)\s*км/i]) ||
    null

  const description =
    cleanText($('[data-seo="description"], .CardDescriptionHTML').text()) ||
    cleanText($(".CardDescription").text()) ||
    fromJsonLd.description ||
    ""

  const seller =
    cleanText($(".OfferSellerInfo__name, .SellerInfo__name").first().text()) ||
    fromJsonLd.seller ||
    null

  return { title, price, year, mileage, description, seller }
}

function parseDrom($: cheerio.CheerioAPI): ParsedListingPage {
  const jsonLd = extractJsonLd($)
  const fromJsonLd = jsonLd ? parseFromJsonLd(jsonLd) : {}

  const title =
    cleanText($("h1").first().text()) ||
    cleanText($('[data-ga-stats-name="title"]').text()) ||
    fromJsonLd.title ||
    ""

  const price =
    extractPrice($, [
      '[data-ga-stats-name="price"]',
      ".price",
      ".auto-price",
      '[itemprop="price"]',
    ]) ||
    fromJsonLd.price ||
    null

  const specsText = cleanText($(".viewbull-summary__plate, .bull-item-info").text())
  const fullText = cleanText($("body").text())

  const year =
    firstMatch(specsText, [/(\d{4})\s*г/i]) ||
    firstMatch(fullText, [/(\d{4})\s*г/i]) ||
    null

  const mileage =
    firstMatch(specsText, [/([\d\s]+)\s*км/i]) ||
    firstMatch(fullText, [/пробег[:\s]*([\d\s]+)\s*км/i]) ||
    null

  const description =
    cleanText($(".bull-item-description, .auto-description, #description").text()) ||
    fromJsonLd.description ||
    ""

  const seller =
    cleanText($(".seller-info__name, .auto-seller__name").first().text()) ||
    fromJsonLd.seller ||
    null

  return { title, price, year, mileage, description, seller }
}

export function parseListingHtml(site: ListingSite, html: string): ParsedListingPage {
  const $ = cheerio.load(html)

  switch (site) {
    case "avito":
      return parseAvito($)
    case "auto.ru":
      return parseAutoRu($)
    case "drom":
      return parseDrom($)
  }
}
