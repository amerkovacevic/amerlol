import type { FootballDataProvider, ImportBatch } from "./provider.ts"
import type { FootballClub, FootballPlayer, PlayerClubAppearance, SourceReference } from "../types.ts"

const ENDPOINT = "https://query.wikidata.org/sparql"

interface SparqlBindingValue { value: string }
interface SparqlRow {
  player: SparqlBindingValue
  playerLabel: SparqlBindingValue
  club: SparqlBindingValue
  clubLabel: SparqlBindingValue
  countryLabel?: SparqlBindingValue
  dateOfBirth?: SparqlBindingValue
  nationalityLabel?: SparqlBindingValue
  matches?: SparqlBindingValue
  start?: SparqlBindingValue
  end?: SparqlBindingValue
}

function entityId(uri: string): string {
  const id = uri.split("/").pop()
  if (!id || !/^Q\d+$/.test(id)) throw new Error(`Invalid Wikidata entity URI: ${uri}`)
  return id
}

export function buildWikidataClubQuery(clubQids: readonly string[], limit = 1000): string {
  if (!clubQids.length || clubQids.some((id) => !/^Q\d+$/.test(id))) throw new Error("Valid Wikidata club QIDs are required")
  if (!Number.isInteger(limit) || limit < 1 || limit > 5000) throw new Error("Limit must be between 1 and 5000")
  return `SELECT ?player ?playerLabel ?club ?clubLabel ?countryLabel ?dateOfBirth ?nationalityLabel ?matches ?start ?end WHERE {
  VALUES ?club { ${clubQids.map((id) => `wd:${id}`).join(" ")} }
  ?player p:P54 ?membership.
  ?membership ps:P54 ?club.
  OPTIONAL { ?membership pq:P1350 ?matches. }
  OPTIONAL { ?membership pq:P580 ?start. }
  OPTIONAL { ?membership pq:P582 ?end. }
  OPTIONAL { ?player wdt:P569 ?dateOfBirth. }
  OPTIONAL { ?player wdt:P27 ?nationality. }
  OPTIONAL { ?club wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${limit}`
}

export class WikidataProvider implements FootballDataProvider {
  readonly id = "wikidata"
  readonly attribution = "Wikidata contributors"
  readonly licenseNotes = "Structured data is CC0. Imported membership and match-count statements remain unverified leads."
  private readonly clubQids: readonly string[]
  private readonly fetcher: typeof fetch

  constructor(clubQids: readonly string[], fetcher: typeof fetch = fetch) {
    this.clubQids = clubQids
    this.fetcher = fetcher
  }

  async import(options: { cursor?: string; limit?: number } = {}): Promise<ImportBatch> {
    if (options.cursor) throw new Error("Wikidata offset pagination is not supported by this provider")
    const query = buildWikidataClubQuery(this.clubQids, options.limit ?? 1000)
    const response = await this.fetcher(`${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`, {
      headers: { Accept: "application/sparql-results+json", "User-Agent": "amer.lol-deepcuts/0.1 (data import)" },
    })
    if (!response.ok) throw new Error(`Wikidata query failed with status ${response.status}`)
    const payload = await response.json() as { results?: { bindings?: SparqlRow[] } }
    return mapWikidataRows(payload.results?.bindings ?? [], new Date().toISOString())
  }
}

export function mapWikidataRows(rows: readonly SparqlRow[], retrievedAt: string): ImportBatch {
  const clubs = new Map<string, FootballClub>()
  const players = new Map<string, FootballPlayer>()
  const appearances: PlayerClubAppearance[] = []
  const issues: ImportBatch["issues"] = []

  for (const row of rows) {
    try {
      const playerQid = entityId(row.player.value)
      const clubQid = entityId(row.club.value)
      const source: SourceReference = { provider: "wikidata", externalId: playerQid, url: row.player.value, retrievedAt, license: "CC0-1.0" }
      players.set(playerQid, {
        id: `wikidata-${playerQid}`,
        canonicalName: row.playerLabel.value,
        displayName: row.playerLabel.value,
        alternativeNames: [],
        nationality: row.nationalityLabel?.value,
        dateOfBirth: row.dateOfBirth?.value.slice(0, 10),
        sources: [source],
        verificationStatus: "pending",
      })
      clubs.set(clubQid, {
        id: `wikidata-${clubQid}`,
        officialName: row.clubLabel.value,
        displayName: row.clubLabel.value,
        alternativeNames: [],
        country: row.countryLabel?.value ?? "Unknown",
        sources: [{ ...source, externalId: clubQid, url: row.club.value }],
      })
      const parsedMatches = row.matches ? Number(row.matches.value) : undefined
      appearances.push({
        id: `wikidata-${playerQid}-${clubQid}`,
        playerId: `wikidata-${playerQid}`,
        clubId: `wikidata-${clubQid}`,
        firstSeason: row.start?.value.slice(0, 10),
        lastSeason: row.end?.value.slice(0, 10),
        competitiveAppearances: Number.isInteger(parsedMatches) ? parsedMatches : undefined,
        moveType: "unknown",
        source,
        verificationStatus: "pending",
      })
      if (parsedMatches === undefined) issues.push({ code: "missing-appearances", message: "Wikidata membership has no match-count qualifier", externalId: `${playerQid}:${clubQid}` })
    } catch (error) {
      issues.push({ code: "source-error", message: error instanceof Error ? error.message : "Invalid Wikidata row" })
    }
  }
  return { clubs: [...clubs.values()], players: [...players.values()], appearances, issues }
}
