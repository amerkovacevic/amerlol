import type { QuestProgress, QuestPresence, TarkovQuest } from "@/lib/tarkov/types"

export interface RaidPlanStep {
  questId: string
  questName: string
  objectiveId: string
  description: string
  priority: number
  reason: string
}

export interface RaidMapPlan {
  mapId: string
  score: number
  questIds: string[]
  objectives: RaidPlanStep[]
  bringItemIds: string[]
  requiredKeyIds: string[]
  potentialExperience: number
  reasons: string[]
}

export interface RaidPlannerResult {
  best?: RaidMapPlan
  alternatives: RaidMapPlan[]
}

type ProgressLookup = Readonly<Record<string, QuestProgress | undefined>>
type PresenceLookup = Readonly<Record<string, QuestPresence | undefined>>

function objectiveRoutePriority(description: string, bringCount: number, keyCount: number): number {
  const text = description.toLowerCase()
  let score = 50

  // Do deterministic, location/item-sensitive objectives early so deaths waste less setup.
  if (bringCount > 0) score += 25
  if (keyCount > 0) score += 20
  if (/plant|place|stash|mark|repair|install|deliver/.test(text)) score += 18
  if (/locate|visit|find|retrieve|obtain|pick up/.test(text)) score += 12

  // Passive/combat objectives can be progressed while moving between hard objectives.
  if (/kill|eliminate|shoot|headshot|scav|pmc/.test(text)) score -= 8
  if (/extract|survive|exit/.test(text)) score -= 25

  return score
}

function objectiveMapIds(quest: TarkovQuest, objectiveMapIds: string[]): string[] {
  if (objectiveMapIds.length > 0) return objectiveMapIds
  // A single-map quest is safe to attribute when the objective lacks its own map metadata.
  return quest.mapIds.length === 1 ? quest.mapIds : []
}

export function buildRaidPlans(
  quests: readonly TarkovQuest[],
  progress: ProgressLookup,
  presence: PresenceLookup
): RaidPlannerResult {
  const mapPlans = new Map<string, RaidMapPlan>()

  for (const quest of quests) {
    const seen = presence[quest.id]
    if (!seen || seen.status === "not-present" || seen.status === "completed" || seen.status === "failed") continue

    const questProgress = progress[quest.id]
    if (questProgress?.status === "completed" || questProgress?.status === "failed") continue

    const completed = new Set(questProgress?.completedObjectiveIds ?? [])

    for (const objective of quest.objectives) {
      if (objective.optional || completed.has(objective.id)) continue

      const maps = objectiveMapIds(quest, objective.mapIds)
      if (maps.length === 0) continue

      const bringItemIds = objective.bringItemIds ?? []
      const requiredKeyIds = objective.requiredKeyIds ?? []
      const priority = objectiveRoutePriority(objective.description, bringItemIds.length, requiredKeyIds.length)

      for (const mapId of maps) {
        const current = mapPlans.get(mapId) ?? {
          mapId,
          score: 0,
          questIds: [],
          objectives: [],
          bringItemIds: [],
          requiredKeyIds: [],
          potentialExperience: 0,
          reasons: [],
        }

        if (!current.questIds.includes(quest.id)) {
          current.questIds.push(quest.id)
          current.potentialExperience += quest.experience
        }

        current.objectives.push({
          questId: quest.id,
          questName: quest.name,
          objectiveId: objective.id,
          description: objective.description,
          priority,
          reason: priority >= 75
            ? "Do early: requires setup, access, or a carried quest item."
            : priority <= 35
              ? "Do while moving or near extract."
              : "Progress along the main route.",
        })

        current.bringItemIds.push(...bringItemIds)
        current.requiredKeyIds.push(...requiredKeyIds)
        mapPlans.set(mapId, current)
      }
    }
  }

  const plans = [...mapPlans.values()].map((plan) => {
    plan.questIds = [...new Set(plan.questIds)]
    plan.bringItemIds = [...new Set(plan.bringItemIds)]
    plan.requiredKeyIds = [...new Set(plan.requiredKeyIds)]
    plan.objectives.sort((a, b) => b.priority - a.priority || a.questName.localeCompare(b.questName))

    const kappaCount = plan.questIds.reduce((count, id) => count + (quests.find((q) => q.id === id)?.kappaRequired ? 1 : 0), 0)
    plan.score =
      plan.objectives.length * 100 +
      plan.questIds.length * 35 +
      plan.bringItemIds.length * 8 +
      plan.requiredKeyIds.length * 10 +
      kappaCount * 20 +
      Math.min(50, Math.round(plan.potentialExperience / 1000))

    plan.reasons = [
      `${plan.objectives.length} incomplete objective${plan.objectives.length === 1 ? "" : "s"}`,
      `${plan.questIds.length} confirmed quest${plan.questIds.length === 1 ? "" : "s"}`,
      plan.potentialExperience > 0 ? `${plan.potentialExperience.toLocaleString()} quest XP represented` : "Multiple progression opportunities",
    ]

    return plan
  }).sort((a, b) => b.score - a.score || b.objectives.length - a.objectives.length)

  return {
    best: plans[0],
    alternatives: plans.slice(1, 4),
  }
}
