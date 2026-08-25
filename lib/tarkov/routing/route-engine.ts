import type { RaidPlanStep } from "@/lib/tarkov/domain/raid-planner"
import type { MapRoutingData, NormalizedPoint, RouteContext, RouteLocation } from "@/lib/tarkov/routing/types"

export interface RoutedRaidSteps {
  ordered: RaidPlanStep[]
  geographicCount: number
  fallbackCount: number
  usedSpawn: boolean
  usedExtract: boolean
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

function nearestLocation(
  from: NormalizedPoint,
  candidates: Array<{ step: RaidPlanStep; location: RouteLocation }>,
  safer: boolean
) {
  let bestIndex = 0
  let bestScore = Number.POSITIVE_INFINITY

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const travel = distance(from, candidate.location.point)
    const riskPenalty = safer ? (candidate.location.risk ?? 0) * 0.08 : 0
    // Small priority bonus keeps setup-sensitive objectives slightly favored
    // when two geographic choices are otherwise similar.
    const priorityBonus = candidate.step.priority * 0.0005
    const score = travel + riskPenalty - priorityBonus
    if (score < bestScore) {
      bestScore = score
      bestIndex = index
    }
  }

  return bestIndex
}

export function orderRaidStepsGeographically(
  steps: readonly RaidPlanStep[],
  data: MapRoutingData | undefined,
  context: RouteContext = {}
): RoutedRaidSteps {
  if (!data || steps.length <= 1) {
    return {
      ordered: [...steps],
      geographicCount: 0,
      fallbackCount: steps.length,
      usedSpawn: false,
      usedExtract: false,
    }
  }

  const located: Array<{ step: RaidPlanStep; location: RouteLocation }> = []
  const fallback: RaidPlanStep[] = []

  for (const step of steps) {
    const location = objectiveLocation(step, data)
    if (location) located.push({ step, location })
    else fallback.push(step)
  }

  if (located.length === 0) {
    return {
      ordered: [...steps],
      geographicCount: 0,
      fallbackCount: steps.length,
      usedSpawn: false,
      usedExtract: false,
    }
  }

  const spawn = context.spawnLocationId
    ? data.locations.find((location) => location.id === context.spawnLocationId && location.kind === "spawn")
    : undefined

  const extracts = (context.extractLocationIds ?? [])
    .map((id) => data.locations.find((location) => location.id === id && location.kind === "extract"))
    .filter((location): location is RouteLocation => Boolean(location))

  let cursor = spawn?.point ?? located[0].location.point
  const remaining = [...located]
  const orderedLocated: RaidPlanStep[] = []
  const safer = context.strategy === "safer-line"

  while (remaining.length > 0) {
    const index = nearestLocation(cursor, remaining, safer)
    const [next] = remaining.splice(index, 1)
    orderedLocated.push(next.step)
    cursor = next.location.point
  }

  // Preserve priority ordering for objectives without coordinates. Put
  // extract/survive fallback tasks last so they do not interrupt the route.
  const sortedFallback = [...fallback].sort((a, b) => b.priority - a.priority)
  const extractLike = sortedFallback.filter((step) => /extract|survive|exit/i.test(step.description))
  const normalFallback = sortedFallback.filter((step) => !/extract|survive|exit/i.test(step.description))

  return {
    ordered: [...orderedLocated, ...normalFallback, ...extractLike],
    geographicCount: orderedLocated.length,
    fallbackCount: fallback.length,
    usedSpawn: Boolean(spawn),
    usedExtract: extracts.length > 0,
  }
}
