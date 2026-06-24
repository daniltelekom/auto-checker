import { NextRequest, NextResponse } from "next/server"

import {
  getRemainingChecks,
  getSessionCheckCount,
} from "@/lib/checks"

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim()

  if (!sessionId) {
    return NextResponse.json(
      { error: "Параметр session_id обязателен" },
      { status: 400 }
    )
  }

  const usedCount = await getSessionCheckCount(sessionId)

  return NextResponse.json({
    session_id: sessionId,
    checks_used: usedCount,
    checks_remaining: getRemainingChecks(usedCount),
  })
}
