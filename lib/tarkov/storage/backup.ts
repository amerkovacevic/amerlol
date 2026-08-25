import { loadHideoutProgress, resetHideoutProgress, saveHideoutProgress } from "@/lib/tarkov/storage/hideout-progress"
import { loadLocalTarkovProfile, saveLocalTarkovProfile, type LocalTarkovProfile } from "@/lib/tarkov/storage/profile"
import { loadQuestPresence, saveQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress, saveQuestProgress, type QuestProgressMap } from "@/lib/tarkov/storage/quest-progress"
import type { HideoutProgress } from "@/lib/tarkov/storage/hideout-progress"
import type { QuestPresence, TarkovGameMode } from "@/lib/tarkov/types"

const BACKUP_VERSION = 1

export interface TarkovBackup {
  version: number
  exportedAt: string
  mode: TarkovGameMode
  profile: LocalTarkovProfile
  questPresence: Record<string, QuestPresence>
  questProgress: QuestProgressMap
  hideout: HideoutProgress
}

export function createTarkovBackup(mode: TarkovGameMode): TarkovBackup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    mode,
    profile: loadLocalTarkovProfile(mode),
    questPresence: loadQuestPresence(mode),
    questProgress: loadQuestProgress(mode),
    hideout: loadHideoutProgress(mode),
  }
}

export function serializeTarkovBackup(mode: TarkovGameMode): string {
  return JSON.stringify(createTarkovBackup(mode), null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function parseTarkovBackup(raw: string): TarkovBackup {
  const parsed = JSON.parse(raw) as unknown
  if (!isRecord(parsed)) throw new Error("Backup is not a JSON object.")
  if (parsed.version !== BACKUP_VERSION) throw new Error(`Unsupported Tarkov backup version: ${String(parsed.version)}`)
  if (parsed.mode !== "pvp" && parsed.mode !== "pve" && parsed.mode !== "seasonal") throw new Error("Backup has an invalid game mode.")
  if (!isRecord(parsed.profile) || typeof parsed.profile.level !== "number" || (parsed.profile.faction !== "USEC" && parsed.profile.faction !== "BEAR")) {
    throw new Error("Backup profile data is invalid.")
  }
  if (!isRecord(parsed.questPresence) || !isRecord(parsed.questProgress) || !isRecord(parsed.hideout)) {
    throw new Error("Backup progression data is invalid.")
  }

  return parsed as unknown as TarkovBackup
}

export function restoreTarkovBackup(backup: TarkovBackup): void {
  saveLocalTarkovProfile(backup.mode, backup.profile)
  saveQuestPresence(backup.mode, backup.questPresence)
  saveQuestProgress(backup.mode, backup.questProgress)
  saveHideoutProgress(backup.mode, backup.hideout)
}

export function resetTarkovModeProgress(mode: TarkovGameMode): void {
  saveQuestPresence(mode, {})
  saveQuestProgress(mode, {})
  resetHideoutProgress(mode)
  saveLocalTarkovProfile(mode, { level: 1, faction: "USEC" })
}
