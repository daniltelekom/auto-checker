import { NextRequest, NextResponse } from "next/server"

type AnalyzeRequestBody = {
  text?: string
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

const SYSTEM_PROMPT =
  "Ты эксперт-автоподборщик. Анализируй объявления о продаже б/у автомобилей. Отвечай СТРОГО в формате JSON без markdown."

function buildUserPrompt(text: string): string {
  return `Проанализируй объявление и верни JSON:
{price_analysis, common_issues[], inspection_checklist[], questions_to_seller[], red_flags[], verdict}

Объявление: ${text}`
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

    if (!text) {
      return NextResponse.json(
        { error: "Поле text обязательно и не может быть пустым" },
        { status: 400 }
      )
    }

    const config = getYandexConfig()

    if ("error" in config) {
      return NextResponse.json({ error: config.error }, { status: 500 })
    }

    console.log("[analyze] Using provider: yandexgpt-lite")

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
            text: buildUserPrompt(text),
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

    const data = (await apiResponse.json()) as YandexCompletionResponse
    const content = data.result?.alternatives?.[0]?.message?.text

    if (!content) {
      console.error("[analyze][yandex] Empty content in response:", data)
      return NextResponse.json(
        { error: "Пустой ответ от YandexGPT API" },
        { status: 500 }
      )
    }

    const result = parseAnalysisJson(content)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[analyze] Unexpected error:", error)
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера при анализе объявления" },
      { status: 500 }
    )
  }
}
