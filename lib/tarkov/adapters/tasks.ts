import type {
  QuestDependencyRequirement,
  QuestObjective,
  QuestObjectiveWorldPosition,
  QuestRequirement,
  QuestRequirementStatus,
  TarkovFaction,
  TarkovQuest,
} from "@/lib/tarkov/types"

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function asRecordArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) return Object.values(value).filter(isRecord)
  return []
}

function readId(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (isRecord(value) && typeof value.id === "string") return value.id
  return undefined
}

function readName(value: unknown): string | undefined {
  if (isRecord(value) && typeof value.name === "string") return value.name
  return undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function normalizeFaction(value: unknown): TarkovFaction | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim().toUpperCase()
  if (normalized === "USEC") return "USEC"
  if (normalized === "BEAR") return "BEAR"
  return undefined
}

function normalizeRequirementStatuses(value: unknown): QuestRequirementStatus[] {
  const values = Array.isArray(value) ? value : [value]
  const statuses = new Set<QuestRequirementStatus>()

  for (const entry of values) {
    if (typeof entry !== "string") continue
    const normalized = entry.toLowerCase()
    if (normalized.includes("complete") || normalized === "success") statuses.add("completed")
    if (normalized.includes("fail")) statuses.add("failed")
  }

  return [...statuses]
}

function adaptDependencyRequirements(taskRequirements: unknown): QuestDependencyRequirement[] {
  return asRecordArray(taskRequirements).flatMap((requirement) => {
    const questId = readId(requirement.task ?? requirement.quest)
    if (!questId) return []

    const statuses = normalizeRequirementStatuses(
      requirement.status ?? requirement.statuses ?? requirement.requiredStatus
    )

    return [{
      questId,
      statuses: statuses.length > 0 ? statuses : ["completed"],
    }]
  })
}

function adaptGeneralRequirements(raw: JsonRecord): QuestRequirement[] {
  const requirements: QuestRequirement[] = []
  const minimumLevel = readNumber(raw.minPlayerLevel)
  if (minimumLevel !== undefined) requirements.push({ type: "level", level: minimumLevel })

  const faction = normalizeFaction(raw.factionName ?? raw.faction)
  if (faction) requirements.push({ type: "faction", faction })

  for (const traderRequirement of asRecordArray(raw.traderRequirements)) {
    const traderId = readId(traderRequirement.trader)
    if (!traderId) continue

    const requirementType = typeof traderRequirement.requirementType === "string"
      ? traderRequirement.requirementType.toLowerCase()
      : ""

    if (requirementType === "level") {
      requirements.push({
        type: "trader",
        traderId,
        description: `Requires trader level ${readNumber(traderRequirement.level ?? traderRequirement.value) ?? "?"}`,
      })
      continue
    }

    requirements.push({
      type: "trader",
      traderId,
      reputation: readNumber(traderRequirement.reputation ?? traderRequirement.value),
      description: typeof traderRequirement.description === "string"
        ? traderRequirement.description
        : undefined,
    })
  }

  return requirements
}

function collectMapIds(raw: JsonRecord): string[] {
  const ids = new Set<string>()
  const primaryMap = readId(raw.map)
  if (primaryMap) ids.add(primaryMap)

  for (const objective of asRecordArray(raw.objectives)) {
    for (const map of Array.isArray(objective.maps) ? objective.maps : []) {
      const id = readId(map)
      if (id) ids.add(id)
    }
    for (const zone of asRecordArray(objective.zones)) {
      const id = readId(zone.map)
      if (id) ids.add(id)
    }
    for (const location of asRecordArray(objective.possibleLocations)) {
      const id = readId(location.map)
      if (id) ids.add(id)
    }
  }

  return [...ids]
}

function collectItemIds(raw: JsonRecord): string[] {
  const ids = new Set<string>()
  const singularFields = ["item", "markerItem", "questItem", "usingWeapon"]
  const arrayFields = ["items", "containsAll", "useAny", "usingWeaponMods", "wearing", "notWearing"]

  for (const field of singularFields) {
    const id = readId(raw[field])
    if (id) ids.add(id)
  }

  for (const field of arrayFields) {
    for (const value of Array.isArray(raw[field]) ? raw[field] as unknown[] : []) {
      const id = readId(value)
      if (id) ids.add(id)
    }
  }

  return [...ids]
}

function collectBringItemIds(raw: JsonRecord): string[] {
  const ids = new Set<string>()
  for (const field of ["markerItem", "usingWeapon"] as const) {
    const id = readId(raw[field])
    if (id) ids.add(id)
  }
  for (const field of ["usingWeaponMods", "wearing"] as const) {
    for (const value of Array.isArray(raw[field]) ? raw[field] as unknown[] : []) {
      const id = readId(value)
      if (id) ids.add(id)
    }
  }
  return [...ids]
}

function collectRequiredKeyIds(raw: JsonRecord): string[] {
  const ids = new Set<string>()
  if (!Array.isArray(raw.requiredKeys)) return []

  for (const group of raw.requiredKeys) {
    const values = Array.isArray(group) ? group : [group]
    for (const value of values) {
      const id = readId(value)
      if (id) ids.add(id)
    }
  }
  return [...ids]
}

function readWorldPoint(value: unknown, mapId: string | undefined): QuestObjectiveWorldPosition | undefined {
  if (!mapId || !isRecord(value)) return undefined
  const x = readNumber(value.x)
  const y = readNumber(value.y)
  const z = readNumber(value.z)
  if (x === undefined || y === undefined || z === undefined) return undefined
  return { mapId, x, y, z }
}

