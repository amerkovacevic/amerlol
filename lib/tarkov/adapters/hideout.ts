type JsonRecord = Record<string, unknown>

export interface HideoutItemRequirement {
  itemId: string
  count: number
  stationId: string
  stationName: string
  level: number
}

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

export function normalizeHideoutItemRequirements(data: unknown): HideoutItemRequirement[] {
  if (!isRecord(data)) return []

  const stations = asRecordArray(data.hideoutStations ?? data.stations ?? data.hideout)
  const requirements: HideoutItemRequirement[] = []

  for (const station of stations) {
    const stationId = readId(station)
    const stationName = typeof station.name === "string" ? station.name : readName(station.station)
    if (!stationId || !stationName) continue

    for (const levelRecord of asRecordArray(station.levels)) {
      const level = readNumber(levelRecord.level) ?? 0
      for (const requirement of asRecordArray(levelRecord.itemRequirements ?? levelRecord.requirements)) {
        const itemId = readId(requirement.item)
        const count = readNumber(requirement.count ?? requirement.quantity) ?? 0
        if (!itemId || count <= 0) continue

        requirements.push({
          itemId,
          count,
          stationId,
          stationName,
          level,
        })
      }
    }
  }

  return requirements
}
