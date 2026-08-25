import { orderRaidStepsGeographically, type RouteCoordinateSource } from "@/lib/tarkov/routing/route-engine"
import type { MapRoutingData, RouteContext, RouteStrategy } from "@/lib/tarkov/routing/types"
import type { QuestObjective, QuestProgress, QuestPresence, TarkovQuest } from "@/lib/tarkov/types"

export interface RaidPlanStep {
  questId: string
  questName: string
  objectiveId: string
  description: string
  priority: number
  reason: string
  /** Horizontal route plane. Upstream world coordinates map X/Z -> X/Y here. */
  routePoint?: { x: number; y: number }
}

export interface RaidPlanItemRequirement {
  itemId: string
  count: number
  foundInRaid: boolean
  questIds: string[]
  objectiveIds: string[]
}

export interface RaidRouteMetadata {
  mode: "geographic" | "partial" | "priority"
  geographicObjectiveCount: number
  fallbackObjectiveCount: number
  usedSpawn: boolean
  usedExtract: boolean
  coordinateSource: RouteCoordinateSource
  selectedSpawnLocationId?: string
  selectedExtractLocationId?: string
  selectedExtractName?: string
  distanceToExtract?: number
}

export interface RaidMapPlan {
  mapId: string
  score: number
  questIds: string[]
  objectives: RaidPlanStep[]
  bringItemIds: string[]
  requiredKeyIds: string[]
  watchForItems: RaidPlanItemRequirement[]
  potentialExperience: number
  reasons: string[]
  route: RaidRouteMetadata
}

export interface RaidPlannerResult {
  best?: RaidMapPlan
  alternatives: RaidMapPlan[]
}

type ProgressLookup = Readonly<Record<string, QuestProgress | undefined>>
type PresenceLookup = Readonly<Record<string, QuestPresence | undefined>>

export interface RaidPlannerOptions {
  routingData?: Readonly<Record<string, MapRoutingData | undefined>>
  routeContextByMap?: Readonly<Record<string, RouteContext | undefined>>
  strategy?: RouteStrategy
}

function objectiveRoutePriority(description: string, bringCount: number, keyCount: number): number {
  const text = description.toLowerCase()
  let score = 50
  if (bringCount > 0) score += 25
  if (keyCount > 0) score += 20
  if (/plant|place|stash|mark|repair|install|deliver/.test(text)) score += 18
  if (/locate|visit|find|retrieve|obtain|pick up/.test(text)) score += 12
  if (/kill|eliminate|shoot|headshot|scav|pmc/.test(text)) score -= 8
  if (/extract|survive|exit/.test(text)) score -= 25
  return score
}

function objectiveMapIds(quest: TarkovQuest, objectiveMapIds: string[]): string[] {
  if (objectiveMapIds.length > 0) return objectiveMapIds
  return quest.mapIds.length === 1 ? quest.mapIds : []
}

function routePointForObjective(objective: QuestObjective, mapId: string): { x: number; y: number } | undefined {
  const points = (objective.worldPositions ?? []).filter((point) => point.mapId === mapId)
  if (points.length === 0) return undefined
  const x = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const z = points.reduce((sum, point) => sum + point.z, 0) / points.length
  return { x, y: z }
}

function mergeWatchForItem(current: RaidPlanItemRequirement[], itemId: string, count: number, foundInRaid: boolean, questId: string, objectiveId: string) {
  const existing = current.find((entry) => entry.itemId === itemId)
  if (existing) {
    existing.count = Math.max(existing.count, count)
    existing.foundInRaid = existing.foundInRaid || foundInRaid
    if (!existing.questIds.includes(questId)) existing.questIds.push(questId)
    if (!existing.objectiveIds.includes(objectiveId)) existing.objectiveIds.push(objectiveId)
    return
  }
  current.push({ itemId, count, foundInRaid, questIds: [questId], objectiveIds: [objectiveId] })
}

function shouldWatchForObjective(description: string, foundInRaid: boolean, itemCount: number): boolean {
  if (itemCount === 0) return false
  if (foundInRaid) return true
  return /find|obtain|retrieve|collect|hand over|turn in|deliver/.test(description.toLowerCase())
}

