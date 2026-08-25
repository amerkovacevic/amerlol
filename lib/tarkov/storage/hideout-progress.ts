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

export function saveHideoutProgress(mode: TarkovGameMode, progress: HideoutProgress): void {
  if (typeof window === "undefined") return
  const previous = loadHideoutProgress(mode)
  const normalized = Object.fromEntries(
    Object.entries(progress).map(([stationId, level]) => [stationId, Math.max(0, Math.floor(level))])
  )
  window.localStorage.setItem(storageKey(mode), JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent("amerlol:tarkov-progress-changed", { detail: { mode } }))

  void import("@/lib/tarkov/storage/cloud-sync").then(async ({ syncHideoutStation, deleteCloudHideoutStation }) => {
    const stationIds = new Set([...Object.keys(previous), ...Object.keys(normalized)])
    await Promise.all([...stationIds].map((stationId) => {
      const before = previous[stationId]
      const after = normalized[stationId]
      if (after === undefined) return deleteCloudHideoutStation(mode, stationId)
      if (before === after) return Promise.resolve()
      return syncHideoutStation(mode, stationId, after)
    }))
  }).catch(() => undefined)
}

export function saveHideoutStationLevel(mode: TarkovGameMode, stationId: string, level: number): void {
  if (typeof window === "undefined") return
  const current = loadHideoutProgress(mode)
  saveHideoutProgress(mode, { ...current, [stationId]: Math.max(0, Math.floor(level)) })
}

export function resetHideoutProgress(mode: TarkovGameMode): void {
  if (typeof window === "undefined") return
  const current = loadHideoutProgress(mode)
  if (Object.keys(current).length === 0) {
    window.localStorage.removeItem(storageKey(mode))
    window.dispatchEvent(new CustomEvent("amerlol:tarkov-progress-changed", { detail: { mode } }))
    return
  }
  saveHideoutProgress(mode, {})
}
