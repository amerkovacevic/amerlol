import { readFile, stat } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { buildQuestions } from "./deepcuts-questions.mjs"

export function validateDatabase(database, { requireRosters = true } = {}) {
  const errors = []
  const clubIds = new Set(database.clubs.map(({ id }) => id))
  const playerIds = new Set(database.players.map(({ id }) => id))
  const relationshipKeys = new Set()
  const relationships = new Map(database.appearances.map((row) => [`${row.playerId}:${row.clubId}`, row]))
  const players = new Map(database.players.map((player) => [player.id, player]))
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
    if (!Number.isInteger(row.appearances) || row.appearances < 1)
      errors.push(`Invalid appearances for ${key}`)
    if (!row.source?.retrievedAt || !["wikidata", "espn"].includes(row.source?.provider))
      errors.push(`Incomplete source for ${key}`)
    if (row.source?.provider === "wikidata" && row.source.playerQid !== row.playerId)
      errors.push(`Incorrect source identity for ${key}`)
    if (row.source?.provider === "espn" && (!row.source.sourceUrl || !row.source.season || !row.source.scope))
      errors.push(`Missing season provenance for ${key}`)
  }

  for (const question of database.questions) {
    if (questionIds.has(question.id)) errors.push(`Duplicate question ${question.id}`)
    questionIds.add(question.id)
    if (
      !question.prompt ||
      !["club_pair", "club_nationality", "club_era", "three_clubs"].includes(question.type)
    )
      errors.push(`Invalid question ${question.id}`)
    if (question.clubIds.some((id) => !clubIds.has(id)))
      errors.push(`Unknown club in question ${question.id}`)
    const expectedClubs = { club_pair: 2, club_nationality: 1, three_clubs: 3 }[question.type]
    if (
      question.clubIds.length !== expectedClubs ||
      new Set(question.clubIds).size !== question.clubIds.length
    )
      errors.push(`Invalid club criteria in ${question.id}`)
    if (question.answers.length !== question.answerCount)
      errors.push(`Answer count mismatch in ${question.id}`)
    if (new Set(question.answers.map(({ playerId }) => playerId)).size !== question.answers.length)
      errors.push(`Duplicate answer in ${question.id}`)
    for (const answer of question.answers) {
      if (!playerIds.has(answer.playerId)) errors.push(`Unknown answer player in ${question.id}`)
      if (!allowedPoints.has(answer.points)) errors.push(`Invalid score in ${question.id}`)
      if (
        !Array.isArray(answer.appearances) ||
        answer.appearances.length !== question.clubIds.length ||
        answer.appearances.some((count) => !Number.isInteger(count) || count < 1)
      )
        errors.push(`Invalid answer appearances in ${question.id}`)
      for (const [index, clubId] of question.clubIds.entries()) {
        if (relationships.get(`${answer.playerId}:${clubId}`)?.appearances !== answer.appearances[index])
          errors.push(
            `Answer lacks matching appearance evidence in ${question.id}: ${answer.playerId}/${clubId}`
          )
      }
      const count = Math.min(...answer.appearances)
      const expectedPoints = count <= 4 ? 100 : count <= 19 ? 85 : count <= 49 ? 60 : count <= 99 ? 30 : 10
      if (answer.points !== expectedPoints)
        errors.push(`Incorrect rarity score in ${question.id}: ${answer.playerId}`)
      if (
        question.type === "club_nationality" &&
        !players.get(answer.playerId)?.nationalities.includes(question.nationality)
      )
        errors.push(`Citizenship mismatch in ${question.id}: ${answer.playerId}`)
    }
  }

  const types = Object.fromEntries(
    ["club_pair", "club_nationality", "club_era", "three_clubs"].map((type) => [
      type,
      database.questions.filter((question) => question.type === type).length,
    ])
  )
  for (const [type, count] of Object.entries(types))
    if (type !== "club_era" && !count) errors.push(`No questions generated for ${type}`)
  if (types.club_era) errors.push("Era questions require dated match evidence")
  // Recompute complete answer sets: validates omissions as well as invalid inclusions.
  if (JSON.stringify(database.questions) !== JSON.stringify(buildQuestions(database)))
    errors.push("Question bank does not match the complete source-derived answer sets")
  if (
    requireRosters &&
    (database.rosters?.length !== database.clubs.length ||
      new Set(database.rosters?.map((row) => row.clubId)).size !== database.clubs.length)
  )
    errors.push("Missing current club rosters")
  for (const roster of database.rosters ?? []) {
    if (
      !clubIds.has(roster.clubId) ||
      !roster.sourceUrl ||
      !roster.retrievedAt ||
      !roster.season ||
      roster.players.length < 15
    )
      errors.push(`Incomplete roster ${roster.clubId}`)
    if (new Set(roster.players.map((player) => player.playerId)).size !== roster.players.length)
      errors.push(`Duplicate roster player ${roster.clubId}`)
    for (const player of roster.players)
      if (!playerIds.has(player.playerId)) errors.push(`Unsearchable roster player ${player.playerId}`)
  }
  if (!database.meta?.provisional || !database.meta?.generatedAt || !database.meta?.source)
    errors.push("Database metadata is incomplete")

  return errors
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = new URL("../public/data/deepcuts/database.json", import.meta.url)
  const database = JSON.parse(await readFile(path, "utf8"))

  const errors = validateDatabase(database)
  if (errors.length) {
    console.error(errors.slice(0, 100).join("\n"))
    console.error(`${errors.length} validation errors`)
    process.exit(1)
  }
  const size = (await stat(path)).size
  console.log(
    JSON.stringify(
      {
        valid: true,
        size,
        clubs: database.clubs.length,
        players: database.players.length,
        appearances: database.appearances.length,
        questions: database.questions.length,
        types: Object.fromEntries(
          ["club_pair", "club_nationality", "club_era", "three_clubs"].map((type) => [
            type,
            database.questions.filter((q) => q.type === type).length,
          ])
        ),
      },
      null,
      2
    )
  )
}
