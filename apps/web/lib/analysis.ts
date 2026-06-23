import type { AnalysisData, AnalysisResult, VerdictType } from "@/types"

export function inferVerdictType(verdict: string): VerdictType {
  const text = verdict.toLowerCase()

  if (
    /избегать|не брать|не рекоменд|отказаться|опасно|не стоит/.test(text)
  ) {
    return "negative"
  }

  if (/брать|рекомендую|отличный|стоит покупать|хороший вариант/.test(text)) {
    return "positive"
  }

  return "caution"
}

export function normalizeAnalysisResult(data: AnalysisResult): AnalysisData {
  return {
    price_analysis: data.price_analysis,
    common_issues: data.common_issues ?? [],
    inspection_checklist: data.inspection_checklist ?? [],
    questions_to_seller: data.questions_to_seller ?? [],
    red_flags: data.red_flags ?? [],
    verdict: data.verdict,
    verdict_type: inferVerdictType(data.verdict),
  }
}