function scorePlan(
  plan: RaidMapPlan,
  quests: readonly TarkovQuest[],
  strategy: RouteStrategy
): number {
  const kappaCount = plan.questIds.reduce(
    (count, id) => count + (quests.find((q) => q.id === id)?.kappaRequired ? 1 : 0),
    0
  )

  const base =
    plan.objectives.length * 100 +
    plan.questIds.length * 35 +
    plan.bringItemIds.length * 8 +
    plan.requiredKeyIds.length * 10 +
    plan.watchForItems.filter((item) => item.foundInRaid).length * 6

  switch (strategy) {
    case "kappa-focus":
      return base + kappaCount * 120 + Math.min(35, Math.round(plan.potentialExperience / 1500))
    case "fast-xp":
      return base + Math.min(180, Math.round(plan.potentialExperience / 500)) + kappaCount * 10
    case "shortest-line":
      return base + plan.route.geographicObjectiveCount * 20 - plan.route.fallbackObjectiveCount * 10 + kappaCount * 10
    case "safer-line":
      return base + plan.route.geographicObjectiveCount * 12 + kappaCount * 10
    case "max-progression":
    default:
      return base + kappaCount * 20 + Math.min(50, Math.round(plan.potentialExperience / 1000))
  }
}

export function buildRaidPlans(
  quests: readonly TarkovQuest[],
  progress: ProgressLookup,
  presence: PresenceLookup,
  options: RaidPlannerOptions = {}
): RaidPlannerResult {
  const strategy = options.strategy ?? "max-progression"
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
          watchForItems: [],
          potentialExperience: 0,
          reasons: [],
          route: {
            mode: "priority" as const,
            geographicObjectiveCount: 0,
            fallbackObjectiveCount: 0,
            usedSpawn: false,
            usedExtract: false,
            coordinateSource: "none" as const,
          },
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
          routePoint: routePointForObjective(objective, mapId),
          reason: priority >= 75
            ? "Do early: requires setup, access, or a carried quest item."
            : priority <= 35
              ? "Do while moving or near extract."
              : "Progress along the main route.",
        })

        current.bringItemIds.push(...bringItemIds)
        current.requiredKeyIds.push(...requiredKeyIds)

        if (shouldWatchForObjective(objective.description, objective.foundInRaid === true, objective.itemIds.length)) {
          const excluded = new Set([...bringItemIds, ...requiredKeyIds])
          const count = Math.max(1, objective.count ?? 1)
          for (const itemId of objective.itemIds) {
            if (!excluded.has(itemId)) {
              mergeWatchForItem(current.watchForItems, itemId, count, objective.foundInRaid === true, quest.id, objective.id)
            }
          }
        }

        mapPlans.set(mapId, current)
      }
    }
  }

  const plans = [...mapPlans.values()].map((plan) => {
    plan.questIds = [...new Set(plan.questIds)]
    plan.bringItemIds = [...new Set(plan.bringItemIds)]
    plan.requiredKeyIds = [...new Set(plan.requiredKeyIds)]
    plan.watchForItems = plan.watchForItems
      .filter((entry) => !plan.bringItemIds.includes(entry.itemId) && !plan.requiredKeyIds.includes(entry.itemId))
      .sort((a, b) => Number(b.foundInRaid) - Number(a.foundInRaid) || b.count - a.count)

    const priorityOrdered = [...plan.objectives].sort((a, b) => b.priority - a.priority || a.questName.localeCompare(b.questName))
    const mapContext = options.routeContextByMap?.[plan.mapId]
    const routed = orderRaidStepsGeographically(
      priorityOrdered,
      options.routingData?.[plan.mapId],
      { ...mapContext, strategy: mapContext?.strategy ?? strategy }
    )
    plan.objectives = routed.ordered
    plan.route = {
      mode: routed.geographicCount === 0 ? "priority" : routed.fallbackCount === 0 ? "geographic" : "partial",
      geographicObjectiveCount: routed.geographicCount,
      fallbackObjectiveCount: routed.fallbackCount,
      usedSpawn: routed.usedSpawn,
      usedExtract: routed.usedExtract,
      coordinateSource: routed.coordinateSource,
      selectedSpawnLocationId: routed.selectedSpawnLocationId,
      selectedExtractLocationId: routed.selectedExtractLocationId,
      selectedExtractName: routed.selectedExtractName,
      distanceToExtract: routed.distanceToExtract,
    }

    plan.score = scorePlan(plan, quests, strategy)
    plan.reasons = [
      `${plan.objectives.length} incomplete objective${plan.objectives.length === 1 ? "" : "s"}`,
      `${plan.questIds.length} confirmed quest${plan.questIds.length === 1 ? "" : "s"}`,
      plan.potentialExperience > 0 ? `${plan.potentialExperience.toLocaleString()} quest XP represented` : "Multiple progression opportunities",
    ]
    return plan
  }).sort((a, b) => b.score - a.score || b.objectives.length - a.objectives.length)

  return { best: plans[0], alternatives: plans.slice(1, 4) }
}
