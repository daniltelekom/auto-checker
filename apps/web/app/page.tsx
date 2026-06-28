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
import { FREE_CHECK_LIMIT } from "@/lib/limits"
import { getOrCreateSessionId, storeSessionId } from "@/lib/session"
import type {
  AnalysisData,
  AnalyzeApiError,
  AnalysisResult,
  ChecksStatus,
} from "@/types"

export default function Page() {
  const [url, setUrl] = useState('')
  const [text, setText] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisData | null>(null)
  const [listingPhotos, setListingPhotos] = useState<string[]>([])
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

  const handleFetchUrl = async () => {
    if (!url) return
    setIsFetching(true)
    setFetchError('')

    try {
      const res = await fetch('/api/fetch-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setFetchError(
          data.error || 'Не удалось загрузить объявление. Попробуйте скопировать текст вручную.'
        )
      } else {
        setText(data.description)
        setListingPhotos(data.photos || [])
      }
    } catch {
      setFetchError('Ошибка сети. Скопируйте текст вручную.')
    } finally {
      setIsFetching(false)
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
          url: url.trim() || undefined,
          photos: listingPhotos.length > 0 ? listingPhotos : undefined,
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

      setResult(normalizeAnalysisResult(data as AnalysisResult, listingPhotos))
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
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Ссылка на объявление</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://www.avito.ru/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg bg-white text-black"
              />
              <button
                onClick={handleFetchUrl}
                disabled={isFetching || !url}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
              >
                {isFetching ? 'Загрузка...' : 'Загрузить'}
              </button>
            </div>
            {fetchError && (
              <p className="text-red-500 text-sm mt-2">{fetchError}</p>
            )}
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium mb-2">Или вставьте текст вручную</label>
          </div>

          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Вставьте текст объявления с Авито, Авто.ру или Дрома..."
            rows={10}
            disabled={isLoading || isFetching}
            className="min-h-48 resize-y text-base"
          />

          <p className="text-muted-foreground text-xs">
            Ctrl+Enter — отправить
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="lg"
              onClick={() => void handleSubmit()}
              disabled={!text.trim() || isLoading || isFetching || checksRemaining <= 0}
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
            <span>Анализирую объявление и фото...</span>
          </div>
        )}

        {result && <AnalysisResultView data={result} />}

        {result?.photo_analysis && result.photo_analysis.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xl font-bold mb-4">📸 Анализ фото ({result.photos_count} фото)</h3>
            <div className="space-y-3">
              {result.photo_analysis.map((analysis, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Фото #{idx + 1}</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      analysis.overallCondition === 'good' ? 'bg-green-100 text-green-800' :
                      analysis.overallCondition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {analysis.overallCondition === 'good' ? 'Хорошо' :
                       analysis.overallCondition === 'fair' ? 'Средне' : 'Плохо'}
                    </span>
                  </div>
                  {analysis.findings && analysis.findings.length > 0 && (
                    <ul className="space-y-1">
                      {analysis.findings.map((f, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-medium">{f.type}:</span> {f.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
