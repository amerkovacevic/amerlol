import { readFile, writeFile } from "node:fs/promises"
import { buildQuestions } from "./deepcuts-questions.mjs"
import { validateDatabase } from "./validate-deepcuts-database.mjs"

// Explicit provider IDs prevent similarly named reserve/women's teams being imported.
const TEAMS = [
  ["Q8682", "esp.1", 86, "Real Madrid"],
  ["Q7156", "esp.1", 83, "Barcelona"],
  ["Q9616", "eng.1", 363, "Chelsea"],
  ["Q9617", "eng.1", 359, "Arsenal"],
  ["Q18656", "eng.1", 360, "Manchester United"],
  ["Q50602", "eng.1", 382, "Manchester City"],
  ["Q1130849", "eng.1", 364, "Liverpool"],
  ["Q18741", "eng.1", 367, "Tottenham Hotspur"],
  ["Q15789", "ger.1", 132, "Bayern Munich"],
  ["Q41420", "ger.1", 124, "Borussia Dortmund"],
  ["Q1422", "ita.1", 111, "Juventus"],
  ["Q1543", "ita.1", 103, "AC Milan"],
  ["Q631", "ita.1", 110, "Internazionale"],
  ["Q483020", "fra.1", 160, "Paris Saint-Germain"],
  ["Q81888", "ned.1", 139, "Ajax Amsterdam"],
  ["Q131499", "por.1", 1929, "Benfica"],
  ["Q128446", "por.1", 437, "FC Porto"],
  ["Q8701", "esp.1", 1068, "Atlético Madrid"],
  ["Q2739", "ita.1", 104, "AS Roma"],
  ["Q2641", "ita.1", 114, "Napoli"],
]
const path = new URL("../public/data/deepcuts/database.json", import.meta.url)
const database = JSON.parse(await readFile(path, "utf8"))
const retrievedAt = new Date().toISOString()
const normalize = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
const relationships = new Map(database.appearances.map((row) => [`${row.playerId}:${row.clubId}`, row]))
const rosters = []

