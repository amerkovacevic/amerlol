import { describe, expect, it } from "vitest"
import { checkGuess, getDailyWord, nextStats, scoreGame, type GameResult } from "../lib/apps/gauntlet"

const result = (overrides: Partial<GameResult> = {}): GameResult => ({
  date: "2026-03-02",
  word: "SWORD",
  attempts: 3,
  time: 95,
  completed: true,
  score: 891,
  hintsUsed: 0,
  ...overrides,
})

describe("Amer Gauntlet rules", () => {
  it("is deterministic per UTC date", () => {
    expect(getDailyWord("2026-10-26")).toBe(getDailyWord("2026-10-26"))
    expect(getDailyWord("2026-10-26")).toMatch(/^[A-Z]+$/)
  })

  it("marks repeated letters only as often as the word contains them", () => {
    expect(checkGuess("LLAMA", "HELLO")).toEqual(["present", "present", "absent", "absent", "absent"])
    expect(checkGuess("HELLO", "HELLO")).toEqual(Array(5).fill("correct"))
    expect(checkGuess("OOOOO", "HELLO")).toEqual(["absent", "absent", "absent", "absent", "correct"])
  })

  it("scores only wins and never goes below zero", () => {
    expect(scoreGame({ won: true, seconds: 95, attempts: 3, hintsUsed: 0 })).toBe(891)
    expect(scoreGame({ won: true, seconds: 95, attempts: 3, hintsUsed: 1 })).toBe(791)
    expect(scoreGame({ won: false, seconds: 5, attempts: 6, hintsUsed: 0 })).toBe(0)
    expect(scoreGame({ won: true, seconds: 100_000, attempts: 6, hintsUsed: 1 })).toBe(0)
  })

  it("continues the streak across a UTC month boundary", () => {
    const yesterday = nextStats(undefined, result({ date: "2026-03-01" }))
    expect(nextStats(yesterday, result({ date: "2026-03-02" })).currentStreak).toBe(2)
  })

  it("restarts the streak after a missed day and keeps the best", () => {
    let stats = nextStats(undefined, result({ date: "2026-03-01" }))
    stats = nextStats(stats, result({ date: "2026-03-02" }))
    stats = nextStats(stats, result({ date: "2026-03-05", completed: false, score: 0, time: 200, attempts: 6 }))
    expect(stats).toMatchObject({ totalGames: 3, wins: 2, currentStreak: 0, bestStreak: 2, fastestTime: 95 })
  })
})
