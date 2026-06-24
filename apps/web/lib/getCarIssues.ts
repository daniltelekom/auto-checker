import { supabase } from "./supabase"

export interface CarIssue {
  id: number
  make: string
  model: string
  year_from: number
  year_to: number
  category: string
  issue: string
  severity: string
  repair_cost_min: number
  repair_cost_max: number
  mileage_threshold: number
  description: string
}

export async function getCarIssues(
  make: string,
  model: string,
  year: number
): Promise<CarIssue[]> {
  if (!make || !model || !year) {
    return []
  }

  const { data, error } = await supabase
    .from("car_issues")
    .select("*")
    .ilike("make", make)
    .ilike("model", model)
    .lte("year_from", year)
    .gte("year_to", year)
    .order("severity", { ascending: false })

  if (error) {
    console.error("Supabase error:", error)
    return []
  }

  return data || []
}
