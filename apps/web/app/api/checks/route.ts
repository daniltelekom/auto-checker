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

  if (usedCount === null) {
    return NextResponse.json(
      { error: "checks_unavailable", message: "Сервис проверок временно недоступен" },
      { status: 503 }
    )
  }

  return NextResponse.json({
    session_id: sessionId,
    checks_used: usedCount,
    checks_remaining: getRemainingChecks(usedCount),
  })
}
