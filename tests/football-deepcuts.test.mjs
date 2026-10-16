import test from "node:test"
import assert from "node:assert/strict"
import { scoreClubPair } from "../lib/football-deepcuts/scoring.ts"
import { generateQuestionBank, generateQuestionCandidate } from "../lib/football-deepcuts/question-generator.ts"
import { buildSearchTerms, canonicalClubPairId, normalizeSearchText } from "../lib/football-deepcuts/normalize.ts"
import { verifyAppearanceRecord } from "../lib/football-deepcuts/verification.ts"
import { buildWikidataClubQuery, mapWikidataRows } from "../lib/football-deepcuts/providers/wikidata.ts"
import { selectDailyQuestions } from "../lib/football-deepcuts/daily-selector.ts"
import { buildPlayerSearchIndex, searchPlayers } from "../lib/football-deepcuts/player-search.ts"
import { challengeNumber, selectStaticDailyQuestions } from "../lib/football-deepcuts/static-game.ts"
import { recordGuess } from "../lib/football-deepcuts/attempts.ts"
import { readFile } from "node:fs/promises"
import { validateDatabase } from "../scripts/validate-deepcuts-database.mjs"

test("three-guess rule rejects repeats and stops only on success or the third miss", () => {
  const first = recordGuess([], { playerId: "a", playerName: "A" }, false)
  assert.equal(first.finished, false)
  assert.throws(() => recordGuess(first.guesses, { playerId: "a", playerName: "A" }, false), /already tried/)
  const second = recordGuess(first.guesses, { playerId: "b", playerName: "B" }, false)
  assert.equal(second.remaining, 1)
  assert.equal(second.finished, false)
  const third = recordGuess(second.guesses, { playerId: "c", playerName: "C" }, false)
  assert.equal(third.finished, true)
  assert.equal(third.remaining, 0)
  assert.throws(() => recordGuess(third.guesses, { playerId: "d", playerName: "D" }, true), /No guesses/)
  assert.equal(recordGuess(first.guesses, { playerId: "b", playerName: "B" }, true).finished, true)
})

test("database validation detects unsupported answers, omitted answers, wrong scores and missing rosters", async () => {
  const database = JSON.parse(await readFile(new URL("../public/data/deepcuts/database.json", import.meta.url), "utf8"))
  assert.deepEqual(validateDatabase(database), [])
  const badScore = structuredClone(database)
  badScore.questions[0].answers[0].points = badScore.questions[0].answers[0].points === 100 ? 10 : 100
  assert.ok(validateDatabase(badScore).some(error => error.includes("Incorrect rarity score")))
  const unsupported = structuredClone(database)
  unsupported.questions[0].answers[0].appearances[0] += 1
  assert.ok(validateDatabase(unsupported).some(error => error.includes("matching appearance evidence")))
  const omitted = structuredClone(database)
  omitted.questions[0].answers.pop()
  omitted.questions[0].answerCount -= 1
  assert.ok(validateDatabase(omitted).some(error => error.includes("complete source-derived answer sets")))
  const missingRoster = structuredClone(database)
  missingRoster.rosters.pop()
  assert.ok(validateDatabase(missingRoster).some(error => error.includes("Missing current club rosters")))
  const wrongCitizenship = structuredClone(database)
  const question = wrongCitizenship.questions.find(question => question.type === "club_nationality")
  question.nationality = "Invalid citizenship"
  assert.ok(validateDatabase(wrongCitizenship).some(error => error.includes("Citizenship mismatch")))
})

test("scores every configured boundary from the smaller appearance count", () => {
  for (const [count, expected] of [[1, 100], [4, 100], [5, 85], [19, 85], [20, 60], [49, 60], [50, 30], [99, 30], [100, 10], [500, 10]]) {
    assert.equal(scoreClubPair(count, 999), expected)
    assert.equal(scoreClubPair(999, count), expected)
  }
})

test("rejects missing, zero, fractional, and negative appearance counts", () => {
  for (const value of [undefined, 0, -1, 1.5]) assert.throws(() => scoreClubPair(value, 10))
})

test("candidate generator includes only verified positive records and freezes scores", () => {
  const source = { provider: "test", externalId: "fixture", retrievedAt: "2026-01-01" }
  const rows = Array.from({ length: 8 }, (_, index) => [
    { id: `a${index}`, playerId: `p${index}`, clubId: "a", competitiveAppearances: index + 1, verificationStatus: "verified", source },
    { id: `b${index}`, playerId: `p${index}`, clubId: "b", competitiveAppearances: 100, verificationStatus: "verified", source },
  ]).flat()
  rows.push({ id: "pending", playerId: "p9", clubId: "a", competitiveAppearances: 2, verificationStatus: "pending", source })
  const result = generateQuestionCandidate("a", "b", rows, "2026-10-14T00:00:00Z")
  assert.deepEqual(result.rejectionReasons, [])
  assert.equal(result.candidate?.answerCount, 8)
  assert.equal(result.candidate?.answers[0].points, 100)
  assert.equal(result.candidate?.answers[0].calculatedAt, "2026-10-14T00:00:00Z")
})

