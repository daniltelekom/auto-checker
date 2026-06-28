import { randomUUID } from "crypto"

import { NextRequest, NextResponse } from "next/server"

import {
  FREE_CHECK_LIMIT,
  getRemainingChecks,
  getSessionCheckCount,
  saveCheck,
} from "@/lib/checks"
import { calculateOwnershipCost } from "@/lib/calculateOwnershipCost"
import { getPhotoRedFlags, type PhotoAnalysisResult } from "@/lib/analyzePhoto"
import { checkHistory } from "@/lib/listingHistory"
import { getCarIssues, type CarIssue } from "@/lib/getCarIssues"
import { fetchListing } from "@/lib/parseListing"
import { parseListing, type ParsedListing } from "@/lib/parseListingText"
import { predictBreakdowns } from "@/lib/predictBreakdowns"

type AnalyzeRequestBody = {
  text?: string
  session_id?: string
  url?: string
  photos?: string[]
}

type YandexCompletionResponse = {
  result?: {
    alternatives?: Array<{
      message?: {
        text?: string
      }
    }>
  }
}

type AnalysisResult = {
  price_analysis: string
  common_issues: string[]
  inspection_checklist: string[]
  questions_to_seller: string[]
  red_flags: string[]
  verdict: string
}

const YANDEX_API_URL =
  "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"

const YANDEX_IMAGE_API_URL =
  "https://llm.api.cloud.yandex.net/foundationModels/v1/imageCompletion"

type YandexImageCompletionResponse = {
  result?: {
    alternatives?: Array<{
      message?: {
        text?: string
      }
    }>
  }
}

async function analyzePhoto(photoUrl: string): Promise<PhotoAnalysisResult | null> {
  try {
    const apiKey = process.env.YANDEX_API_KEY?.trim()
    const folderId = process.env.YANDEX_FOLDER_ID?.trim()
    const cloudId = process.env.YANDEX_CLOUD_ID?.trim()

    if (!apiKey || !folderId || !cloudId) {
      return null
    }

    const response = await fetch(YANDEX_IMAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        "x-folder-id": folderId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        modelUri: `gpt://${cloudId}/yandexgpt-lite`,
        completionOptions: { stream: false, temperature: 0.2, maxTokens: 600 },
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: photoUrl } },
              {
                type: "text",
                text: 'Проанализируй фото автомобиля. Найди: 1) Признаки перекраса (разнотон краски, шагрень) 2) Ржавчину 3) Повреждения ЛКП (царапины, вмятины) 4) Кривые зазоры между панелями 5) Износ салона (руль, педали, сиденья). Верни строго JSON: { findings: [{type: string, severity: "low"|"medium"|"high", description: string}], overallCondition: "good"|"fair"|"poor" }',
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    })

    if (!response.ok) {
      console.error("[analyzePhoto] API error:", response.status)
      return null
    }

    const responseData = (await response.json()) as YandexImageCompletionResponse
    const text = responseData.result?.alternatives?.[0]?.message?.text || "{}"
    const trimmed = text.trim()
    const match = trimmed.match(/\{[\s\S]*\}/)
    return JSON.parse(match?.[0] ?? trimmed) as PhotoAnalysisResult
  } catch (error) {
    console.error("Photo analysis error:", error)
    return null
  }
}

const SYSTEM_PROMPT =
  "Ты эксперт-автоподборщик. Тебе даны структурированные данные объявления. Отвечай СТРОГО в формате JSON без markdown."

function formatField(value: string | number | null): string {
  if (value === null) {
    return "не указано"
  }

  return String(value)
}

function buildIssuesBlock(issues: CarIssue[]): string {
  if (issues.length > 0) {
    return `Известные проблемы этой модели из базы данных (учитывай их в анализе):
${issues
  .map(
    (issue) =>
      `- [${issue.severity}] ${issue.issue} (ремонт: ${issue.repair_cost_min}-${issue.repair_cost_max} руб., обычно после ${issue.mileage_threshold} км). ${issue.description}`
  )
  .join("\n")}

`
  }

  return `В базе данных нет информации об этой модели. Дай общий анализ на основе своего опыта.

`
}

