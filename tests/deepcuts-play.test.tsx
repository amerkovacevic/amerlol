import * as React from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { FootballDeepcutsMain } from "../components/apps/football-deepcuts/football-deepcuts-main"

const mocks = vi.hoisted(() => ({
  identity: vi.fn(async () => ({ uid: "guest", isAnonymous: true })),
  save: vi.fn(async () => {}),
}))
vi.mock("@/components/auth/auth-provider", () => ({ useAuth: () => ({ user: null, loading: false, ensurePlayerIdentity: mocks.identity }) }))
vi.mock("@/components/apps/settings-provider", () => ({ useAppSettings: () => ({ showAnswerCount: true, showQuestionMix: false }) }))
vi.mock("@/lib/football-deepcuts/firestore", () => ({ loadStoredGame: async () => null, saveCompletedGame: mocks.save, publishLeaderboardEntry: vi.fn() }))

const players = ["Wrong One", "Wrong Two", "Wrong Three", "Right Player"].map((name, index) => ({ id: `p${index}`, name, aliases: [], nationalities: [] }))
const database = {
  meta: { provisional: true, generatedAt: "2026-10-16" },
  clubs: [{ id: "a", name: "Club A" }, { id: "b", name: "Club B" }], players,
  questions: Array.from({ length: 5 }, (_, index) => ({ id: `q${index}`, type: "club_pair", clubIds: ["a", "b"], prompt: "Connect these clubs", answerCount: 1, answers: [{ playerId: "p3", points: 85, appearances: [8, 20] }] })),
}

beforeEach(() => {
  localStorage.clear()
  mocks.save.mockClear()
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => database })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function guess(name: string) {
  const input = await screen.findByRole("combobox")
  fireEvent.change(input, { target: { value: name } })
  fireEvent.click(await screen.findByRole("option", { name }))
  fireEvent.click(screen.getByRole("button", { name: "Submit answer" }))
}

it("keeps the question open after two misses, restores attempts, then advances after the third", async () => {
  const view = render(<FootballDeepcutsMain />)
  await guess("Wrong One")
  expect(screen.getByText(/2 of 3 guesses remaining/)).toBeTruthy()
  await guess("Wrong Two")
  expect(screen.getByText(/1 of 3 guesses remaining/)).toBeTruthy()
  view.unmount()
  render(<FootballDeepcutsMain />)
  await screen.findByRole("combobox")
  expect(screen.getByText(/1 of 3 guesses remaining/)).toBeTruthy()
  await guess("Wrong Three")
  expect(screen.getByText("2 of 5")).toBeTruthy()
  expect(screen.getByText(/3 of 3 guesses remaining/)).toBeTruthy()
  expect(mocks.save).not.toHaveBeenCalled()
})

it("accepts a correct second guess once and continues with a fresh allowance", async () => {
  render(<FootballDeepcutsMain />)
  await guess("Wrong One")
  await guess("Right Player")
  expect(screen.getByText("Right Player scores +85")).toBeTruthy()
  expect(screen.queryByRole("combobox")).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
  expect(screen.getByText("2 of 5")).toBeTruthy()
  expect(screen.getByText(/3 of 3 guesses remaining/)).toBeTruthy()
})

it("finishes and saves five zero-score results after fifteen wrong guesses", async () => {
  render(<FootballDeepcutsMain />)
  for (let index = 0; index < 5; index++) for (const player of players.slice(0, 3)) await guess(player.name)
  await screen.findByText("Challenge complete")
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
  const result = mocks.save.mock.calls[0] as unknown as [unknown, { score: number; answers: { guesses: unknown[] }[] }]
  expect(result[1].score).toBe(0)
  expect(result[1].answers).toHaveLength(5)
  expect(result[1].answers.every(answer => answer.guesses.length === 3)).toBe(true)
})
