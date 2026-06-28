import { CarIssue } from './getCarIssues'

export interface PredictedBreakdown {
  issue: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentMileage: number
  thresholdMileage: number
  kmUntil: number
  repairCostMin: number
  repairCostMax: number
  priority: 'soon' | 'medium' | 'later'
}

function normalizeIssueSeverity(severity: string): PredictedBreakdown['severity'] {
  const value = severity.toLowerCase()
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
    return value
  }
  return 'medium'
}

export function predictBreakdowns(
  issues: CarIssue[],
  currentMileage: number
): PredictedBreakdown[] {
  if (!currentMileage || issues.length === 0) return []

  return issues
    .map(issue => {
      const kmUntil = issue.mileage_threshold - currentMileage
      let priority: 'soon' | 'medium' | 'later' = 'later'
      if (kmUntil <= 15000) priority = 'soon'
      else if (kmUntil <= 40000) priority = 'medium'

      return {
        issue: issue.issue,
        category: issue.category,
        severity: normalizeIssueSeverity(issue.severity),
        currentMileage,
        thresholdMileage: issue.mileage_threshold,
        kmUntil: Math.max(0, kmUntil),
        repairCostMin: issue.repair_cost_min,
        repairCostMax: issue.repair_cost_max,
        priority
      }
    })
    .filter(p => p.kmUntil >= 0 && p.kmUntil <= 100000)
    .sort((a, b) => {
      if (a.priority === 'soon' && b.priority !== 'soon') return -1
      if (b.priority === 'soon' && a.priority !== 'soon') return 1
      return a.kmUntil - b.kmUntil
    })
}
