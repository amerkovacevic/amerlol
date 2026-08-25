import type { TarkovGameMode } from "@/lib/tarkov/types"

export type HideoutProgress = Record<string, number>

function storageKey(mode: TarkovGameMode): string {
  return `amerlol:tarkov:hideout:${mode}`
}

export function loadHideoutProgress(mode: TarkovGameMode): HideoutProgress {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(storageKey(mode))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
        .map(([stationId, value]) => [stationId, Math.max(0, Math.floor(value as number))])
    )
  } catch {
    return {}
  }
}

export function saveHideoutStationLevel(mode: TarkovGameMode, stationId: string, level: number): void {
  if (typeof window === "undefined") return
  const current = loadHideoutProgress(mode)
  const next = {
    ...current,
    [stationId]: Math.max(0, Math.floor(level)),
  }
  window.localStorage.setItem(storageKey(mode), JSON.stringify(next))
  window.dispatchEvent(new CustomEvent("amerlol:tarkov-progress-changed"))
}

export function resetHideoutProgress(mode: TarkovGameMode): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(storageKey(mode))
  window.dispatchEvent(new CustomEvent("amerlol:tarkov-progress-changed"))
}