test("normalizes diacritics, punctuation, aliases, and club-pair ordering", () => {
  assert.equal(normalizeSearchText("  João Félix!  "), "joao felix")
  assert.deepEqual(buildSearchTerms("Ángel Di María", ["Angel di Maria", "Di María"]), ["angel di maria", "di maria"])
  assert.equal(canonicalClubPairId("real-madrid", "chelsea"), "chelsea__real-madrid")
})

test("verification gate requires provenance, a positive count, and explicit verification", () => {
  const source = { provider: "licensed-source", externalId: "123", retrievedAt: "2026-10-14" }
  const valid = { id: "row", playerId: "p", clubId: "c", competitiveAppearances: 1, source, verifiedAt: "2026-10-14", verificationStatus: "verified" }
  assert.deepEqual(verifyAppearanceRecord(valid), { eligible: true, reasons: [] })
  assert.equal(verifyAppearanceRecord({ ...valid, competitiveAppearances: undefined }).eligible, false)
  assert.equal(verifyAppearanceRecord({ ...valid, verificationStatus: "pending" }).eligible, false)
})

test("Wikidata importer creates pending leads and never treats membership as verification", () => {
  const rows = [{
    player: { value: "http://www.wikidata.org/entity/Q1" }, playerLabel: { value: "Test Player" },
    club: { value: "http://www.wikidata.org/entity/Q2" }, clubLabel: { value: "Test Club" },
    matches: { value: "12" },
  }]
  const batch = mapWikidataRows(rows, "2026-10-14T00:00:00Z")
  assert.equal(batch.players[0].verificationStatus, "pending")
  assert.equal(batch.appearances[0].competitiveAppearances, 12)
  assert.equal(batch.appearances[0].verificationStatus, "pending")
  assert.match(buildWikidataClubQuery(["Q2"], 10), /pq:P1350/)
})

test("daily selection is deterministic, excludes recent pairs, and spreads clubs", () => {
  const candidate = (id, a, b, answerCount = 20) => ({ id, clubAId: a, clubBId: b, status: "approved", answerCount, tierDistribution: { 100: 2, 60: 3 }, hasIdentityConflicts: false, answers: [], generatedAt: "2026-10-14" })
  const candidates = [candidate("ab", "a", "b"), candidate("ac", "a", "c"), candidate("de", "d", "e"), candidate("fg", "f", "g"), candidate("hi", "h", "i"), candidate("jk", "j", "k")]
  const options = { count: 5, seed: "2026-10-14", recentPairIds: new Set(["ab"]) }
  const first = selectDailyQuestions(candidates, options).map(({ id }) => id)
  const second = selectDailyQuestions(candidates, options).map(({ id }) => id)
  assert.deepEqual(first, second)
  assert.equal(first.includes("ab"), false)
  assert.equal(new Set(first).size, 5)
})

test("question-bank generation discovers club pairs and reports scoring tiers", () => {
  const source = { provider: "test", externalId: "fixture", retrievedAt: "2026-01-01" }
  const rows = Array.from({ length: 8 }, (_, index) => [
    { id: `a${index}`, playerId: `p${index}`, clubId: "a", competitiveAppearances: index + 1, verificationStatus: "verified", source },
    { id: `b${index}`, playerId: `p${index}`, clubId: "b", competitiveAppearances: 100, verificationStatus: "verified", source },
  ]).flat()
  const report = generateQuestionBank(rows, "2026-10-14T00:00:00Z")
  assert.equal(report.candidates.length, 1)
  assert.equal(report.candidates[0].id, "a__b")
  assert.equal(report.tierTotals[100], 4)
  assert.equal(report.tierTotals[85], 4)
})

test("general player search handles aliases and diacritics without an answer list", () => {
  const players = [
    { id: "1", canonicalName: "João Félix Sequeira", displayName: "João Félix", alternativeNames: ["Joao Felix"], nationality: "Portugal", dateOfBirth: "1999-11-10", sources: [], verificationStatus: "verified" },
    { id: "2", canonicalName: "João Pedro", displayName: "João Pedro", alternativeNames: [], nationality: "Brazil", sources: [], verificationStatus: "pending" },
  ]
  const index = buildPlayerSearchIndex(players)
  assert.equal(searchPlayers(index, "joao f")[0].playerId, "1")
  assert.equal(searchPlayers(index, "felix")[0].displayName, "João Félix")
  assert.equal(index[0].disambiguation.includes("Portugal"), true)
})

test("static daily selection is reproducible and mixes question formats", () => {
  const types = ["club_pair", "club_nationality", "club_era", "three_clubs"]
  const questions = Array.from({ length: 12 }, (_, index) => ({ id: `q${index}`, type: types[index % 4], prompt: "Question", clubIds: [], answerCount: 8, answers: [] }))
  const first = selectStaticDailyQuestions(questions, "2026-10-14")
  const second = selectStaticDailyQuestions(questions, "2026-10-14")
  assert.deepEqual(first.map(({ id }) => id), second.map(({ id }) => id))
  assert.equal(new Set(first.map(({ type }) => type)).size, 4)
  assert.equal(challengeNumber("2026-01-01"), 1)
})
