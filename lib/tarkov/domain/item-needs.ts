import type { QuestProgress, QuestPresence, TarkovQuest } from "@/lib/tarkov/types"

export interface QuestItemNeed {
  itemId: string
  count: number
  foundInRaid: boolean
  questIds: string[]
  objectiveIds: string[]
}

type ProgressLookup = Readonly<Record<string, QuestProgress | undefined>>
type PresenceLookup = Readonly<Record<string, QuestPresence | undefined>>

function isCurrentConfirmedQuest(
  questId: string,
  progress: ProgressLookup,
  presence: PresenceLookup
): boolean {
  const seen = presence[questId]
  const state = progress[questId]
  if (!seen || seen.status === "not-present" || seen.status === "completed" || seen.status === "failed") return false
  if (state?.status === "completed" || state?.status === "failed") return false
  return true
}

export function calculateConfirmedQuestItemNeeds(
  quests: readonly TarkovQuest[],
  progress: ProgressLookup,
  presence: PresenceLookup
): QuestItemNeed[] {
  const byItem = new Map<string, QuestItemNeed>()

  for (const quest of quests) {
    if (!isCurrentConfirmedQuest(quest.id, progress, presence)) continue

    const completed = new Set(progress[quest.id]?.completedObjectiveIds ?? [])
    for (const objective of quest.objectives) {
      if (objective.optional || completed.has(objective.id) || objective.itemIds.length === 0) continue

      const excluded = new Set([...(objective.bringItemIds ?? []), ...(objective.requiredKeyIds ?? [])])
      const isLootRequirement = objective.foundInRaid === true || /find|obtain|retrieve|collect|hand over|turn in|deliver/.test(objective.description.toLowerCase())
      if (!isLootRequirement) continue

      const count = Math.max(1, objective.count ?? 1)
      for (const itemId of objective.itemIds) {
        if (excluded.has(itemId)) continue
        const current = byItem.get(itemId)
        if (current) {
          current.count += count
          current.foundInRaid = current.foundInRaid || objective.foundInRaid === true
          if (!current.questIds.includes(quest.id)) current.questIds.push(quest.id)
          if (!current.objectiveIds.includes(objective.id)) current.objectiveIds.push(objective.id)
        } else {
          byItem.set(itemId, {
            itemId,
            count,
            foundInRaid: objective.foundInRaid === true,
            questIds: [quest.id],
            objectiveIds: [objective.id],
          })
        }
      }
    }
  }

  return [...byItem.values()].sort(
    (a, b) => Number(b.foundInRaid) - Number(a.foundInRaid) || b.count - a.count || a.itemId.localeCompare(b.itemId)
  )
}