function collectWorldPositions(raw: JsonRecord): QuestObjectiveWorldPosition[] {
  const positions: QuestObjectiveWorldPosition[] = []

  for (const zone of asRecordArray(raw.zones)) {
    const mapId = readId(zone.map)
    const point = readWorldPoint(zone.position, mapId)
    if (point) positions.push(point)
  }

  for (const location of asRecordArray(raw.possibleLocations)) {
    const mapId = readId(location.map)
    for (const rawPoint of Array.isArray(location.positions) ? location.positions : []) {
      const point = readWorldPoint(rawPoint, mapId)
      if (point) positions.push(point)
    }
  }

  const seen = new Set<string>()
  return positions.filter((position) => {
    const key = `${position.mapId}:${position.x}:${position.y}:${position.z}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function adaptObjective(raw: JsonRecord): QuestObjective {
  const mapIds = new Set<string>()
  for (const map of Array.isArray(raw.maps) ? raw.maps : []) {
    const id = readId(map)
    if (id) mapIds.add(id)
  }
  for (const zone of asRecordArray(raw.zones)) {
    const id = readId(zone.map)
    if (id) mapIds.add(id)
  }
  for (const location of asRecordArray(raw.possibleLocations)) {
    const id = readId(location.map)
    if (id) mapIds.add(id)
  }

  const worldPositions = collectWorldPositions(raw)

  return {
    id: readId(raw) ?? derivedObjectiveId(raw),
    description:
      (typeof raw.description === "string" && raw.description) ||
      (typeof raw.type === "string" && raw.type) ||
      "Quest objective",
    mapIds: [...mapIds],
    itemIds: collectItemIds(raw),
    bringItemIds: collectBringItemIds(raw),
    requiredKeyIds: collectRequiredKeyIds(raw),
    worldPositions: worldPositions.length > 0 ? worldPositions : undefined,
    count: readNumber(raw.count),
    foundInRaid: typeof raw.foundInRaid === "boolean" ? raw.foundInRaid : undefined,
    optional: typeof raw.optional === "boolean" ? raw.optional : undefined,
  }
}

function derivedObjectiveId(raw: JsonRecord): string {
  const basis = JSON.stringify([
    raw.description ?? "objective",
    raw.type ?? "unknown",
    raw.count ?? 0,
    readId(raw.item) ?? "",
  ])
  let hash = 2166136261
  for (let i = 0; i < basis.length; i += 1) {
    hash ^= basis.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `derived-${(hash >>> 0).toString(16)}`
}

export function normalizeTasksPayload(data: unknown): TarkovQuest[] {
  if (!isRecord(data)) return []

  return asRecordArray(data.tasks).flatMap((raw): TarkovQuest[] => {
    const id = readId(raw)
    const name = typeof raw.name === "string" ? raw.name : undefined
    if (!id || !name) return []

    const dependencyRequirements = adaptDependencyRequirements(raw.taskRequirements)
    const prerequisites = [...new Set(dependencyRequirements.map((requirement) => requirement.questId))]

    return [{
      id,
      name,
      traderId: readId(raw.trader) ?? "unknown-trader",
      mapIds: collectMapIds(raw),
      minimumLevel: readNumber(raw.minPlayerLevel) ?? 1,
      prerequisiteQuestIds: prerequisites,
      dependencyRequirements: dependencyRequirements.length > 0 ? dependencyRequirements : undefined,
      objectives: asRecordArray(raw.objectives).map(adaptObjective),
      requirements: adaptGeneralRequirements(raw),
      rewards: [],
      experience: readNumber(raw.experience) ?? 0,
      kappaRequired: raw.kappaRequired === true,
      lightkeeperRequired: raw.lightkeeperRequired === true,
      availableDelaySecondsMin: readNumber(raw.minTimeToFinish ?? raw.minTimeToAvailable ?? raw.availableAfterMin),
      availableDelaySecondsMax: readNumber(raw.maxTimeToFinish ?? raw.maxTimeToAvailable ?? raw.availableAfterMax),
      wikiUrl: typeof raw.wikiLink === "string" ? raw.wikiLink : undefined,
    }]
  })
}

function collectNamedEntities(data: unknown, key: string, target: Record<string, string>): void {
  if (!isRecord(data)) return
  for (const raw of asRecordArray(data[key])) {
    const id = readId(raw)
    const name = typeof raw.name === "string" ? raw.name : undefined
    if (id && name) target[id] = name
  }
}

export function buildTaskReferenceMaps(
  taskData: unknown,
  traderData?: unknown,
  mapData?: unknown
): { traders: Record<string, string>; maps: Record<string, string> } {
  const traders: Record<string, string> = {}
  const maps: Record<string, string> = {}

  collectNamedEntities(traderData, "traders", traders)
  collectNamedEntities(mapData, "maps", maps)

  if (!isRecord(taskData)) return { traders, maps }

  for (const raw of asRecordArray(taskData.tasks)) {
    const traderId = readId(raw.trader)
    const traderName = readName(raw.trader)
    if (traderId && traderName) traders[traderId] = traderName

    const mapId = readId(raw.map)
    const mapName = readName(raw.map)
    if (mapId && mapName) maps[mapId] = mapName

    for (const objective of asRecordArray(raw.objectives)) {
      for (const map of Array.isArray(objective.maps) ? objective.maps : []) {
        const id = readId(map)
        const name = readName(map)
        if (id && name) maps[id] = name
      }
    }
  }

  return { traders, maps }
}
