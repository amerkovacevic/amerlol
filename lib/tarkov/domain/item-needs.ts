import type { QuestProgress, QuestPresence, TarkovFaction, TarkovQuest } from "@/lib/tarkov/types"

export interface QuestItemNeed {
  itemId: string
  count: number
  foundInRaid: boolean
  questIds: string[]
  objectiveIds: string[]
}

export interface FutureQuestItemNeed extends QuestItemNeed {
  minimumLevel: number
  bucket: "soon" | "later"
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

function questMatchesFaction(quest: TarkovQuest, faction: TarkovFaction): boolean {
  const factionRequirements = quest.requirements.filter((requirement) => requirement.type === "faction")
  if (factionRequirements.length === 0) return true
  return factionRequirements.some((requirement) => requirement.faction === faction)
}

function objectiveIsLootRequirement(description: string, foundInRaid: boolean): boolean {
  if (foundInRaid) return true
  return /find|obtain|retrieve|collect|hand over|turn in|deliver/.test(description.toLowerCase())
}

function addNeed(
  byItem: Map<string, QuestItemNeed>,
  quest: TarkovQuest,
  objective: TarkovQuest["objectives"][number]
) {
  const excluded = new Set([...(objective.bringItemIds ?? []), ...(objective.requiredKeyIds ?? [])])
  if (!objectiveIsLootRequirement(objective.description, objective.foundInRaid === true)) return

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
      addNeed(byItem, quest, objective)
    }
  }

  return [...byItem.values()].sort(
    (a, b) => Number(b.foundInRaid) - Number(a.foundInRaid) || b.count - a.count || a.itemId.localeCompare(b.itemId)
  )
}

export function calculateFutureQuestItemNeeds(
  quests: readonly TarkovQuest[],
  progress: ProgressLookup,
  presence: PresenceLookup,
  level: number,
  faction: TarkovFaction,
  soonLevelWindow = 5
): FutureQuestItemNeed[] {
  const currentItemIds = new Set(
    calculateConfirmedQuestItemNeeds(quests, progress, presence).map((entry) => entry.itemId)
  )
  const byItem = new Map<string, FutureQuestItemNeed>()

  for (const quest of quests) {
    const questProgress = progress[quest.id]
    if (questProgress?.status === "completed" || questProgress?.status === "failed") continue
    if (presence[quest.id]?.status === "completed" || presence[quest.id]?.status === "failed") continue
    if (isCurrentConfirmedQuest(quest.id, progress, presence)) continue
    if (!questMatchesFaction(quest, faction)) continue

    const bucket: FutureQuestItemNeed["bucket"] = quest.minimumLevel <= level + soonLevelWindow ? "soon" : "later"

    for (const objective of quest.objectives) {
      if (objective.optional || objective.itemIds.length === 0) continue
      if (!objectiveIsLootRequirement(objective.description, objective.foundInRaid === true)) continue

      const excluded = new Set([...(objective.bringItemIds ?? []), ...(objective.requiredKeyIds ?? [])])
      const count = Math.max(1, objective.count ?? 1)

      for (const itemId of objective.itemIds) {
        if (excluded.has(itemId) || currentItemIds.has(itemId)) continue

        const current = byItem.get(itemId)
        if (current) {
          current.count += count
          current.foundInRaid = current.foundInRaid || objective.foundInRaid === true
          current.minimumLevel = Math.min(current.minimumLevel, quest.minimumLevel)
          if (bucket === "soon") current.bucket = "soon"
          if (!current.questIds.includes(quest.id)) current.questIds.push(quest.id)
          if (!current.objectiveIds.includes(objective.id)) current.objectiveIds.push(objective.id)
        } else {
          byItem.set(itemId, {
            itemId,
            count,
            foundInRaid: objective.foundInRaid === true,
            questIds: [quest.id],
            objectiveIds: [objective.id],
            minimumLevel: quest.minimumLevel,
            bucket,
          })
        }
      }
    }
  }

  return [...byItem.values()].sort(
    (a, b) =>
      (a.bucket === b.bucket ? 0 : a.bucket === "soon" ? -1 : 1) ||
      a.minimumLevel - b.minimumLevel ||
      Number(b.foundInRaid) - Number(a.foundInRaid) ||
      a.itemId.localeCompare(b.itemId)
  )
}
