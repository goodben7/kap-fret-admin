/** Persistance légère des saisies en cours (sessionStorage). */

export function saveFormDraft(key: string, data: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    /* quota / private mode */
  }
}

export function loadFormDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data?: T }
    return (parsed?.data ?? null) as T | null
  } catch {
    return null
  }
}

export function clearFormDraft(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function hasFormDraft(key: string): boolean {
  try {
    return sessionStorage.getItem(key) != null
  } catch {
    return false
  }
}
