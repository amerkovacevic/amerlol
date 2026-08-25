import type { HideoutItemRequirement } from "@/lib/tarkov/adapters/hideout"
import type { HideoutProgress } from "@/lib/tarkov/storage/hideout-progress"

export interface HideoutStationSummary {
  stationId: string
  stationName: string
  currentLevel: number
  maxLevel: number
  nextLevel?: number
  remainingUpgradeLevels: number
}

export interface RemainingHideoutNeed {
  itemId: string
  count: number
  stations: string[]
  nextNeededLevel: number
}

export function summarizeHideoutStations(
  requirements: readonly HideoutItemRequirement[],
  progress: HideoutProgress
): HideoutStationSummary[] {
  const byStation = new Map<string, { stationName: string; levels: Set<number> }>()

  for (const requirement of requirements) {
    const entry = byStation.get(requirement.stationId) ?? {
      stationName: requirement.stationName,
      levels: new Set<number>(),
    }
    entry.levels.add(requirement.level)
    byStation.set(requirement.stationId, entry)
  }

  return [...byStation.entries()]
    .map(([stationId, station]) => {
      const maxLevel = Math.max(0, ...station.levels)
      const currentLevel = Math.max(0, Math.min(progress[stationId] ?? 0, maxLevel))
      const futureLevels = [...station.levels].filter((level) => level > currentLevel).sort((a, b) => a - b)
      return {
        stationId,
        stationName: station.stationName,
        currentLevel,
        maxLevel,
        nextLevel: futureLevels[0],
        remainingUpgradeLevels: futureLevels.length,
      }
    })
    .sort((a, b) => a.stationName.localeCompare(b.stationName))
}

export function calculateRemainingHideoutNeeds(
  requirements: readonly HideoutItemRequirement[],
  progress: HideoutProgress
): RemainingHideoutNeed[] {
  const byItem = new Map<string, RemainingHideoutNeed>()

  for (const requirement of requirements) {
    const currentLevel = progress[requirement.stationId] ?? 0
    if (requirement.level <= currentLevel) continue

    const existing = byItem.get(requirement.itemId)
    if (existing) {
      existing.count += requirement.count
      existing.nextNeededLevel = Math.min(existing.nextNeededLevel, requirement.level)
      if (!existing.stations.includes(requirement.stationName)) existing.stations.push(requirement.stationName)
    } else {
      byItem.set(requirement.itemId, {
        itemId: requirement.itemId,
        count: requirement.count,
        stations: [requirement.stationName],
        nextNeededLevel: requirement.level,
      })
    }
  }

  return [...byItem.values()].sort(
    (a, b) => a.nextNeededLevel - b.nextNeededLevel || b.count - a.count || a.itemId.localeCompare(b.itemId)
  )
}
