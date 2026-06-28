import { FREE_CHECK_LIMIT, CHECK_WINDOW_DAYS } from "@/lib/limits"
import { supabase } from "@/lib/supabase"

export { FREE_CHECK_LIMIT } from "@/lib/limits"

const CHECK_WINDOW = CHECK_WINDOW_DAYS

function getWindowStart(): string {
  const date = new Date()
  date.setDate(date.getDate() - CHECK_WINDOW)
  return date.toISOString()
}

export async function getSessionCheckCount(sessionId: string): Promise<number | null> {
  if (!supabase) {
    return null
  }

  const { count, error } = await supabase
    .from("checks")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .gt("created_at", getWindowStart())

  if (error) {
    console.error("[checks] count failed:", error)
    return null
  }

  return count ?? 0
}

export function getRemainingChecks(usedCount: number): number {
  return Math.max(0, FREE_CHECK_LIMIT - usedCount)
}

export async function saveCheck(sessionId: string): Promise<boolean> {
  if (!supabase) {
    return false
  }

  const { error } = await supabase.from("checks").insert({ session_id: sessionId })

  if (error) {
    console.error("[checks] insert failed:", error)
    return false
  }

  return true
}
