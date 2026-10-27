export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function buildSearchTerms(displayName: string, alternativeNames: readonly string[]): string[] {
  return Array.from(
    new Set([displayName, ...alternativeNames].map(normalizeSearchText).filter(Boolean))
  ).sort()
}

export function canonicalClubPairId(clubAId: string, clubBId: string): string {
  if (!clubAId || !clubBId || clubAId === clubBId) throw new Error("Two different club IDs are required")
  return [clubAId, clubBId].sort().join("__")
}
