export type StaticQuestionType = "club_pair" | "club_nationality" | "club_era" | "three_clubs"

export interface StaticAnswer {
  playerId: string
  points: number
  appearances: number[]
  appearanceScopes?: string[]
}
export interface StaticQuestion {
  id: string
  type: StaticQuestionType
  prompt: string
  clubIds: string[]
  answerCount: number
  answers: StaticAnswer[]
  nationality?: string
  decade?: number
}

function hash(value: string): number {
  let result = 2166136261
  for (const character of value) {
    result ^= character.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

export function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function challengeNumber(utcDate: string): number {
  return (
    Math.floor((Date.parse(`${utcDate}T00:00:00Z`) - Date.parse("2026-01-01T00:00:00Z")) / 86_400_000) + 1
  )
}

export function selectStaticDailyQuestions(
  questions: readonly StaticQuestion[],
  utcDate: string,
  count = 5
): StaticQuestion[] {
  if (questions.length < count) throw new Error("Not enough static questions")
  const ordered = [...questions].sort((a, b) => hash(`${utcDate}:${a.id}`) - hash(`${utcDate}:${b.id}`))
  const selected: StaticQuestion[] = []
  for (const type of ["club_pair", "club_nationality", "club_era", "three_clubs"] as const) {
    const match = ordered.find((question) => question.type === type && !selected.includes(question))
    if (match && selected.length < count) selected.push(match)
  }
  for (const question of ordered) {
    if (selected.length === count) break
    if (!selected.includes(question)) selected.push(question)
  }
  return selected
}
