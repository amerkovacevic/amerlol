type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function asRecordArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) return Object.values(value).filter(isRecord)
  return []
}

export function buildItemReferenceMap(data: unknown): Record<string, string> {
  if (!isRecord(data)) return {}
  const items: Record<string, string> = {}

  for (const raw of asRecordArray(data.items)) {
    if (typeof raw.id !== "string") continue
    const label =
      (typeof raw.shortName === "string" && raw.shortName) ||
      (typeof raw.name === "string" && raw.name) ||
      raw.id
    items[raw.id] = label
  }

  return items
}
