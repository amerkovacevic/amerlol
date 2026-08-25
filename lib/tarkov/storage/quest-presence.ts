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

function isQuestPresence(value: unknown): value is QuestPresence {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return (
    typeof record.questId === "string" &&
    typeof record.status === "string" &&
    typeof record.source === "string"
  )
}

export function loadQuestPresence(mode: TarkovGameMode): Record<string, QuestPresence> {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(storageKey(mode))
    if (!raw) return {}

    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}

    const envelope = parsed as Partial<StoredQuestPresenceEnvelope>
    if (envelope.version !== STORAGE_VERSION || !envelope.entries || typeof envelope.entries !== "object") {
      return {}
    }

    return Object.fromEntries(
      Object.entries(envelope.entries).filter(([, value]) => isQuestPresence(value))
    )
  } catch {
    return {}
  }
}

export function saveQuestPresence(
  mode: TarkovGameMode,
  entries: Record<string, QuestPresence>
): void {
  if (typeof window === "undefined") return

  const envelope: StoredQuestPresenceEnvelope = {
    version: STORAGE_VERSION,
    entries,
  }

  window.localStorage.setItem(storageKey(mode), JSON.stringify(envelope))
  window.dispatchEvent(new CustomEvent("amerlol:tarkov-progress-changed", { detail: { mode } }))
}

export function setQuestPresenceStatus(
  current: Record<string, QuestPresence>,
  questId: string,
  status: QuestPresenceStatus
): Record<string, QuestPresence> {
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

export function removeQuestPresence(
  current: Record<string, QuestPresence>,
  questId: string
): Record<string, QuestPresence> {
  const next = { ...current }
  delete next[questId]
  return next
}
