import type { TarkovFaction, TarkovGameMode } from "@/lib/tarkov/types"

export interface LocalTarkovProfile {
  level: number
  faction: TarkovFaction
  generationId?: string
  generationStartedAt?: string
}

const DEFAULT_PROFILE: LocalTarkovProfile = {
  level: 1,
  faction: "USEC",
}

function key(mode: TarkovGameMode) {
  return `amerlol:tarkov:profile:${mode}`
}

export function createProgressGeneration(): Pick<LocalTarkovProfile, "generationId" | "generationStartedAt"> {
  const generationStartedAt = new Date().toISOString()
  const generationId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${generationStartedAt}-${Math.random().toString(36).slice(2)}`
  return { generationId, generationStartedAt }
}

export function loadLocalTarkovProfile(mode: TarkovGameMode): LocalTarkovProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE

  try {
    const raw = window.localStorage.getItem(key(mode))
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw) as Partial<LocalTarkovProfile>
    const level = Number.isFinite(parsed.level) ? Math.max(1, Math.min(79, Math.floor(parsed.level as number))) : 1
    const faction: TarkovFaction = parsed.faction === "BEAR" ? "BEAR" : "USEC"
    const generationId = typeof parsed.generationId === "string" ? parsed.generationId : undefined
    const generationStartedAt = typeof parsed.generationStartedAt === "string" && Number.isFinite(Date.parse(parsed.generationStartedAt))
      ? parsed.generationStartedAt
      : undefined
    return { level, faction, generationId, generationStartedAt }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function saveLocalTarkovProfile(mode: TarkovGameMode, profile: LocalTarkovProfile) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key(mode), JSON.stringify(profile))
  window.dispatchEvent(new CustomEvent("amerlol:tarkov-progress-changed", { detail: { mode } }))
  void import("@/lib/tarkov/storage/cloud-sync")
    .then(({ syncTarkovProfile }) => syncTarkovProfile(mode, profile))
    .catch(() => undefined)
}
