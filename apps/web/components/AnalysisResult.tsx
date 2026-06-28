"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  Car,
  Cog,
  Download,
  Loader2,
  Shield,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { downloadReportPdf } from "@/lib/generateReportPdf"
import type { AnalysisData, CarIssue, VerdictType } from "@/types"

type AnalysisResultProps = {
  data: AnalysisData
}

const verdictStyles: Record<VerdictType, string> = {
  positive:
    "border-emerald-500/40 bg-emerald-500/10 dark:border-emerald-400/30 dark:bg-emerald-500/15",
  caution:
    "border-amber-500/40 bg-amber-500/10 dark:border-amber-400/30 dark:bg-amber-500/15",
  negative:
    "border-destructive/40 bg-destructive/10 dark:border-destructive/50 dark:bg-destructive/15",
}

function ListCard({
  title,
  items,
  variant = "default",
}: {
  title: string
  items: string[]
  variant?: "default" | "danger"
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <Card
      className={cn(
        variant === "danger" &&
          "ring-destructive/20 dark:ring-destructive/30"
      )}
    >
      <CardHeader>
        <CardTitle
          className={cn(
            variant === "danger" && "text-destructive"
          )}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li
              key={`${title}-${index}`}
              className="text-muted-foreground flex gap-2.5 leading-relaxed"
            >
              <span
                className={cn(
                  "mt-2 size-1.5 shrink-0 rounded-full",
                  variant === "danger" ? "bg-destructive" : "bg-primary/60"
                )}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function ParsedDataCard({ parsed }: { parsed: AnalysisData["parsed_data"] }) {
  const fields: Array<{ label: string; value: string | null }> = [
    {
      label: "Автомобиль",
      value: [parsed.make, parsed.model].filter(Boolean).join(" ") || null,
    },
    { label: "Год", value: parsed.year ? String(parsed.year) : null },
    {
      label: "Пробег",
      value: parsed.mileage
        ? `${parsed.mileage.toLocaleString("ru-RU")} км`
        : null,
    },
    {
      label: "Цена",
      value: parsed.price
        ? `${parsed.price.toLocaleString("ru-RU")} ₽`
        : null,
    },
    { label: "Двигатель", value: parsed.engine },
    { label: "КПП", value: parsed.transmission },
    { label: "Кузов", value: parsed.bodyType },
    { label: "Цвет", value: parsed.color },
    {
      label: "Владельцев",
      value: parsed.owners !== null ? String(parsed.owners) : null,
    },
  ]

  const knownFields = fields.filter((field) => field.value)

  if (knownFields.length === 0) {
    return null
  }

  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <CardTitle>Данные из объявления</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {knownFields.map((field) => (
            <div key={field.label} className="space-y-1">
              <dt className="text-muted-foreground text-sm">{field.label}</dt>
              <dd className="font-medium">{field.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

const categoryConfig: Record<string, { label: string; icon: LucideIcon }> = {
  engine: { label: "Двигатель", icon: Wrench },
  transmission: { label: "Коробка", icon: Cog },
  suspension: { label: "Подвеска", icon: Car },
  body: { label: "Кузов", icon: Shield },
  electronics: { label: "Электрика", icon: Zap },
}

const severityConfig: Record<
  string,
  { badge: string; border: string; label: string }
> = {
  critical: {
    badge: "bg-red-500/15 text-red-600 dark:text-red-400",
    border: "border-red-500/30",
    label: "Критично",
  },
  high: {
    badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    border: "border-orange-500/30",
    label: "Высокий",
  },
  medium: {
    badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-500/30",
    label: "Средний",
  },
  low: {
    badge: "bg-green-500/15 text-green-700 dark:text-green-400",
    border: "border-green-500/30",
    label: "Низкий",
  },
}

function getCategoryConfig(category: string) {
  const normalized = category.toLowerCase()

  return (
    categoryConfig[normalized] ?? {
      label: category,
      icon: Wrench,
    }
  )
}

function getSeverityConfig(severity: string) {
  const normalized = severity.toLowerCase()

  return (
    severityConfig[normalized] ?? {
      badge: "bg-muted text-muted-foreground",
      border: "border-border",
      label: severity,
    }
  )
}

function KnownIssueItem({ issue }: { issue: CarIssue }) {
  const category = getCategoryConfig(issue.category)
  const severity = getSeverityConfig(issue.severity)
  const CategoryIcon = category.icon

  return (
    <li
      className={cn(
        "border-border bg-card space-y-3 rounded-lg border p-4",
        severity.border
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="bg-muted flex size-8 items-center justify-center rounded-md">
              <CategoryIcon className="size-4" />
            </span>
            <span>{category.label}</span>
          </div>
          <h3 className="text-base leading-snug font-semibold">{issue.issue}</h3>
        </div>

        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium uppercase",
            severity.badge
          )}
        >
          {severity.label}
        </span>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Стоимость ремонта</dt>
          <dd className="font-medium">
            {issue.repair_cost_min.toLocaleString("ru-RU")}–
            {issue.repair_cost_max.toLocaleString("ru-RU")} ₽
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Обычно после</dt>
          <dd className="font-medium">
            {issue.mileage_threshold.toLocaleString("ru-RU")} км
          </dd>
        </div>
      </dl>

      {issue.description && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {issue.description}
        </p>
      )}
    </li>
  )
}

function KnownIssuesCard({ issues }: { issues: AnalysisData["known_issues"] }) {
  if (issues.length === 0) {
    return null
  }

  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <CardTitle>Известные проблемы модели</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {issues.map((issue) => (
            <KnownIssueItem key={issue.id} issue={issue} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function ListingHistoryCard({
  history,
}: {
  history: AnalysisData["listing_history"]
}) {
  if (!history) return null

  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <CardTitle>История объявления</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-sm">На рынке</dt>
            <dd className="font-medium">{history.daysOnMarket} дн.</dd>
          </div>
          {history.avgMarketPrice != null && (
            <div>
              <dt className="text-muted-foreground text-sm">Средняя цена в истории</dt>
              <dd className="font-medium">
                {history.avgMarketPrice.toLocaleString("ru-RU")} ₽
              </dd>
            </div>
          )}
          {history.priceChanges !== 0 && (
            <div>
              <dt className="text-muted-foreground text-sm">Изменение цены</dt>
              <dd className="font-medium">
                {history.priceChanges > 0 ? "+" : ""}
                {history.priceChanges.toLocaleString("ru-RU")} ₽
              </dd>
            </div>
          )}
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          {history.isOverpriced && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              Возможно завышена
            </span>
          )}
          {history.isUnderpriced && (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Возможно занижена
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function OwnershipCostCard({
  cost,
}: {
  cost: AnalysisData["ownership_cost"]
}) {
  if (!cost) return null

  const items = [
    { label: "Налог", value: cost.tax },
    { label: "ОСАГО", value: cost.insurance },
    { label: "ТО и ремонт", value: cost.maintenance },
    { label: "Топливо", value: cost.fuel },
    { label: "Амортизация", value: cost.depreciation },
  ]

  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <CardTitle>Стоимость владения (оценка)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="text-muted-foreground text-sm">{item.label}</dt>
              <dd className="font-medium">
                {item.value.toLocaleString("ru-RU")} ₽/год
              </dd>
            </div>
          ))}
        </dl>
        <div className="border-border border-t pt-3">
          <p className="text-muted-foreground text-sm">Итого в год</p>
          <p className="text-lg font-semibold">
            {cost.totalYear.toLocaleString("ru-RU")} ₽
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              (~{cost.totalMonth.toLocaleString("ru-RU")} ₽/мес)
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

const priorityLabels: Record<string, string> = {
  soon: "Скоро",
  medium: "Средний срок",
  later: "Позже",
}

function PredictionsCard({
  predictions,
}: {
  predictions: AnalysisData["predictions"]
}) {
  if (!predictions || predictions.length === 0) return null

  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <CardTitle>Прогноз поломок</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {predictions.map((prediction, index) => (
            <li
              key={`prediction-${index}`}
              className="border-border rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-medium">{prediction.issue}</h3>
                <span className="bg-muted rounded-full px-2.5 py-1 text-xs font-medium">
                  {priorityLabels[prediction.priority] ?? prediction.priority}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                Через ~{prediction.kmUntil.toLocaleString("ru-RU")} км · ремонт{" "}
                {prediction.repairCostMin.toLocaleString("ru-RU")}–
                {prediction.repairCostMax.toLocaleString("ru-RU")} ₽
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function photoSeverityClass(severity: string) {
  switch (severity) {
    case "high":
      return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
    case "medium":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
    default:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
  }
}

function PhotoAnalysisCard({
  photoAnalysis,
  photosCount,
}: {
  photoAnalysis: AnalysisData["photo_analysis"]
  photosCount: number
}) {
  if (!photoAnalysis || photoAnalysis.length === 0) return null

  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <CardTitle>
          Анализ фото
          {photosCount > 0 && (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              ({photoAnalysis.length} из {photosCount})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {photoAnalysis.map((photoResult, photoIndex) => (
          <div key={`photo-analysis-${photoIndex}`} className="space-y-2">
            <p className="text-sm font-medium">
              Фото {photoIndex + 1}
              {photoResult.overallCondition && (
                <span className="text-muted-foreground ml-2 font-normal">
                  — {photoResult.overallCondition}
                </span>
              )}
            </p>
            {photoResult.findings?.length ? (
              <ul className="space-y-2">
                {photoResult.findings.map((finding, findingIndex) => (
                  <li
                    key={`photo-finding-${photoIndex}-${findingIndex}`}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      photoSeverityClass(finding.severity)
                    )}
                  >
                    <span className="font-medium">{finding.type}</span>
                    <p className="mt-1 leading-relaxed">{finding.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Замечаний не найдено</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function AnalysisResult({ data }: AnalysisResultProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownloadPdf() {
    setIsDownloading(true)

    try {
      await downloadReportPdf(data)
    } catch (error) {
      console.error("[AnalysisResult] PDF generation failed:", error)
      alert("Не удалось сформировать PDF-отчёт. Попробуйте ещё раз.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 grid gap-4 duration-500 sm:grid-cols-2">
      <div className="flex sm:col-span-2">
        <Button
          variant="outline"
          size="lg"
          onClick={() => void handleDownloadPdf()}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <Loader2 className="animate-spin" />
              Формирую PDF...
            </>
          ) : (
            <>
              <Download />
              Скачать PDF отчёт
            </>
          )}
        </Button>
      </div>

      <ParsedDataCard parsed={data.parsed_data} />
      <KnownIssuesCard issues={data.known_issues} />
      <ListingHistoryCard history={data.listing_history} />
      <OwnershipCostCard cost={data.ownership_cost} />
      <PredictionsCard predictions={data.predictions} />
      <PhotoAnalysisCard
        photoAnalysis={data.photo_analysis}
        photosCount={data.photos_count ?? data.photos?.length ?? 0}
      />

      <Card className="sm:col-span-2">
        <CardHeader>
          <CardTitle>Анализ цены</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            {data.price_analysis}
          </p>
        </CardContent>
      </Card>

      <ListCard title="Типичные проблемы" items={data.common_issues} />
      <ListCard title="Чек-лист осмотра" items={data.inspection_checklist} />
      <ListCard title="Вопросы продавцу" items={data.questions_to_seller} />

      {data.red_flags.length > 0 && (
        <ListCard
          title="Красные флаги"
          items={data.red_flags}
          variant="danger"
        />
      )}

      <Card
        className={cn(
          "sm:col-span-2 ring-2",
          verdictStyles[data.verdict_type]
        )}
      >
        <CardHeader>
          <CardTitle>Вердикт</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed font-medium">
            {data.verdict}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
