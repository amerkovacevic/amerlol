// localStorage can be missing (server render) or throw (blocked storage, private
// mode quotas). These helpers treat it as best-effort device persistence.

export function readStorage(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Parses a stored JSON value; `undefined` when missing or malformed. Callers validate the shape. */
export function readStoredJson(key: string): unknown {
  const raw = readStorage(key)
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

export function writeStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}
