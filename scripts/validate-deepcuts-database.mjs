import { readFile, stat } from "node:fs/promises"

const path = new URL("../public/data/deepcuts/database.json", import.meta.url)
const database = JSON.parse(await readFile(path, "utf8"))
const errors = []
const clubIds = new Set(database.clubs.map(({ id }) => id))
const playerIds = new Set(database.players.map(({ id }) => id))
const relationshipKeys = new Set()
const questionIds = new Set()
const allowedPoints = new Set([10, 30, 60, 85, 100])

if (clubIds.size !== database.clubs.length) errors.push("Duplicate club IDs")
if (playerIds.size !== database.players.length) errors.push("Duplicate player IDs")
if (database.clubs.length < 20) errors.push("Expected at least 20 clubs")
if (database.players.length < 5000) errors.push("Expected at least 5,000 players")

for (const row of database.appearances) {
  const key = `${row.playerId}:${row.clubId}`
  if (relationshipKeys.has(key)) errors.push(`Duplicate relationship ${key}`)
  relationshipKeys.add(key)
  if (!playerIds.has(row.playerId)) errors.push(`Unknown player in relationship ${key}`)
  if (!clubIds.has(row.clubId)) errors.push(`Unknown club in relationship ${key}`)
  if (!Number.isInteger(row.appearances) || row.appearances < 1) errors.push(`Invalid appearances for ${key}`)
  if (row.source?.provider !== "wikidata" || !row.source?.playerQid || !row.source?.retrievedAt) errors.push(`Incomplete source for ${key}`)
}

for (const question of database.questions) {
  if (questionIds.has(question.id)) errors.push(`Duplicate question ${question.id}`)
  questionIds.add(question.id)
  if (!question.prompt || !["club_pair", "club_nationality", "club_era", "three_clubs"].includes(question.type)) errors.push(`Invalid question ${question.id}`)
  if (question.clubIds.some((id) => !clubIds.has(id))) errors.push(`Unknown club in question ${question.id}`)
  if (question.answers.length !== question.answerCount) errors.push(`Answer count mismatch in ${question.id}`)
  if (new Set(question.answers.map(({ playerId }) => playerId)).size !== question.answers.length) errors.push(`Duplicate answer in ${question.id}`)
  for (const answer of question.answers) {
    if (!playerIds.has(answer.playerId)) errors.push(`Unknown answer player in ${question.id}`)
    if (!allowedPoints.has(answer.points)) errors.push(`Invalid score in ${question.id}`)
    if (!Array.isArray(answer.appearances) || answer.appearances.length !== question.clubIds.length || answer.appearances.some((count) => !Number.isInteger(count) || count < 1)) errors.push(`Invalid answer appearances in ${question.id}`)
  }
}

const types = Object.fromEntries(["club_pair", "club_nationality", "club_era", "three_clubs"].map((type) => [type, database.questions.filter((question) => question.type === type).length]))
for (const [type, count] of Object.entries(types)) if (!count) errors.push(`No questions generated for ${type}`)
if (!database.meta?.provisional || !database.meta?.generatedAt || !database.meta?.source) errors.push("Database metadata is incomplete")

if (errors.length) {
  console.error(errors.slice(0, 100).join("\n"))
  console.error(`${errors.length} validation errors`)
  process.exit(1)
}
const size = (await stat(path)).size
console.log(JSON.stringify({ valid: true, size, clubs: database.clubs.length, players: database.players.length, appearances: database.appearances.length, questions: database.questions.length, types }, null, 2))
