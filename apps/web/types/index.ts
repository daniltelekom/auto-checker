export type VerdictType = "positive" | "caution" | "negative"

export interface AnalysisResult {
  price_analysis: string
  common_issues: string[]
  inspection_checklist: string[]
  questions_to_seller: string[]
  red_flags: string[]
  verdict: string
}

export interface AnalysisData extends AnalysisResult {
  verdict_type: VerdictType
}

export type AnalyzeApiError = {
  error: string
}
