import { scoreClubPair, SCORING_VERSION } from "./scoring.ts"
import type { FrozenAnswer, PlayerClubAppearance, QuestionBankEntry, RarityPoints } from "./types.ts"

export interface QuestionQualityConfig {
  minimumAnswers: number
  preferredMinimumAnswers: number
  preferredMaximumAnswers: number
  minimumRarityTiers: number
}

export const DEFAULT_QUALITY_CONFIG: QuestionQualityConfig = {
  minimumAnswers: 8,
  preferredMinimumAnswers: 15,
  preferredMaximumAnswers: 40,
  minimumRarityTiers: 2,
}

export interface CandidateResult {
  candidate?: QuestionBankEntry
  rejectionReasons: string[]
}

export interface QuestionBankReport {
  candidates: QuestionBankEntry[]
  rejected: QuestionBankEntry[]
  tierTotals: Partial<Record<RarityPoints, number>>
}

export function generateQuestionBank(
  appearances: readonly PlayerClubAppearance[],
  now: string,
  config: QuestionQualityConfig = DEFAULT_QUALITY_CONFIG
): QuestionBankReport {
  const clubsByPlayer = new Map<string, Set<string>>()
  for (const row of appearances) {
    if (
      row.verificationStatus !== "verified" ||
      row.competitiveAppearances === undefined ||
      row.competitiveAppearances < 1
    )
      continue
    const clubs = clubsByPlayer.get(row.playerId) ?? new Set<string>()
    clubs.add(row.clubId)
    clubsByPlayer.set(row.playerId, clubs)
  }
  const pairIds = new Map<string, [string, string]>()
  for (const clubs of clubsByPlayer.values()) {
    const sorted = [...clubs].sort()
    for (let first = 0; first < sorted.length; first++) {
      for (let second = first + 1; second < sorted.length; second++) {
        pairIds.set(`${sorted[first]}__${sorted[second]}`, [sorted[first], sorted[second]])
      }
    }
  }
  const generated = [...pairIds.values()]
    .map(
      ([clubAId, clubBId]) => generateQuestionCandidate(clubAId, clubBId, appearances, now, config).candidate
    )
    .filter((candidate): candidate is QuestionBankEntry => Boolean(candidate))
  const candidates = generated.filter(({ status }) => status === "candidate")
  const rejected = generated.filter(({ status }) => status === "rejected")
  const tierTotals: Partial<Record<RarityPoints, number>> = {}
  for (const candidate of candidates) {
    for (const [points, count] of Object.entries(candidate.tierDistribution)) {
      const tier = Number(points) as RarityPoints
      tierTotals[tier] = (tierTotals[tier] ?? 0) + (count ?? 0)
    }
  }
  return { candidates, rejected, tierTotals }
}

export function generateQuestionCandidate(
  clubAId: string,
  clubBId: string,
  appearances: readonly PlayerClubAppearance[],
  now: string,
  config: QuestionQualityConfig = DEFAULT_QUALITY_CONFIG
): CandidateResult {
  if (clubAId === clubBId) return { rejectionReasons: ["A question requires two different clubs"] }

  const verified = appearances.filter(
    (row) =>
      row.verificationStatus === "verified" &&
      row.competitiveAppearances !== undefined &&
      row.competitiveAppearances > 0
  )
  const byPlayer = new Map<string, Map<string, PlayerClubAppearance>>()
  for (const row of verified) {
    if (row.clubId !== clubAId && row.clubId !== clubBId) continue
    const clubs = byPlayer.get(row.playerId) ?? new Map<string, PlayerClubAppearance>()
    if (clubs.has(row.clubId))
      return { rejectionReasons: [`Unresolved duplicate record for player ${row.playerId}`] }
    clubs.set(row.clubId, row)
    byPlayer.set(row.playerId, clubs)
  }

  const answers: FrozenAnswer[] = []
  for (const [playerId, clubs] of Array.from(byPlayer.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const a = clubs.get(clubAId)
    const b = clubs.get(clubBId)
    if (!a || !b) continue
    answers.push({
      playerId,
      clubAAppearances: a.competitiveAppearances!,
      clubBAppearances: b.competitiveAppearances!,
      points: scoreClubPair(a.competitiveAppearances, b.competitiveAppearances),
      calculatedAt: now,
      scoringVersion: SCORING_VERSION,
    })
  }

  const rejectionReasons: string[] = []
  if (answers.length < config.minimumAnswers)
    rejectionReasons.push(`Only ${answers.length} verified answers; ${config.minimumAnswers} required`)
  const tierDistribution: Partial<Record<RarityPoints, number>> = {}
  for (const answer of answers) tierDistribution[answer.points] = (tierDistribution[answer.points] ?? 0) + 1
  if (Object.keys(tierDistribution).length < config.minimumRarityTiers)
    rejectionReasons.push("Insufficient rarity-tier variety")

  return {
    rejectionReasons,
    candidate: {
      id: [clubAId, clubBId].sort().join("__"),
      clubAId,
      clubBId,
      status: rejectionReasons.length ? "rejected" : "candidate",
      answerCount: answers.length,
      tierDistribution,
      hasIdentityConflicts: false,
      answers,
      generatedAt: now,
    },
  }
}