function getMileageRedFlags(
  mileage: number | null,
  issues: CarIssue[]
): string[] {
  if (mileage === null) {
    return []
  }

  return issues
    .filter(
      (issue) =>
        (issue.severity === "critical" || issue.severity === "high") &&
        mileage >= issue.mileage_threshold
    )
    .map(
      (issue) =>
        `Пробег ${mileage.toLocaleString("ru-RU")} км достиг порога для проблемы «${issue.issue}» [${issue.severity}]: обычно проявляется после ${issue.mileage_threshold.toLocaleString("ru-RU")} км`
    )
}

function buildUserPrompt(parsed: ParsedListing, issues: CarIssue[]): string {
  const carTitle = [parsed.make, parsed.model].filter(Boolean).join(" ") || "не определено"
  const mileage =
    parsed.mileage !== null
      ? `${parsed.mileage.toLocaleString("ru-RU")} км`
      : "не указан"
  const price =
    parsed.price !== null
      ? `${parsed.price.toLocaleString("ru-RU")} руб`
      : "не указана"

  const issuesBlock = buildIssuesBlock(issues)

  return `Автомобиль: ${carTitle}, ${formatField(parsed.year)} год
Пробег: ${mileage}
Цена: ${price}
Двигатель: ${formatField(parsed.engine)}
КПП: ${formatField(parsed.transmission)}
Владельцев: ${formatField(parsed.owners)}

Описание продавца: ${parsed.description}

${issuesBlock}Выполни анализ и верни JSON строго такого формата:
{
  "price_analysis": "...",
  "common_issues": ["..."],
  "inspection_checklist": ["..."],
  "questions_to_seller": ["..."],
  "red_flags": ["..."],
  "verdict": "..."
}

Инструкции:
- Сравни цену с типичной рыночной для этой модели/года/пробега
- Укажи болячки ИМЕННО этой модели и года
- Учти пробег при прогнозе поломок
- Если пробег подозрительно низкий для года — отметь как красный флаг
- Если цена ниже рынка на 20%+ — отметь как красный флаг`
}

function getYandexConfig():
  | {
      apiKey: string
      folderId: string
      cloudId: string
    }
  | { error: string } {
  const apiKey = process.env.YANDEX_API_KEY?.trim()
  const folderId = process.env.YANDEX_FOLDER_ID?.trim()
  const cloudId = process.env.YANDEX_CLOUD_ID?.trim()

  if (!apiKey) {
    console.error("[analyze][yandex] YANDEX_API_KEY is not set")
    return {
      error:
        "Сервер не настроен: отсутствует YANDEX_API_KEY в apps/web/.env.local",
    }
  }

  if (!folderId) {
    console.error("[analyze][yandex] YANDEX_FOLDER_ID is not set")
    return {
      error:
        "Сервер не настроен: отсутствует YANDEX_FOLDER_ID в apps/web/.env.local",
    }
  }

  if (!cloudId) {
    console.error("[analyze][yandex] YANDEX_CLOUD_ID is not set")
    return {
      error:
        "Сервер не настроен: отсутствует YANDEX_CLOUD_ID в apps/web/.env.local",
    }
  }

  return { apiKey, folderId, cloudId }
}

function getYandexErrorMessage(status: number, errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      message?: string
      error?: { message?: string }
    }
    const apiMessage = parsed.message ?? parsed.error?.message

    if (status === 401 || status === 403) {
      return "Неверный YANDEX_API_KEY или нет доступа к YandexGPT. Проверьте ключ и права сервисного аккаунта."
    }

    if (status === 429) {
      return "Превышен лимит запросов YandexGPT. Попробуйте через минуту."
    }

    if (apiMessage) {
      return `Ошибка YandexGPT API: ${apiMessage}`
    }
  } catch {
    // ignore JSON parse errors
  }

  return "Ошибка при обращении к YandexGPT API"
}

