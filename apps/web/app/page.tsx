"use client"

import { useState, type KeyboardEvent } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"

import { AnalysisResult as AnalysisResultView } from "@/components/AnalysisResult"
import { normalizeAnalysisResult } from "@/lib/analysis"
import type {
  AnalysisData,
  AnalyzeApiError,
  AnalysisResult,
} from "@/types"

export default function Page() {
  const [text, setText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisData | null>(null)

  async function handleSubmit() {
    const trimmedText = text.trim()

    if (!trimmedText || isLoading) {
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmedText,
        }),
      })

      const data = (await response.json()) as AnalysisResult | AnalyzeApiError

      if (!response.ok) {
        const message =
          "error" in data ? data.error : "Не удалось проанализировать объявление"
        alert(message)
        return
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
        </header>

        <section className="space-y-4">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Вставьте текст объявления с Авито, Авто.ру или Дрома..."
            rows={10}
            disabled={isLoading}
            className="min-h-48 resize-y text-base"
          />

          <p className="text-muted-foreground text-xs">
            Ctrl+Enter — отправить
          </p>

          <Button
            variant="default"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => void handleSubmit()}
            disabled={!text.trim() || isLoading}
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
        </section>

        {isLoading && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            <span>Анализирую объявление...</span>
          </div>
        )}

        {result && <AnalysisResultView data={result} />}
      </div>
    </main>
  )
}