for (const [clubId, league, teamId, expectedName] of TEAMS) {
  const sourceUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${teamId}/roster`
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${expectedName}: HTTP ${response.status}`)
  const data = await response.json()
  if (
    String(data.team?.id) !== String(teamId) ||
    normalize(data.team.displayName) !== normalize(expectedName)
  )
    throw new Error(`Team identity mismatch for ${expectedName}: ${data.team?.displayName}`)
  if (!data.athletes?.length || data.athletes.length < 15)
    throw new Error(`Incomplete squad for ${expectedName}`)
  if (data.season?.year !== Number(retrievedAt.slice(0, 4)))
    throw new Error(`Outdated season for ${expectedName}`)
  const ids = data.athletes.map((athlete) => JSON.stringify(String(athlete.id))).join(" ")
  const query = `SELECT ?player ?playerLabel ?espn ?alias ?nationalityLabel ?dob WHERE {
    VALUES ?espn { ${ids} } ?player wdt:P3681 ?espn.
    OPTIONAL { ?player skos:altLabel ?alias. FILTER(LANG(?alias) = "en") }
    OPTIONAL { ?player wdt:P27 ?nationality. } OPTIONAL { ?player wdt:P569 ?dob. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`
  const identitiesResponse = await fetch(
    `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`,
    {
      headers: {
        "User-Agent": "Deepcuts/1.0 (https://amer.lol; roster validation)",
        Accept: "application/sparql-results+json",
      },
      signal: AbortSignal.timeout(60000),
    }
  )
  if (!identitiesResponse.ok) throw new Error(`Identity reconciliation failed: ${identitiesResponse.status}`)
  const identities = (await identitiesResponse.json()).results.bindings
  const squad = []
  for (const athlete of data.athletes) {
    const aliases = [...new Set([athlete.displayName, athlete.fullName, athlete.shortName].filter(Boolean))]
    const birthYear = athlete.dateOfBirth ? Number(athlete.dateOfBirth.slice(0, 4)) : undefined
    const candidates = database.players.filter(
      (player) =>
        (!birthYear || !player.birthYear || player.birthYear === birthYear) &&
        [player.name, ...player.aliases].some((name) =>
          aliases.some((alias) => normalize(alias) === normalize(name))
        )
    )
    const identityRows = identities.filter((row) => row.espn.value === String(athlete.id))
    const qids = [...new Set(identityRows.map((row) => row.player.value.split("/").pop()))]
    if (qids.length > 1) throw new Error(`Conflicting provider identities for ${athlete.displayName}`)
    const qid = qids[0]
    let player = qid
      ? database.players.find((player) => player.id === qid)
      : database.players.find((player) => player.espnId === athlete.id)
    if (qid && !player) {
      player = {
        id: qid,
        name: identityRows[0].playerLabel.value,
        aliases: [],
        nationalities: [],
        ...(birthYear ? { birthYear } : {}),
        sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
      }
      database.players.push(player)
    }
    if (!player && candidates.length === 1) player = candidates[0]
    if (!player) {
      player = {
        id: `espn-${athlete.id}`,
        name: athlete.displayName,
        aliases: [],
        nationalities: [],
        ...(birthYear ? { birthYear } : {}),
        sourceUrl: athlete.links?.find((link) => link.rel?.includes("playercard"))?.href ?? sourceUrl,
      }
      database.players.push(player)
    }
    player.espnId = athlete.id
    player.aliases = [
      ...new Set([
        ...player.aliases,
        ...aliases,
        ...identityRows.map((row) => row.alias?.value).filter(Boolean),
      ]),
    ].filter((name) => name !== player.name)
    player.nationalities = [
      ...new Set([
        ...player.nationalities,
        ...identityRows.map((row) => row.nationalityLabel?.value).filter(Boolean),
      ]),
    ]
    const duplicate = database.players.find((other) => other.espnId === athlete.id && other.id !== player.id)
    if (duplicate) {
      player.aliases = [...new Set([...player.aliases, duplicate.name, ...duplicate.aliases])].filter(
        (name) => name !== player.name
      )
      database.players = database.players.filter((other) => other.id !== duplicate.id)
      for (const [key, row] of relationships)
        if (row.playerId === duplicate.id) {
          const canonicalKey = `${player.id}:${row.clubId}`
          if (!relationships.has(canonicalKey))
            relationships.set(canonicalKey, { ...row, playerId: player.id })
          relationships.delete(key)
        }
    }
    // Registration alone is never treated as proof of a senior appearance.
    const stats = athlete.statistics?.splits?.categories?.flatMap((category) => category.stats ?? []) ?? []
    const appearances = stats.find((stat) => stat.name === "appearances")?.value
    squad.push({
      playerId: player.id,
      espnId: athlete.id,
      ...(Number.isInteger(appearances) ? { appearances } : {}),
    })
    const key = `${player.id}:${clubId}`
    if (
      (!relationships.has(key) || relationships.get(key).source.provider === "espn") &&
      Number.isInteger(appearances) &&
      appearances > 0
    ) {
      relationships.set(key, {
        playerId: player.id,
        clubId,
        appearances,
        source: {
          provider: "espn",
          externalId: athlete.id,
          sourceUrl,
          retrievedAt,
          season: data.season.displayName,
          scope: "current league season, not career total",
        },
      })
    }
  }
  rosters.push({ clubId, sourceUrl, retrievedAt, season: data.season.displayName, players: squad })
  console.log(`${expectedName}: ${squad.length} roster players`)
}
database.rosters = rosters
database.appearances = [...relationships.values()]
database.players.sort((a, b) => a.name.localeCompare(b.name))
database.questions = buildQuestions(database)
database.meta = {
  ...database.meta,
  version: 2,
  historicalGeneratedAt: database.meta.historicalGeneratedAt ?? database.meta.generatedAt,
  generatedAt: retrievedAt,
  rostersUpdatedAt: retrievedAt,
  rosterSource: "ESPN current league squad lists",
  disabledQuestionTypes: { club_era: "Membership intervals do not prove dated match appearances" },
  eligibility:
    "Positive sourced appearance count required. Historical Wikidata totals and ESPN current-season league counts have different scopes; rarity scores remain provisional.",
}
// Publish only after every club succeeds; a failed fetch never leaves a partial database.
const errors = validateDatabase(database)
if (errors.length) throw new Error(errors.join("\n"))
await writeFile(path, `${JSON.stringify(database)}\n`)
console.log(
  `Updated ${database.players.length} searchable players, ${database.appearances.length} relationships and ${database.questions.length} questions`
)
