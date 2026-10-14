import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const CLUBS = [
  ["Q8682", "Real Madrid"], ["Q7156", "Barcelona"], ["Q9616", "Chelsea"], ["Q9617", "Arsenal"],
  ["Q18656", "Manchester United"], ["Q50602", "Manchester City"], ["Q1130849", "Liverpool"], ["Q18741", "Tottenham Hotspur"],
  ["Q15789", "Bayern Munich"], ["Q41420", "Borussia Dortmund"], ["Q1422", "Juventus"], ["Q1543", "AC Milan"],
  ["Q631", "Inter Milan"], ["Q483020", "Paris Saint-Germain"], ["Q81888", "Ajax"], ["Q131499", "Benfica"],
  ["Q128446", "Porto"], ["Q8701", "Atlético Madrid"], ["Q2739", "Roma"], ["Q2641", "Napoli"],
]
const ENDPOINT = "https://query.wikidata.org/sparql"
const output = resolve(dirname(fileURLToPath(import.meta.url)), "../public/data/deepcuts/database.json")
const retrievedAt = new Date().toISOString()

function queryFor(qid, offset) {
  return `SELECT ?player ?playerLabel ?club ?clubLabel ?countryLabel ?dateOfBirth ?nationalityLabel ?matches ?start ?end WHERE {
  VALUES ?club { wd:${qid} }
  ?player wdt:P106/wdt:P279* wd:Q937857; p:P54 ?membership.
  ?membership ps:P54 ?club; pq:P1350 ?matches.
  FILTER(?matches > 0)
  OPTIONAL { ?membership pq:P580 ?start. } OPTIONAL { ?membership pq:P582 ?end. }
  OPTIONAL { ?player wdt:P569 ?dateOfBirth. } OPTIONAL { ?player wdt:P27 ?nationality. }
  OPTIONAL { ?club wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY ?player ?start ?end LIMIT 400 OFFSET ${offset}`
}

async function fetchPage(qid, displayName, offset, attempt = 1) {
  const url = `${ENDPOINT}?query=${encodeURIComponent(queryFor(qid, offset))}&format=json`
  const response = await fetch(url, { headers: { Accept: "application/sparql-results+json", "User-Agent": "amer.lol-deepcuts/0.1 (static database generator)" } })
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
    throw new Error(`${displayName}: Wikidata returned malformed JSON after ${attempt} attempts`, { cause: error })
  }
  return json.results?.bindings ?? []
}

async function fetchClub([qid, displayName]) {
  const rows = []
  for (let offset = 0; ; offset += 400) {
    const page = await fetchPage(qid, displayName, offset)
    const returnedQid = page[0]?.club?.value?.split("/").pop()
    if (page.length && returnedQid !== qid) throw new Error(`${displayName}: expected ${qid}, received ${returnedQid}`)
    rows.push(...page)
    if (page.length < 400) break
  }
  process.stdout.write(`${displayName}: ${rows.length} sourced appearances\n`)
  return rows
}

function year(value) { return value ? Number(value.slice(0, 4)) : undefined }
function points(count) { return count <= 4 ? 100 : count <= 19 ? 85 : count <= 49 ? 60 : count <= 99 ? 30 : 10 }
function slug(...parts) { return parts.join("-").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }

const rows = []
for (let index = 0; index < CLUBS.length; index += 2) {
  rows.push(...(await Promise.all(CLUBS.slice(index, index + 2).map((club) => fetchClub(club)))).flat())
}
const clubMap = new Map(CLUBS.map(([qid, name]) => [qid, { id: qid, name, country: "", sourceUrl: `https://www.wikidata.org/wiki/${qid}` }]))
const players = new Map()
const relationshipMap = new Map()

for (const row of rows) {
  const playerId = row.player.value.split("/").pop()
  const clubId = row.club.value.split("/").pop()
  const count = Number(row.matches.value)
  if (!playerId || !clubMap.has(clubId) || !Number.isInteger(count) || count < 1) continue
  const player = players.get(playerId) ?? { id: playerId, name: row.playerLabel.value, aliases: [], nationalities: [], birthYear: year(row.dateOfBirth?.value), sourceUrl: row.player.value }
  if (row.nationalityLabel?.value && !player.nationalities.includes(row.nationalityLabel.value)) player.nationalities.push(row.nationalityLabel.value)
  players.set(playerId, player)
  if (row.countryLabel?.value) clubMap.get(clubId).country = row.countryLabel.value
  const key = `${playerId}:${clubId}`
  const existing = relationshipMap.get(key)
  relationshipMap.set(key, {
    playerId, clubId,
    appearances: Math.max(existing?.appearances ?? 0, count),
    startYear: Math.min(existing?.startYear ?? 9999, year(row.start?.value) ?? 9999),
    endYear: Math.max(existing?.endYear ?? 0, year(row.end?.value) ?? 0),
    source: { provider: "wikidata", playerQid: playerId, property: "P54/P1350", retrievedAt },
  })
}
const appearances = [...relationshipMap.values()].map((row) => ({ ...row, startYear: row.startYear === 9999 ? undefined : row.startYear, endYear: row.endYear || undefined }))
const byPlayer = new Map()
const byClub = new Map()
for (const row of appearances) {
  const career = byPlayer.get(row.playerId) ?? []; career.push(row); byPlayer.set(row.playerId, career)
  const squad = byClub.get(row.clubId) ?? []; squad.push(row); byClub.set(row.clubId, squad)
}
const questions = []
function addQuestion(question, answers, minimum) {
  const unique = [...new Map(answers.map((answer) => [answer.playerId, answer])).values()]
  if (unique.length < minimum) return
  questions.push({ ...question, answerCount: unique.length, answers: unique.sort((a, b) => a.playerId.localeCompare(b.playerId)) })
}

