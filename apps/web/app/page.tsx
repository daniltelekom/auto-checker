"use client"

import { useEffect, useState, type KeyboardEvent } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Textarea } from "@workspace/ui/components/textarea"

import { AnalysisResult as AnalysisResultView } from "@/components/AnalysisResult"
import { normalizeAnalysisResult } from "@/lib/analysis"
import { formatListingForTextarea } from "@/lib/parseListingHtml"
import { FREE_CHECK_LIMIT } from "@/lib/limits"
import { getOrCreateSessionId, storeSessionId } from "@/lib/session"
import type {
  AnalysisData,
  AnalyzeApiError,
  AnalysisResult,
  ChecksStatus,
  FetchListingResult,
} from "@/types"

export default function Page() {
  const [listingUrl, setListingUrl] = useState("")
  const [text, setText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingListing, setIsFetchingListing] = useState(false)
  const [result, setResult] = useState<AnalysisData | null>(null)
  const [checksRemaining, setChecksRemaining] = useState(FREE_CHECK_LIMIT)
  const [showLimitModal, setShowLimitModal] = useState(false)

  useEffect(() => {
    async function loadChecksStatus() {
      const sessionId = getOrCreateSessionId()

      try {
        const response = await fetch(
          `/api/checks?session_id=${encodeURIComponent(sessionId)}`
        )

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as ChecksStatus
        storeSessionId(data.session_id)
        setChecksRemaining(data.checks_remaining)
      } catch (error) {
        console.error("[page] failed to load checks status:", error)
      }
    }

    void loadChecksStatus()
  }, [])

  async function handleFetchListing() {
    const url = listingUrl.trim()

    if (!url || isFetchingListing || isLoading) {
      return
    }

    setIsFetchingListing(true)

    try {
      const response = await fetch("/api/fetch-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      const data = (await response.json()) as FetchListingResult | { error: string }

      if (!response.ok) {
        alert("Не удалось загрузить. Скопируйте текст вручную")
        return
      }

      setText(formatListingForTextarea(data as FetchListingResult))
    } catch (error) {
      console.error("[page] fetch listing failed:", error)
      alert("Не удалось загрузить. Скопируйте текст вручную")
    } finally {
      setIsFetchingListing(false)
    }
  }

  async function handleSubmit() {
    const trimmedText = text.trim()

    if (!trimmedText || isLoading) {
      return
    }

    if (checksRemaining <= 0) {
      setShowLimitModal(true)
      return
    }

    setIsLoading(true)
    setResult(null)

    const sessionId = getOrCreateSessionId()

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmedText,
          session_id: sessionId,
        }),
      })

      const data = (await response.json()) as
        | (AnalysisResult & {
            session_id?: string
            checks_remaining?: number
          })
        | AnalyzeApiError

      if ("session_id" in data && data.session_id) {
        storeSessionId(data.session_id)
      }

      if (!response.ok) {
        if ("error" in data && data.error === "limit_reached") {
          setChecksRemaining(data.checks_remaining ?? 0)
          setShowLimitModal(true)
          return
        }

        const message =
          "message" in data && data.message
            ? data.message
            : "error" in data
              ? data.error
              : "Не удалось проанализировать объявление"
        alert(message)
        return
      }

      if ("checks_remaining" in data && data.checks_remaining !== undefined) {
        setChecksRemaining(data.checks_remaining)
      }

      setResult(normalizeAnalysisResult(data as AnalysisResult))
    } catch (error) {
      console.error("[page] analyze request failed:", error)
      alert("Ошибка сети. Проверьте подключение и попробуйте снова.")
    } finally {
      setIsLoading(false)
    }
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <main className="bg-background min-h-svh">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            ИИ-помощник при покупке б/у авто
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Получи полный анализ объявления за 30 секунд
          </p>
          <p className="text-sm font-medium">
            Осталось проверок: {checksRemaining}
          </p>
        </header>

        <section className="space-y-4">
          <input
            type="url"
            value={listingUrl}
            onChange={(event) => setListingUrl(event.target.value)}
            placeholder="https://www.avito.ru/..."
            disabled={isLoading || isFetchingListing}
            className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex h-10 w-full rounded-md border px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />

          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Вставьте текст объявления с Авито, Авто.ру или Дрома..."
            rows={10}
            disabled={isLoading || isFetchingListing}
            className="min-h-48 resize-y text-base"
          />

          <p className="text-muted-foreground text-xs">
            Ctrl+Enter — отправить
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => void handleFetchListing()}
              disabled={!listingUrl.trim() || isLoading || isFetchingListing}
            >
              {isFetchingListing ? (
                <>
                  <Loader2 className="animate-spin" />
                  Загружаю...
                </>
              ) : (
                "Загрузить из ссылки"
              )}
            </Button>

            <Button
              variant="default"
              size="lg"
              onClick={() => void handleSubmit()}
              disabled={!text.trim() || isLoading || isFetchingListing || checksRemaining <= 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Анализирую...
                </>
              ) : (
                "Проанализировать"
              )}
            </Button>
          </div>
        </section>

        {isLoading && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            <span>Анализирую объявление...</span>
          </div>
        )}

        {result && <AnalysisResultView data={result} />}
      </div>

      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Лимит проверок исчерпан</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Полная версия — 290₽
              </p>
              <Button
                className="w-full"
                onClick={() => setShowLimitModal(false)}
              >
                Понятно
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
