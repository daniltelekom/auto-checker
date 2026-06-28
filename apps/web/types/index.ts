import type { CostBreakdown } from '@/lib/calculateOwnershipCost'
import type { ListingHistoryResult } from '@/lib/listingHistory'
import type { PhotoAnalysisResult } from '@/lib/analyzePhoto'
import type { PredictedBreakdown } from '@/lib/predictBreakdowns'
import type { ListingData } from '@/lib/parseListing'
import type { CarIssue } from '@/lib/getCarIssues'
import type { ParsedListing } from '@/lib/parseListingText'

export type { ParsedListing, ListingData, CarIssue, PhotoAnalysisResult, PredictedBreakdown, CostBreakdown, ListingHistoryResult }

export type VerdictType = 'positive' | 'caution' | 'negative'

export interface AnalysisResult {
  price_analysis: string
  common_issues: string[]
  inspection_checklist: string[]
  questions_to_seller: string[]
  red_flags: string[]
  verdict: string
  parsed_data: ParsedListing
  known_issues: CarIssue[]
  predictions?: PredictedBreakdown[]
  ownership_cost?: CostBreakdown
  listing_history?: ListingHistoryResult | null
  photo_analysis?: PhotoAnalysisResult[]
  photos_count?: number
}

export interface AnalysisData extends AnalysisResult {
  verdict_type: VerdictType
  photos?: string[]
}

export type AnalyzeApiError = {
  error: string
  message?: string
  session_id?: string
  checks_remaining?: number
}

export type ChecksStatus = {
  session_id: string
  checks_used: number
  checks_remaining: number
  error?: string
}

export type PhotoFinding = {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
}
