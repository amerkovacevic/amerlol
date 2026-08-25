import type { RaidPlanStep } from "@/lib/tarkov/domain/raid-planner"
import type { MapRoutingData, NormalizedPoint, RouteContext, RouteLocation } from "@/lib/tarkov/routing/types"

export type RouteCoordinateSource = "override" | "upstream-world" | "none"

export interface RoutedRaidSteps {
  ordered: RaidPlanStep[]
  geographicCount: number
  fallbackCount: number
  usedSpawn: boolean
  usedExtract: boolean
  coordinateSource: RouteCoordinateSource
  selectedSpawnLocationId?: string
  selectedExtractLocationId?: string
  selectedExtractName?: string
  distanceToExtract?: number
}

interface LocatedStep {
  step: RaidPlanStep
  point: NormalizedPoint
  risk?: number
}

function distance(a: NormalizedPoint, b: NormalizedPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function objectiveLocation(step: RaidPlanStep, data: MapRoutingData): RouteLocation | undefined {
  const ref = data.objectiveRefs.find(
    (entry) => entry.questId === step.questId && entry.objectiveId === step.objectiveId
  )
  if (!ref) return undefined
  return data.locations.find((location) => location.id === ref.locationId)
}

function nearestLocation(from: NormalizedPoint, candidates: LocatedStep[], safer: boolean) {
  let bestIndex = 0
  let bestScore = Number.POSITIVE_INFINITY

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const travel = distance(from, candidate.point)
    const riskPenalty = safer ? (candidate.risk ?? 0) * 0.08 : 0
    const priorityBonus = candidate.step.priority * 0.0005
    const score = travel + riskPenalty - priorityBonus
    if (score < bestScore) {
      bestScore = score
      bestIndex = index
    }
  }

  return bestIndex
}

function nearestExtract(from: NormalizedPoint, extracts: RouteLocation[], safer: boolean): RouteLocation | undefined {
  let selected: RouteLocation | undefined
  let bestScore = Number.POSITIVE_INFINITY

  for (const extract of extracts) {
    const travel = distance(from, extract.point)
    const riskPenalty = safer ? (extract.risk ?? 0) * 0.08 : 0
    const score = travel + riskPenalty
    if (score < bestScore) {
      bestScore = score
      selected = extract
    }
  }

  return selected
}

function splitByOverrideCoordinates(
  steps: readonly RaidPlanStep[],
  data: MapRoutingData
): { located: LocatedStep[]; fallback: RaidPlanStep[] } {
  const located: LocatedStep[] = []
  const fallback: RaidPlanStep[] = []

  for (const step of steps) {
    const location = objectiveLocation(step, data)
    if (location) located.push({ step, point: location.point, risk: location.risk })
    else fallback.push(step)
  }

  return { located, fallback }
}

function splitByWorldCoordinates(
  steps: readonly RaidPlanStep[]
): { located: LocatedStep[]; fallback: RaidPlanStep[] } {
  const located: LocatedStep[] = []
  const fallback: RaidPlanStep[] = []

  for (const step of steps) {
    if (step.routePoint) located.push({ step, point: step.routePoint })
    else fallback.push(step)
  }

  return { located, fallback }
}

export function orderRaidStepsGeographically(
  steps: readonly RaidPlanStep[],
  data: MapRoutingData | undefined,
  context: RouteContext = {}
): RoutedRaidSteps {
  if (steps.length <= 1) {
    return {
      ordered: [...steps],
      geographicCount: steps[0]?.routePoint ? 1 : 0,
      fallbackCount: steps[0]?.routePoint ? 0 : steps.length,
      usedSpawn: false,
      usedExtract: false,
      coordinateSource: steps[0]?.routePoint ? "upstream-world" : "none",
    }
  }

  let located: LocatedStep[] = []
  let fallback: RaidPlanStep[] = []
  let coordinateSource: RouteCoordinateSource = "none"

  if (data) {
    const overrideSplit = splitByOverrideCoordinates(steps, data)
    if (overrideSplit.located.length >= 2) {
      located = overrideSplit.located
      fallback = overrideSplit.fallback
      coordinateSource = "override"
    }
  }

  if (coordinateSource === "none") {
    const worldSplit = splitByWorldCoordinates(steps)
    located = worldSplit.located
    fallback = worldSplit.fallback
    if (located.length > 0) coordinateSource = "upstream-world"
  }

  if (located.length === 0) {
    return {
      ordered: [...steps],
      geographicCount: 0,
      fallbackCount: steps.length,
      usedSpawn: false,
      usedExtract: false,
      coordinateSource: "none",
    }
  }

  const spawn = coordinateSource === "override" && context.spawnLocationId && data
    ? data.locations.find((location) => location.id === context.spawnLocationId && location.kind === "spawn")
    : undefined

  const extracts = coordinateSource === "override" && data
    ? (context.extractLocationIds ?? [])
        .map((id) => data.locations.find((location) => location.id === id && location.kind === "extract"))
        .filter((location): location is RouteLocation => Boolean(location))
    : []

  let cursor = spawn?.point ?? located[0].point
  const remaining = [...located]
  const orderedLocated: RaidPlanStep[] = []
  const safer = context.strategy === "safer-line" && coordinateSource === "override"

  while (remaining.length > 0) {
    const index = nearestLocation(cursor, remaining, safer)
    const [next] = remaining.splice(index, 1)
    orderedLocated.push(next.step)
    cursor = next.point
  }

  const selectedExtract = nearestExtract(cursor, extracts, safer)
  const extractDistance = selectedExtract ? distance(cursor, selectedExtract.point) : undefined

  const sortedFallback = [...fallback].sort((a, b) => b.priority - a.priority)
  const extractLike = sortedFallback.filter((step) => /extract|survive|exit/i.test(step.description))
  const normalFallback = sortedFallback.filter((step) => !/extract|survive|exit/i.test(step.description))

  return {
    ordered: [...orderedLocated, ...normalFallback, ...extractLike],
    geographicCount: orderedLocated.length,
    fallbackCount: fallback.length,
    usedSpawn: Boolean(spawn),
    usedExtract: Boolean(selectedExtract),
    coordinateSource,
    selectedSpawnLocationId: spawn?.id,
    selectedExtractLocationId: selectedExtract?.id,
    selectedExtractName: selectedExtract?.name,
    distanceToExtract: extractDistance,
  }
}
