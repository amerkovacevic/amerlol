import type { QuestProgress, QuestProgressStatus, TarkovGameMode } from "@/lib/tarkov/types"

export type QuestProgressMap = Record<string, QuestProgress>

function key(mode: TarkovGameMode) {
  return `amerlol:tarkov:quest-progress:${mode}`
}

export function loadQuestProgress(mode: TarkovGameMode): QuestProgressMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(key(mode))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed as QuestProgressMap : {}
  } catch {
    return {}
  }
}

export function saveQuestProgress(mode: TarkovGameMode, progress: QuestProgressMap) {
  if (typeof window === "undefined") return
  const previous = loadQuestProgress(mode)
  window.localStorage.setItem(key(mode), JSON.stringify(progress))
  window.dispatchEvent(new CustomEvent("amerlol:tarkov-progress-changed", { detail: { mode } }))

  void import("@/lib/tarkov/storage/cloud-sync").then(async ({ syncQuestProgressEntry, deleteQuestProgressEntry }) => {
    const ids = new Set([...Object.keys(previous), ...Object.keys(progress)])
    await Promise.all([...ids].map((questId) => {
      const before = previous[questId]
      const after = progress[questId]
      if (!after) return deleteQuestProgressEntry(mode, questId)
      if (JSON.stringify(before) === JSON.stringify(after)) return Promise.resolve()
      return syncQuestProgressEntry(mode, after)
    }))
  }).catch(() => undefined)
}

export function setQuestProgressStatus(progress: QuestProgressMap, questId: string, status: QuestProgressStatus): QuestProgressMap {
  const now = new Date().toISOString()
  const current = progress[questId]
  return {
    ...progress,
    [questId]: {
      questId,
      status,
      completedObjectiveIds: current?.completedObjectiveIds ?? [],
      statusChangedAt: now,
      updatedAt: now,
    },
  }
}

export function toggleObjectiveCompletion(progress: QuestProgressMap, questId: string, objectiveId: string): QuestProgressMap {
  const now = new Date().toISOString()
  const current = progress[questId] ?? {
    questId,
    status: "active" as const,
    completedObjectiveIds: [],
    updatedAt: now,
  }
  const set = new Set(current.completedObjectiveIds)
  if (set.has(objectiveId)) set.delete(objectiveId)
  else set.add(objectiveId)

  return {
    ...progress,
    [questId]: {
      ...current,
      status: current.status === "completed" ? "active" : current.status,
      completedObjectiveIds: [...set],
      updatedAt: now,
    },
  }
}
