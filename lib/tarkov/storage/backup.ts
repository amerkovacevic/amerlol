import { loadHideoutProgress, resetHideoutProgress, saveHideoutProgress } from "@/lib/tarkov/storage/hideout-progress"
import {
  createProgressGeneration,
  loadLocalTarkovProfile,
  saveLocalTarkovProfile,
  type LocalTarkovProfile,
} from "@/lib/tarkov/storage/profile"
import { loadQuestPresence, saveQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress, saveQuestProgress, type QuestProgressMap } from "@/lib/tarkov/storage/quest-progress"
import type { HideoutProgress } from "@/lib/tarkov/storage/hideout-progress"
import type { QuestPresence, QuestProgress, TarkovGameMode } from "@/lib/tarkov/types"

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
  return { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), mode, profile: loadLocalTarkovProfile(mode), questPresence: loadQuestPresence(mode), questProgress: loadQuestProgress(mode), hideout: loadHideoutProgress(mode) }
}

export function serializeTarkovBackup(mode: TarkovGameMode): string { return JSON.stringify(createTarkovBackup(mode), null, 2) }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value) }
function validIsoDate(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)) }
function isPresenceStatus(value: unknown): boolean { return value === "not-present" || value === "available" || value === "active" || value === "completed" || value === "failed" }
function isPresenceSource(value: unknown): boolean { return value === "manual" || value === "import" || value === "sync" }
function validPresenceMap(value: Record<string, unknown>): value is Record<string, QuestPresence> { return Object.entries(value).every(([id, entry]) => isRecord(entry) && entry.questId === id && isPresenceStatus(entry.status) && isPresenceSource(entry.source) && validIsoDate(entry.confirmedAt) && validIsoDate(entry.updatedAt)) }
function validProgressMap(value: Record<string, unknown>): value is Record<string, QuestProgress> { return Object.entries(value).every(([id, entry]) => isRecord(entry) && entry.questId === id && (entry.status === "active" || entry.status === "completed" || entry.status === "failed") && Array.isArray(entry.completedObjectiveIds) && entry.completedObjectiveIds.every((objectiveId) => typeof objectiveId === "string") && validIsoDate(entry.updatedAt) && (entry.statusChangedAt === undefined || validIsoDate(entry.statusChangedAt))) }
function validHideoutMap(value: Record<string, unknown>): value is HideoutProgress { return Object.values(value).every((level) => typeof level === "number" && Number.isFinite(level) && level >= 0) }

export function parseTarkovBackup(raw: string): TarkovBackup {
  const parsed = JSON.parse(raw) as unknown
  if (!isRecord(parsed)) throw new Error("Backup is not a JSON object.")
  if (parsed.version !== BACKUP_VERSION) throw new Error(`Unsupported Tarkov backup version: ${String(parsed.version)}`)
  if (!validIsoDate(parsed.exportedAt)) throw new Error("Backup export timestamp is invalid.")
  if (parsed.mode !== "pvp" && parsed.mode !== "pve" && parsed.mode !== "seasonal") throw new Error("Backup has an invalid game mode.")
  if (!isRecord(parsed.profile) || typeof parsed.profile.level !== "number" || (parsed.profile.faction !== "USEC" && parsed.profile.faction !== "BEAR")) throw new Error("Backup profile data is invalid.")
  if (!Number.isFinite(parsed.profile.level) || parsed.profile.level < 1 || parsed.profile.level > 79) throw new Error("Backup PMC level is invalid.")
  if (parsed.profile.generationId !== undefined && typeof parsed.profile.generationId !== "string") throw new Error("Backup progression generation is invalid.")
  if (parsed.profile.generationStartedAt !== undefined && !validIsoDate(parsed.profile.generationStartedAt)) throw new Error("Backup progression generation timestamp is invalid.")
  if (!isRecord(parsed.questPresence) || !validPresenceMap(parsed.questPresence)) throw new Error("Backup quest-presence data is invalid.")
  if (!isRecord(parsed.questProgress) || !validProgressMap(parsed.questProgress)) throw new Error("Backup quest-progress data is invalid.")
  if (!isRecord(parsed.hideout) || !validHideoutMap(parsed.hideout)) throw new Error("Backup hideout data is invalid.")
  return parsed as unknown as TarkovBackup
}

function reconcileAuthoritativeCloud(mode: TarkovGameMode, profile: LocalTarkovProfile, presence: Record<string, QuestPresence>, progress: QuestProgressMap, hideout: HideoutProgress): void {
  void import("@/lib/tarkov/storage/cloud-sync")
    .then(({ replaceCloudProgress }) => replaceCloudProgress(mode, { profile, presence, progress, hideout }))
    .catch(() => undefined)
}

export function restoreTarkovBackup(backup: TarkovBackup): void {
  // Restores are authoritative snapshots. Rotate generation so stale devices cannot merge older wipe data back in.
  const profile = { ...backup.profile, ...createProgressGeneration() }
  saveLocalTarkovProfile(backup.mode, profile)
  saveQuestPresence(backup.mode, backup.questPresence)
  saveQuestProgress(backup.mode, backup.questProgress)
  saveHideoutProgress(backup.mode, backup.hideout)
  reconcileAuthoritativeCloud(backup.mode, profile, backup.questPresence, backup.questProgress, backup.hideout)
}

export function resetTarkovModeProgress(mode: TarkovGameMode): void {
  const profile = { level: 1, faction: "USEC" as const, ...createProgressGeneration() }
  saveQuestPresence(mode, {})
  saveQuestProgress(mode, {})
  resetHideoutProgress(mode)
  saveLocalTarkovProfile(mode, profile)
  reconcileAuthoritativeCloud(mode, profile, {}, {}, {})
}
