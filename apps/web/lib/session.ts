const SESSION_STORAGE_KEY = "autochecker_session_id"

export function getStoredSessionId(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(SESSION_STORAGE_KEY)
}

export function getOrCreateSessionId(): string {
  const stored = getStoredSessionId()

  if (stored) {
    return stored
  }

  const sessionId = crypto.randomUUID()
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  return sessionId
}

export function storeSessionId(sessionId: string): void {
  if (typeof window === "undefined") {
    return
  }

  localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
}
