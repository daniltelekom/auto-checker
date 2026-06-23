import { NextRequest, NextResponse } from "next/server"

import type { AiProvider } from "@/types"

type AnalyzeRequestBody = {
  text?: string
  provider?: AiProvider
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

type ProviderConfig = {
  url: string
  model: string
  apiKey: string
  headers: Record<string, string>
}

const SYSTEM_PROMPT =
  "Ты эксперт-автоподборщик с 15-летним стажем. Анализируй объявления о продаже б/у автомобилей. Отвечай СТРОГО в формате JSON без markdown, без пояснений, только валидный JSON."

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

function resolveProvider(provider?: AiProvider): AiProvider {
  return provider === "groq" ? "groq" : "openrouter"
}

function getGroqConfig(): ProviderConfig | { error: string } {
  const apiKey = process.env.GROQ_API_KEY?.trim()

  if (!apiKey) {
    console.error("[analyze][groq] GROQ_API_KEY is not set")
    return {
      error:
        "Сервер не настроен для Groq: отсутствует GROQ_API_KEY в apps/web/.env.local",
    }
  }

  return {
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    apiKey,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  }
}

function getOpenRouterConfig(): ProviderConfig | { error: string } {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()

  if (!apiKey) {
    console.error("[analyze][openrouter] OPENROUTER_API_KEY is not set")
    return {
      error:
        "Сервер не настроен для OpenRouter: отсутствует OPENROUTER_API_KEY в apps/web/.env.local",
    }
  }

  return {
    url: "https://openrouter.ai/api/v1/chat/completions",
    model:
      process.env.OPENROUTER_MODEL?.trim() ||
      "meta-llama/llama-3.3-70b-instruct:free",
    apiKey,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vercel.app",
      "X-Title": "AutoChecker",
    },
  }
}

function getGroqErrorMessage(status: number, errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { message?: string }
    }
    const apiMessage = parsed.error?.message

    if (status === 401 || status === 403) {
      return "Неверный или просроченный GROQ_API_KEY. Создайте новый ключ на https://console.groq.com/keys"
    }

    if (status === 429) {
      return "Превышен лимит запросов Groq API. Попробуйте через минуту."
    }

    if (apiMessage) {
      return `Ошибка Groq API: ${apiMessage}`
    }
  } catch {
    // ignore JSON parse errors
  }

  return "Ошибка при обращении к Groq API"
}

function getOpenRouterErrorMessage(status: number, errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { message?: string }
    }
    const apiMessage = parsed.error?.message

    if (status === 401 || status === 403) {
      return "Неверный или просроченный OPENROUTER_API_KEY. Создайте новый ключ на https://openrouter.ai/keys"
    }

    if (status === 429) {
      return "Превышен лимит запросов OpenRouter API. Попробуйте через минуту."
    }

    if (status === 502 && apiMessage?.includes("Invalid URL")) {
      return "OpenRouter не смог подключиться к модели. Попробуйте позже или укажите другую модель в OPENROUTER_MODEL."
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
    const provider = resolveProvider(body.provider)

    if (!text) {
      return NextResponse.json(
        { error: "Поле text обязательно и не может быть пустым" },
        { status: 400 }
      )
    }

    if (body.provider && body.provider !== "groq" && body.provider !== "openrouter") {
      return NextResponse.json(
        { error: "Неизвестный провайдер. Используйте groq или openrouter" },
        { status: 400 }
      )
    }

    console.log(`[analyze] Using provider: ${provider}`)

    const config =
      provider === "groq" ? getGroqConfig() : getOpenRouterConfig()

    if ("error" in config) {
      return NextResponse.json({ error: config.error }, { status: 500 })
    }

    const apiResponse = await fetch(config.url, {
      method: "POST",
      headers: config.headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
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
      const errorMessage =
        provider === "groq"
          ? getGroqErrorMessage(apiResponse.status, errorText)
          : getOpenRouterErrorMessage(apiResponse.status, errorText)

      console.error(
        `[analyze][${provider}] API error:`,
        apiResponse.status,
        errorText
      )

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    const data = (await apiResponse.json()) as ChatCompletionResponse
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.error(`[analyze][${provider}] Empty content in response:`, data)
      return NextResponse.json(
        {
          error:
            provider === "groq"
              ? "Пустой ответ от Groq API"
              : "Пустой ответ от OpenRouter API",
        },
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
