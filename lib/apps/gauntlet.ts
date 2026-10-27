export const MAX_ATTEMPTS = 6
export const HINT_PENALTY = 100

export type LetterResult = "correct" | "present" | "absent"

export interface GameResult {
  date: string
  word: string
  attempts: number
  time: number
  /** True when the word was solved. */
  completed: boolean
  score: number
  hintsUsed: number
}

export interface GauntletStats {
  totalGames: number
  wins: number
  currentStreak: number
  bestStreak: number
  averageScore: number
  totalScore: number
  fastestTime: number
  perfectGames: number
  lastPlayedDate?: string
}

export const EMPTY_STATS: GauntletStats = {
  totalGames: 0,
  wins: 0,
  currentStreak: 0,
  bestStreak: 0,
  averageScore: 0,
  totalScore: 0,
  fastestTime: 0,
  perfectGames: 0,
}

// The order matters: existing daily words are derived from each word's index.
const WORD_LIST = [
  "GAUNT",
  "SHIELD",
  "SWORD",
  "QUEST",
  "KNIGHT",
  "DRAGON",
  "CASTLE",
  "HERO",
  "MAGIC",
  "POWER",
  "BRAVE",
  "HONOR",
  "GLORY",
  "VICTOR",
  "CHAMP",
  "LEGEND",
  "MIGHT",
  "FORCE",
  "STORM",
  "FLAME",
  "THUNDER",
  "LIGHT",
  "DARK",
  "SHADOW",
  "GUARD",
  "DEFEND",
  "ATTACK",
  "STRIKE",
  "BLADE",
  "ARMOR",
  "BATTLE",
  "WAR",
  "PEACE",
  "HOPE",
  "FAITH",
  "TRUTH",
  "WISDOM",
  "COURAGE",
  "STRENGTH",
  "SPIRIT",
]

/** The word for a UTC date (YYYY-MM-DD). Deterministic, so every player gets the same word. */
export function getDailyWord(utcDate: string): string {
  let hash = 0
  for (const character of utcDate.replaceAll("-", "")) {
    hash = (hash << 5) - hash + character.charCodeAt(0)
    hash |= 0
  }
  return WORD_LIST[Math.abs(hash) % WORD_LIST.length]
}

/** Wordle-style scoring: exact matches first, then each remaining letter at most once. */
export function checkGuess(guess: string, word: string): LetterResult[] {
  const result: LetterResult[] = Array.from({ length: guess.length }, () => "absent")
  const unmatched = [...word]
  for (let index = 0; index < guess.length; index++) {
    if (guess[index] === word[index]) {
      result[index] = "correct"
      unmatched[index] = ""
    }
  }
  for (let index = 0; index < guess.length; index++) {
    if (result[index] === "correct") continue
    const position = unmatched.indexOf(guess[index])
    if (position !== -1) {
      result[index] = "present"
      unmatched[position] = ""
    }
  }
  return result
}

export function scoreGame({
  won,
  seconds,
  attempts,
  hintsUsed,
}: {
  won: boolean
  seconds: number
  attempts: number
  hintsUsed: number
}) {
  if (!won) return 0
  // One point per ten seconds, 50 per extra attempt, 100 per hint.
  return Math.max(0, 1000 - Math.floor(seconds / 10) - (attempts - 1) * 50 - hintsUsed * HINT_PENALTY)
}

function previousUtcDate(utcDate: string): string {
  const date = new Date(`${utcDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

/** Stats after recording `result`. The streak counts consecutive days played, starting with a win. */
export function nextStats(previous: GauntletStats | undefined, result: GameResult): GauntletStats {
  const stats = previous ?? EMPTY_STATS
  const totalGames = stats.totalGames + 1
  const totalScore = stats.totalScore + result.score
  const currentStreak =
    stats.lastPlayedDate === previousUtcDate(result.date) ? stats.currentStreak + 1 : result.completed ? 1 : 0
  return {
    totalGames,
    wins: stats.wins + (result.completed ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(currentStreak, stats.bestStreak),
    averageScore: Math.floor(totalScore / totalGames),
    totalScore,
    fastestTime: stats.fastestTime > 0 ? Math.min(stats.fastestTime, result.time) : result.time,
    perfectGames: stats.perfectGames + (result.attempts === 1 ? 1 : 0),
    lastPlayedDate: result.date,
  }
}

export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

const EMOJI: Record<LetterResult, string> = { correct: "🟩", present: "🟨", absent: "⬛" }

export function shareText(result: GameResult, rows: LetterResult[][]): string {
  return [
    `Amer Gauntlet ${result.date}`,
    `Attempts: ${result.attempts}/${MAX_ATTEMPTS}`,
    `Time: ${formatDuration(result.time)}`,
    `Score: ${result.score}`,
    "",
    ...rows.map((row) => row.map((letter) => EMOJI[letter]).join("")),
  ].join("\n")
}
