import { buildQuestions } from "./deepcuts-questions.mjs"
import { validateDatabase } from "./validate-deepcuts-database.mjs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const CLUBS = [
  ["Q8682", "Real Madrid"],
  ["Q7156", "Barcelona"],
  ["Q9616", "Chelsea"],
  ["Q9617", "Arsenal"],
  ["Q18656", "Manchester United"],
  ["Q50602", "Manchester City"],
  ["Q1130849", "Liverpool"],
  ["Q18741", "Tottenham Hotspur"],
  ["Q15789", "Bayern Munich"],
  ["Q41420", "Borussia Dortmund"],
  ["Q1422", "Juventus"],
  ["Q1543", "AC Milan"],
  ["Q631", "Inter Milan"],
  ["Q483020", "Paris Saint-Germain"],
  ["Q81888", "Ajax"],
  ["Q131499", "Benfica"],
  ["Q128446", "Porto"],
  ["Q8701", "Atlético Madrid"],
  ["Q2739", "Roma"],
  ["Q2641", "Napoli"],
]
const ENDPOINT = "https://query.wikidata.org/sparql"
const output = resolve(dirname(fileURLToPath(import.meta.url)), "../public/data/deepcuts/database.json")
const retrievedAt = new Date().toISOString()

function queryFor(qid, offset) {
  return `SELECT ?player ?playerLabel ?club ?clubLabel ?countryLabel ?dateOfBirth ?nationalityLabel ?alias ?statement ?matches ?start ?end WHERE {
  VALUES ?club { wd:${qid} }
  ?player wdt:P106/wdt:P279* wd:Q937857; p:P54 ?membership.
  ?membership ps:P54 ?club.
  BIND(?membership AS ?statement)
  OPTIONAL { ?membership pq:P1350 ?matches. FILTER(?matches > 0) }
  OPTIONAL { ?player skos:altLabel ?alias. FILTER(LANG(?alias) = "en") }
  OPTIONAL { ?membership pq:P580 ?start. } OPTIONAL { ?membership pq:P582 ?end. }
  OPTIONAL { ?player wdt:P569 ?dateOfBirth. } OPTIONAL { ?player wdt:P27 ?nationality. }
  OPTIONAL { ?club wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY ?player ?statement ?nationality ?alias ?dateOfBirth ?start ?end ?matches LIMIT 400 OFFSET ${offset}`
}

async function fetchPage(qid, displayName, offset, attempt = 1) {
  const url = `${ENDPOINT}?query=${encodeURIComponent(queryFor(qid, offset))}&format=json`
  const response = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "Deepcuts/1.0 (https://amer.lol; roster validation)",
    },
    signal: AbortSignal.timeout(60000),
  })
  if (!response.ok) {
    if (attempt < 4 && [429, 500, 502, 503, 504].includes(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
      return fetchPage(qid, displayName, offset, attempt + 1)
    }
    throw new Error(`${displayName}: Wikidata returned ${response.status}`)
  }
  let json
  try {
    json = JSON.parse(await response.text())
  } catch (error) {
    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
      return fetchPage(qid, displayName, offset, attempt + 1)
    }
    throw new Error(`${displayName}: Wikidata returned malformed JSON after ${attempt} attempts`, {
      cause: error,
    })
  }
  return json.results?.bindings ?? []
}

async function fetchClub([qid, displayName]) {
  const rows = []
  for (let offset = 0; ; offset += 400) {
    const page = await fetchPage(qid, displayName, offset)
    const returnedQid = page[0]?.club?.value?.split("/").pop()
    if (page.length && returnedQid !== qid)
      throw new Error(`${displayName}: expected ${qid}, received ${returnedQid}`)
    rows.push(...page)
    if (page.length < 400) break
  }
  process.stdout.write(`${displayName}: ${rows.length} sourced appearances\n`)
  return rows
}

function year(value) {
  return value ? Number(value.slice(0, 4)) : undefined
}
function points(count) {
  return count <= 4 ? 100 : count <= 19 ? 85 : count <= 49 ? 60 : count <= 99 ? 30 : 10
}
function slug(...parts) {
  return parts
    .join("-")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const rows = []
for (let index = 0; index < CLUBS.length; index += 2) {
  rows.push(...(await Promise.all(CLUBS.slice(index, index + 2).map((club) => fetchClub(club)))).flat())
}
const clubMap = new Map(
  CLUBS.map(([qid, name]) => [
    qid,
    { id: qid, name, country: "", sourceUrl: `https://www.wikidata.org/wiki/${qid}` },
  ])
)
const players = new Map()
const relationshipMap = new Map()

for (const row of rows) {
  const playerId = row.player.value.split("/").pop()
  const clubId = row.club.value.split("/").pop()
  const count = Number(row.matches?.value)
  if (!playerId || !clubMap.has(clubId)) continue
  const player = players.get(playerId) ?? {
    id: playerId,
    name: row.playerLabel.value,
    aliases: [],
    nationalities: [],
    birthYear: year(row.dateOfBirth?.value),
    sourceUrl: row.player.value,
  }
  if (row.nationalityLabel?.value && !player.nationalities.includes(row.nationalityLabel.value))
    player.nationalities.push(row.nationalityLabel.value)
  if (row.alias?.value && !player.aliases.includes(row.alias.value)) player.aliases.push(row.alias.value)
  players.set(playerId, player)
  if (!Number.isInteger(count) || count < 1) continue
  if (row.countryLabel?.value) clubMap.get(clubId).country = row.countryLabel.value
  const key = `${playerId}:${clubId}:${row.statement?.value ?? `${row.start?.value}:${row.end?.value}`}`
  const existing = relationshipMap.get(key)
  relationshipMap.set(key, {
    playerId,
    clubId,
    appearances: Math.max(existing?.appearances ?? 0, count),
    startYear: Math.min(existing?.startYear ?? 9999, year(row.start?.value) ?? 9999),
    endYear: Math.max(existing?.endYear ?? 0, year(row.end?.value) ?? 0),
    source: { provider: "wikidata", playerQid: playerId, property: "P54/P1350", retrievedAt },
  })
}
const totals = new Map()
for (const row of relationshipMap.values()) {
  const key = row.playerId + ":" + row.clubId
  const total = totals.get(key)
  if (total) total.appearances += row.appearances
  else totals.set(key, { ...row })
}
const appearances = [...totals.values()].map(({ startYear, endYear, ...row }) => row)
const questions = buildQuestions({
  clubs: [...clubMap.values()],
  players: [...players.values()],
  appearances,
})

const database = {
  meta: {
    version: 1,
    generatedAt: retrievedAt,
    provisional: true,
    license: "Wikidata structured data: CC0-1.0",
    source: "https://www.wikidata.org",
    eligibility:
      "Positive P1350 match-count qualifier on a P54 club-membership statement. Counts may represent league rather than all competitions.",
  },
  clubs: [...clubMap.values()],
  players: [...players.values()].sort((a, b) => a.name.localeCompare(b.name)),
  appearances,
  questions,
}
const errors = validateDatabase(database, { requireRosters: false })
if (errors.length) throw new Error(errors.join("\n"))
await mkdir(dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(database)}\n`, "utf8")
process.stdout.write(
  `Wrote ${database.players.length} players, ${appearances.length} relationships, and ${questions.length} questions to ${output}\n`
)
