import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

import type { AnalysisData, VerdictType } from "@/types"

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

export function AnalysisResult({ data }: AnalysisResultProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 grid gap-4 duration-500 sm:grid-cols-2">
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
