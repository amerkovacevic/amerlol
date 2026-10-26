import { buildSearchTerms, normalizeSearchText } from "./normalize.ts"
import type { FootballPlayer } from "./types.ts"

export interface PlayerSearchEntry {
  playerId: string
  displayName: string
  disambiguation: string
  terms: string[]
}

export function buildPlayerSearchIndex(players: readonly FootballPlayer[]): PlayerSearchEntry[] {
  return players
    .filter((player) => player.verificationStatus !== "rejected")
    .map((player) => ({
      playerId: player.id,
      displayName: player.displayName,
      disambiguation: [player.nationality, player.dateOfBirth?.slice(0, 4)].filter(Boolean).join(" · "),
      terms: buildSearchTerms(player.displayName, [player.canonicalName, ...player.alternativeNames]),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/** Searches the general player index. It has no access to question answers. */
export function searchPlayers(
  index: readonly PlayerSearchEntry[],
  query: string,
  limit = 8
): PlayerSearchEntry[] {
  const normalized = normalizeSearchText(query)
  if (normalized.length < 2 || !Number.isInteger(limit) || limit < 1) return []
  return index
    .map((entry) => {
      const exact = entry.terms.includes(normalized)
      const prefix = entry.terms.some((term) => term.startsWith(normalized))
      const includes = entry.terms.some((term) => term.includes(normalized))
      return { entry, rank: exact ? 0 : prefix ? 1 : includes ? 2 : 3 }
    })
    .filter(({ rank }) => rank < 3)
    .sort((a, b) => a.rank - b.rank || a.entry.displayName.localeCompare(b.entry.displayName))
    .slice(0, limit)
    .map(({ entry }) => entry)
}
