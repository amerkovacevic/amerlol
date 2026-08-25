import type {
  DerivedQuestState,
  QuestProgress,
  QuestRequirementStatus,
  TarkovProfile,
  TarkovQuest,
} from "@/lib/tarkov/types"

export interface QuestBlocker {
  type: "level" | "quest" | "faction" | "failed"
  questId?: string
  requiredLevel?: number
  message: string
}

export interface QuestStateResult {
  state: DerivedQuestState
  blockers: QuestBlocker[]
}

export type QuestProgressLookup = Readonly<Record<string, QuestProgress | undefined>>

function progressMatchesRequiredStatus(
  progress: QuestProgress | undefined,
  statuses: readonly QuestRequirementStatus[]
): boolean {
  if (!progress) return false
  return statuses.some((status) => {
    if (status === "completed") return progress.status === "completed"
    if (status === "failed") return progress.status === "failed"
    return false
  })
}

export function calculateQuestState(
  quest: TarkovQuest,
  profile: Pick<TarkovProfile, "level" | "faction">,
  progress: QuestProgressLookup
): QuestStateResult {
  const current = progress[quest.id]

  if (current?.status === "completed") {
    return { state: "completed", blockers: [] }
  }

  if (current?.status === "failed") {
    return {
      state: "failed",
      blockers: [{ type: "failed", questId: quest.id, message: "This quest is marked as failed." }],
    }
  }

  if (current?.status === "active") {
    return { state: "active", blockers: [] }
  }

  const blockers: QuestBlocker[] = []

  if (profile.level < quest.minimumLevel) {
    blockers.push({
      type: "level",
      requiredLevel: quest.minimumLevel,
      message: `Requires PMC level ${quest.minimumLevel}.`,
    })
  }

  if (quest.dependencyRequirements?.length) {
    for (const requirement of quest.dependencyRequirements) {
      if (!progressMatchesRequiredStatus(progress[requirement.questId], requirement.statuses)) {
        const statusText = requirement.statuses.length === 1
          ? requirement.statuses[0]
          : requirement.statuses.join(" or ")
        blockers.push({
          type: "quest",
          questId: requirement.questId,
          message: `Prerequisite quest must be ${statusText}.`,
        })
      }
    }
  } else {
    // Compatibility fallback for normalized records created before branch-aware
    // dependency requirements were introduced.
    for (const prerequisiteQuestId of quest.prerequisiteQuestIds) {
      if (progress[prerequisiteQuestId]?.status !== "completed") {
        blockers.push({
          type: "quest",
          questId: prerequisiteQuestId,
          message: "A prerequisite quest has not been completed.",
        })
      }
    }
  }

  for (const requirement of quest.requirements) {
    if (requirement.type === "faction" && requirement.faction && requirement.faction !== profile.faction) {
      blockers.push({
        type: "faction",
        message: `Only available to ${requirement.faction}.`,
      })
    }
  }

  return blockers.length > 0
    ? { state: "locked", blockers }
    : { state: "available", blockers: [] }
}

export function calculateAvailableQuests(
  quests: readonly TarkovQuest[],
  profile: Pick<TarkovProfile, "level" | "faction">,
  progress: QuestProgressLookup
): TarkovQuest[] {
  return quests.filter((quest) => calculateQuestState(quest, profile, progress).state === "available")
}

export function getDirectUnlocks(quests: readonly TarkovQuest[], questId: string): TarkovQuest[] {
  return quests.filter((quest) =>
    quest.dependencyRequirements?.some((requirement) => requirement.questId === questId)
    || quest.prerequisiteQuestIds.includes(questId)
  )
}

export function getQuestAncestors(quests: readonly TarkovQuest[], questId: string): string[] {
  const byId = new Map(quests.map((quest) => [quest.id, quest]))
  const visited = new Set<string>()
  const visiting = new Set<string>()

  const visit = (currentId: string) => {
    if (visiting.has(currentId)) {
      throw new Error(`Quest dependency cycle detected at ${currentId}`)
    }
    if (visited.has(currentId)) return

    const quest = byId.get(currentId)
    if (!quest) return

    visiting.add(currentId)
    const dependencies = quest.dependencyRequirements?.map((requirement) => requirement.questId)
      ?? quest.prerequisiteQuestIds
    for (const prerequisiteId of dependencies) {
      visit(prerequisiteId)
      visited.add(prerequisiteId)
    }
    visiting.delete(currentId)
  }

  visit(questId)
  visited.delete(questId)
  return [...visited]
}
