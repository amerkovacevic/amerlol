import type { QuestionBankEntry } from "./types.ts"

export interface SelectionOptions {
  count?: number
  recentPairIds?: ReadonlySet<string>
  seed: string
}

function seededValue(seed: string, value: string): number {
  let hash = 2166136261
  for (const character of `${seed}:${value}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function selectDailyQuestions(candidates: readonly QuestionBankEntry[], options: SelectionOptions): QuestionBankEntry[] {
  const count = options.count ?? 5
  if (!Number.isInteger(count) || count < 1) throw new Error("Question count must be a positive integer")
  const eligible = candidates.filter((candidate) => candidate.status === "approved" && !candidate.hasIdentityConflicts && !options.recentPairIds?.has(candidate.id))
  const ordered = [...eligible].sort((a, b) => {
    const aPreferred = a.answerCount >= 15 && a.answerCount <= 40 ? 1 : 0
    const bPreferred = b.answerCount >= 15 && b.answerCount <= 40 ? 1 : 0
    if (aPreferred !== bPreferred) return bPreferred - aPreferred
    const tierDifference = Object.keys(b.tierDistribution).length - Object.keys(a.tierDistribution).length
    if (tierDifference) return tierDifference
    return seededValue(options.seed, a.id) - seededValue(options.seed, b.id)
  })
  if (ordered.length < count) throw new Error(`Only ${ordered.length} eligible questions are available; ${count} required`)

  const selected: QuestionBankEntry[] = []
  const clubUse = new Map<string, number>()
  while (selected.length < count) {
    const next = ordered
      .filter((candidate) => !selected.includes(candidate))
      .sort((a, b) => {
        const aUse = (clubUse.get(a.clubAId) ?? 0) + (clubUse.get(a.clubBId) ?? 0)
        const bUse = (clubUse.get(b.clubAId) ?? 0) + (clubUse.get(b.clubBId) ?? 0)
        return aUse - bUse || ordered.indexOf(a) - ordered.indexOf(b)
      })[0]
    selected.push(next)
    clubUse.set(next.clubAId, (clubUse.get(next.clubAId) ?? 0) + 1)
    clubUse.set(next.clubBId, (clubUse.get(next.clubBId) ?? 0) + 1)
  }
  return selected
}
