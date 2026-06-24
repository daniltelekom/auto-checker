import type { CarIssue } from "@/lib/getCarIssues"
import type { ParsedListing } from "@/lib/parseListing"

export type { ParsedListing }

export type { CarIssue }

export type VerdictType = "positive" | "caution" | "negative"

export interface AnalysisResult {
  price_analysis: string
  common_issues: string[]
  inspection_checklist: string[]
  questions_to_seller: string[]
  red_flags: string[]
  verdict: string
  parsed_data: ParsedListing
  known_issues: CarIssue[]
}

export interface AnalysisData extends AnalysisResult {
  verdict_type: VerdictType
}

export type AnalyzeApiError = {
  error: string
}
