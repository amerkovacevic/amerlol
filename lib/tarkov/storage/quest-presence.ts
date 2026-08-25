import type {
  QuestPresence,
  QuestPresenceStatus,
  TarkovGameMode,
} from "@/lib/tarkov/types"

const STORAGE_VERSION = 1
const STORAGE_PREFIX = "amerlol:tarkov:quest-presence"

interface StoredQuestPresenceEnvelope {
  version: number
  entries: Record<string, QuestPresence>
}

function storageKey(mode: TarkovGameMode): string {
  return `${STORAGE_PREFIX}:${mode}`
}

function validIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function isQuestPresence(value: unknown, expectedQuestId: string): value is QuestPresence {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return record.questId === expectedQuestId
    && (record.status === "not-present" || record.status === "available" || record.status === "active" || record.status === "completed" || record.status === "failed")
    && (record.source === "manual" || record.source === "import" || record.source === "sync")
    && validIsoDate(record.confirmedAt)
    && validIsoDate(record.updatedAt)
}

export function loadQuestPresence(mode: TarkovGameMode): Record<string, QuestPresence> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(storageKey(mode))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    const envelope = parsed as Partial<StoredQuestPresenceEnvelope>
    if (envelope.version !== STORAGE_VERSION || !envelope.entries || typeof envelope.entries !== "object") return {}
    return Object.fromEntries(Object.entries(envelope.entries).filter(([questId, value]) => isQuestPresence(value, questId)))
  } catch {
    return {}
  }
}

export function saveQuestPresence(mode: TarkovGameMode, entries: Record<string, QuestPresence>): void {
  if (typeof window === "undefined") return
  const previous = loadQuestPresence(mode)
  const envelope: StoredQuestPresenceEnvelope = { version: STORAGE_VERSION, entries }
  window.localStorage.setItem(storageKey(mode), JSON.stringify(envelope))
  window.dispatchEvent(new CustomEvent("amerlol:tarkov-progress-changed", { detail: { mode } }))

  void import("@/lib/tarkov/storage/cloud-sync").then(async ({ syncQuestPresenceEntry, deleteQuestPresenceEntry }) => {
    const ids = new Set([...Object.keys(previous), ...Object.keys(entries)])
    await Promise.all([...ids].map((questId) => {
      const before = previous[questId]
      const after = entries[questId]
      if (!after) return deleteQuestPresenceEntry(mode, questId)
      if (JSON.stringify(before) === JSON.stringify(after)) return Promise.resolve()
      return syncQuestPresenceEntry(mode, after)
    }))
  }).catch(() => undefined)
}

export function setQuestPresenceStatus(current: Record<string, QuestPresence>, questId: string, status: QuestPresenceStatus): Record<string, QuestPresence> {
  const now = new Date().toISOString()
  return {
    ...current,
    [questId]: {
      questId,
      status,
      source: "manual",
      confirmedAt: current[questId]?.confirmedAt ?? now,
      updatedAt: now,
    },
  }
}

export function removeQuestPresence(current: Record<string, QuestPresence>, questId: string): Record<string, QuestPresence> {
  const next = { ...current }
  delete next[questId]
  return next
}
