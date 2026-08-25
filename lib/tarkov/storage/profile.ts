import type { TarkovFaction, TarkovGameMode } from "@/lib/tarkov/types"

export interface LocalTarkovProfile {
  level: number
  faction: TarkovFaction
}

const DEFAULT_PROFILE: LocalTarkovProfile = {
  level: 1,
  faction: "USEC",
}

function key(mode: TarkovGameMode) {
  return `amerlol:tarkov:profile:${mode}`
}

export function loadLocalTarkovProfile(mode: TarkovGameMode): LocalTarkovProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE

  try {
    const raw = window.localStorage.getItem(key(mode))
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw) as Partial<LocalTarkovProfile>
    const level = Number.isFinite(parsed.level) ? Math.max(1, Math.min(79, Math.floor(parsed.level as number))) : 1
    const faction: TarkovFaction = parsed.faction === "BEAR" ? "BEAR" : "USEC"
    return { level, faction }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function saveLocalTarkovProfile(mode: TarkovGameMode, profile: LocalTarkovProfile) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key(mode), JSON.stringify(profile))
}