for (let a = 0; a < CLUBS.length; a++) for (let b = a + 1; b < CLUBS.length; b++) {
  const [clubAId, clubA] = CLUBS[a], [clubBId, clubB] = CLUBS[b]
  const other = new Map((byClub.get(clubBId) ?? []).map((row) => [row.playerId, row]))
  const answers = (byClub.get(clubAId) ?? []).filter((row) => other.has(row.playerId)).map((row) => {
    const second = other.get(row.playerId); return { playerId: row.playerId, points: points(Math.min(row.appearances, second.appearances)), appearances: [row.appearances, second.appearances] }
  })
  addQuestion({ id: `clubs-${clubAId}-${clubBId}`, type: "club_pair", prompt: `Name a player who made a senior appearance for both ${clubA} and ${clubB}.`, clubIds: [clubAId, clubBId] }, answers, 8)
}

for (const [clubId, clubName] of CLUBS) {
  const nationalityGroups = new Map()
  for (const row of byClub.get(clubId) ?? []) for (const nationality of players.get(row.playerId)?.nationalities ?? []) {
    const group = nationalityGroups.get(nationality) ?? []; group.push({ playerId: row.playerId, points: points(row.appearances), appearances: [row.appearances] }); nationalityGroups.set(nationality, group)
  }
  for (const [nationality, answers] of nationalityGroups) addQuestion({ id: slug("nationality", clubId, nationality), type: "club_nationality", prompt: `Name a ${nationality} player who made a senior appearance for ${clubName}.`, clubIds: [clubId], nationality }, answers, 6)
  for (const decade of [1980, 1990, 2000, 2010, 2020]) {
    const answers = (byClub.get(clubId) ?? []).filter((row) => row.startYear && row.endYear && row.startYear <= decade + 9 && row.endYear >= decade).map((row) => ({ playerId: row.playerId, points: points(row.appearances), appearances: [row.appearances] }))
    addQuestion({ id: `era-${clubId}-${decade}`, type: "club_era", prompt: `Name a player who made a senior appearance for ${clubName} during the ${decade}s.`, clubIds: [clubId], decade }, answers, 8)
  }
}

const tripleGroups = new Map()
for (const [playerId, career] of byPlayer) {
  const eligible = career.filter((row) => clubMap.has(row.clubId)).sort((a, b) => a.clubId.localeCompare(b.clubId))
  for (let a = 0; a < eligible.length; a++) for (let b = a + 1; b < eligible.length; b++) for (let c = b + 1; c < eligible.length; c++) {
    const trio = [eligible[a], eligible[b], eligible[c]], id = trio.map((row) => row.clubId).join("-")
    const group = tripleGroups.get(id) ?? []; group.push({ playerId, points: points(Math.min(...trio.map((row) => row.appearances))), appearances: trio.map((row) => row.appearances) }); tripleGroups.set(id, group)
  }
}
for (const [id, answers] of tripleGroups) {
  const clubIds = id.split("-"); const names = clubIds.map((clubId) => clubMap.get(clubId).name)
  addQuestion({ id: `path-${id}`, type: "three_clubs", prompt: `Name a player who made a senior appearance for ${names[0]}, ${names[1]}, and ${names[2]}.`, clubIds }, answers, 4)
}

const database = {
  meta: { version: 1, generatedAt: retrievedAt, provisional: true, license: "Wikidata structured data: CC0-1.0", source: "https://www.wikidata.org", eligibility: "Positive P1350 match-count qualifier on a P54 club-membership statement. Counts may represent league rather than all competitions." },
  clubs: [...clubMap.values()], players: [...players.values()].sort((a, b) => a.name.localeCompare(b.name)), appearances, questions,
}
await mkdir(dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(database)}\n`, "utf8")
process.stdout.write(`Wrote ${database.players.length} players, ${appearances.length} relationships, and ${questions.length} questions to ${output}\n`)