function parseAnalysisJson(content: string): AnalysisResult {
  const trimmed = content.trim()

  try {
    return JSON.parse(trimmed) as AnalysisResult
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)

    if (!match) {
      throw new Error("Failed to extract JSON from API response")
    }

    return JSON.parse(match[0]) as AnalysisResult
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody
    const text = body.text?.trim()
    const url = body.url?.trim() || ''
    const sessionId = body.session_id?.trim() || randomUUID()

    if (!text) {
      return NextResponse.json(
        { error: "Поле text обязательно и не может быть пустым" },
        { status: 400 }
      )
    }

    const usedChecks = await getSessionCheckCount(sessionId)

    if (usedChecks === null) {
      return NextResponse.json(
        { error: "Сервис проверок временно недоступен" },
        { status: 503 }
      )
    }

    if (usedChecks >= FREE_CHECK_LIMIT) {
      return NextResponse.json(
        {
          error: "limit_reached",
          message: "Бесплатный лимит исчерпан",
          session_id: sessionId,
          checks_remaining: 0,
        },
        { status: 429 }
      )
    }

    const config = getYandexConfig()

    if ("error" in config) {
      return NextResponse.json({ error: config.error }, { status: 500 })
    }

    const parsedData = parseListing(text)
    const { make, model, year } = parsedData

    const data = url ? await fetchListing(url) : null

    // Анализ фото
    let photoAnalysis: PhotoAnalysisResult[] = []
    if (data?.photos && data.photos.length > 0) {
      console.log(`Found ${data.photos.length} photos, analyzing first 3...`)
      const photosToAnalyze = data.photos.slice(0, 3)

      for (const photoUrl of photosToAnalyze) {
        try {
          const result = await analyzePhoto(photoUrl)
          if (result) photoAnalysis.push(result)
        } catch (error) {
          console.error("Photo analysis failed:", error)
        }
      }
    }

    const listingHistory = await checkHistory(url, parsedData.price)

    const issues =
      make && model && year !== null
        ? await getCarIssues(make, model, year)
        : []

    const predictions = predictBreakdowns(issues, parsedData.mileage || 0)

    const enginePowerMatch = parsedData.engine?.match(/(\d{2,3})\s*(?:л\.?\s*с|hp)/i)
    const ownershipCost = calculateOwnershipCost({
      enginePower: enginePowerMatch?.[1] ? parseInt(enginePowerMatch[1], 10) : null,
      year: parsedData.year,
      price: parsedData.price,
    })

    console.log("[analyze] Using provider: yandexgpt-lite", {
      make,
      model,
      year,
      issues: issues.length,
    })

    const apiResponse = await fetch(YANDEX_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${config.apiKey}`,
        "x-folder-id": config.folderId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        modelUri: `gpt://${config.cloudId}/yandexgpt-lite`,
        completionOptions: {
          stream: false,
          temperature: 0.3,
          maxTokens: 2000,
        },
        messages: [
          {
            role: "system",
            text: SYSTEM_PROMPT,
          },
          {
            role: "user",
            text: buildUserPrompt(parsedData, issues),
          },
        ],
      }),
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      const errorMessage = getYandexErrorMessage(apiResponse.status, errorText)

      console.error(
        "[analyze][yandex] API error:",
        apiResponse.status,
        errorText
      )

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    const yandexData = (await apiResponse.json()) as YandexCompletionResponse
    const content = yandexData.result?.alternatives?.[0]?.message?.text

    if (!content) {
      console.error("[analyze][yandex] Empty content in response:", yandexData)
      return NextResponse.json(
        { error: "Пустой ответ от YandexGPT API" },
        { status: 500 }
      )
    }

    const analysis = parseAnalysisJson(content)
    const mileageRedFlags = getMileageRedFlags(parsedData.mileage, issues)
    const photoRedFlags = getPhotoRedFlags(photoAnalysis)
    const red_flags = [
      ...new Set([
        ...(analysis.red_flags ?? []),
        ...mileageRedFlags,
        ...photoRedFlags,
      ]),
    ]

    await saveCheck(sessionId)

    return NextResponse.json({
      ...analysis,
      red_flags,
      parsed_data: parsedData,
      known_issues: issues,
      predictions,
      ownership_cost: ownershipCost,
      listing_history: listingHistory,
      photo_analysis: photoAnalysis,
      photos_count: data?.photos?.length || 0,
      session_id: sessionId,
      checks_remaining: getRemainingChecks(usedChecks + 1),
    })
  } catch (error) {
    console.error("[analyze] Unexpected error:", error)
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера при анализе объявления" },
      { status: 500 }
    )
  }
}
