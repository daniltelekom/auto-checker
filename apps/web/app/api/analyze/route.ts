import { NextRequest, NextResponse } from "next/server"

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_MODEL = "meta-llama/llama-3.1-8b-instruct"

type AnalyzeRequestBody = {
  text?: string
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type AnalysisResult = {
  price_analysis: string
  common_issues: string[]
  inspection_checklist: string[]
  questions_to_seller: string[]
  red_flags: string[]
  verdict: string
}

function buildUserPrompt(text: string): string {
  return `Проанализируй это объявление и верни JSON строго такого формата:
{
  "price_analysis": "анализ цены: адекватна/занижена/завышена и почему (2-3 предложения)",
  "common_issues": ["типичная проблема 1", "типичная проблема 2", ...],
  "inspection_checklist": ["пункт чек-листа 1", "пункт чек-листа 2", ...],
  "questions_to_seller": ["вопрос 1", "вопрос 2", ...],
  "red_flags": ["красный флаг 1", "красный флаг 2", ...],
  "verdict": "общая рекомендация: брать/торговаться/избегать с кратким обоснованием"
}

Объявление: ${text}`
}

function getApiErrorMessage(status: number, errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { message?: string }
    }
    const apiMessage = parsed.error?.message

    if (status === 401 || status === 403) {
      return "Неверный или просроченный OPENROUTER_API_KEY. Создайте новый ключ на https://openrouter.ai/keys и обновите apps/web/.env.local"
    }

    if (status === 429) {
      return "Превышен лимит запросов OpenRouter API. Попробуйте через минуту."
    }

    if (apiMessage) {
      return `Ошибка OpenRouter API: ${apiMessage}`
    }
  } catch {
    // ignore JSON parse errors
  }

  return "Ошибка при обращении к OpenRouter API"
}

function parseAnalysisJson(content: string): AnalysisResult {
  try {
    return JSON.parse(content) as AnalysisResult
  } catch {
    const match = content.match(/\{[\s\S]*\}/)

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

    const apiKey = process.env.OPENROUTER_API_KEY?.trim()

    if (!apiKey) {
      console.error("[analyze] OPENROUTER_API_KEY is not set")
      return NextResponse.json(
        { error: "Сервер не настроен: отсутствует OPENROUTER_API_KEY" },
        { status: 500 }
      )
    }

    const apiResponse = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Ты эксперт-автоподборщик с 15-летним стажем. Анализируй объявления о продаже б/у автомобилей. Отвечай СТРОГО в формате JSON без markdown, без пояснений, только валидный JSON.",
          },
          {
            role: "user",
            content: buildUserPrompt(text),
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      const errorMessage = getApiErrorMessage(apiResponse.status, errorText)
      console.error(
        "[analyze] OpenRouter API error:",
        apiResponse.status,
        errorText
      )
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    const data = (await apiResponse.json()) as ChatCompletionResponse
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.error("[analyze] Empty content in OpenRouter response:", data)
      return NextResponse.json(
        { error: "Пустой ответ от OpenRouter API" },
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
