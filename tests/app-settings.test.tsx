import * as React from "react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  SETTINGS,
  defaultSettings,
  readSettings,
  settingsStorageKey,
  validateSettings,
  parseSettingsImport,
  type SettingsAppId,
} from "../lib/apps/settings"
import { AppSettingsProvider, useSettingsContext } from "../components/apps/settings-provider"
import { AppSettingsPanel } from "../components/apps/app-settings-panel"
import { calculateTextDiff } from "../lib/apps/text-diff"
import { changeGameMembership } from "../lib/apps/game-membership"
import { formatZoneTime, timezoneOffset } from "../lib/apps/timezone"
import { APP_REGISTRY, validateAppRegistry } from "../lib/apps/registry"
import { parseLetterboxdCsv, safeMovieUrl, isMovieList } from "../lib/apps/watchlist"
import { StickrProvider, useStickr } from "../components/apps/stickr/stickr-provider"

const state = vi.hoisted(() => ({
  user: null as null | { uid: string },
  documents: new Map<string, Record<string, unknown>>(),
  writes: vi.fn(),
  failRead: false,
  failWrite: false,
  listeners: new Map<string, (snapshot: unknown) => void>(),
}))
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ user: state.user, account: state.user, loading: false }),
}))
vi.mock("@/lib/firebase/db", () => ({ db: {} }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => path.join("/"),
  serverTimestamp: () => "server-time",
  onSnapshot: (path: string, next: (snapshot: unknown) => void, fail: () => void) => {
    if (state.failRead) {
      fail()
      return () => {}
    }
    state.listeners.set(path, next)
    next({
      exists: () => state.documents.has(path),
      data: () => state.documents.get(path),
    })
    return () => {
      state.listeners.delete(path)
    }
  },
  runTransaction: async (_db: unknown, callback: (transaction: unknown) => Promise<void>) => {
    if (state.failWrite) throw new Error("Network unavailable")
    return await callback({
      get: async (path: string) => ({
        exists: () => state.documents.has(path),
        data: () => state.documents.get(path),
      }),
      set: (path: string, values: Record<string, unknown>, options: { merge: boolean }) => {
        state.writes(path, values, options)
        state.documents.set(path, {
          ...(options.merge ? state.documents.get(path) : {}),
          ...values,
        })
        queueMicrotask(() =>
          state.listeners.get(path)?.({
            exists: () => true,
            data: () => state.documents.get(path),
          })
        )
      },
    })
  },
}))

function Probe() {
  const context = useSettingsContext()
  return <output data-testid="values">{JSON.stringify(context.values)}</output>
}
const panel = (appId: SettingsAppId) => (
  <AppSettingsProvider appId={appId}>
    <AppSettingsPanel />
    <Probe />
  </AppSettingsProvider>
)
const values = () => JSON.parse(screen.getByTestId("values").textContent!)
beforeEach(() => {
  localStorage.clear()
  state.documents.clear()
  state.listeners.clear()
  state.writes.mockClear()
  state.user = null
  state.failRead = false
  state.failWrite = false
})
afterEach(cleanup)

describe("all app settings", () => {
  it("accepts current and legacy exports while rejecting another app's export", () => {
    expect(
      parseSettingsImport("encryption", {
        appId: "encryption",
        version: 1,
        settings: { fontSize: 18 },
      }).fontSize
    ).toBe(18)
    expect(parseSettingsImport("encryption", { fontSize: 20 }).fontSize).toBe(20)
    expect(() =>
      parseSettingsImport("encryption", {
        appId: "diffchecker",
        version: 1,
        settings: { fontSize: 18 },
      })
    ).toThrow()
    expect(() => parseSettingsImport("encryption", { unrelated: true })).toThrow()
  })
  it("covers every registered app, keeping Stickr's combined list/settings provider separate", () => {
    expect(validateAppRegistry()).toEqual({ valid: true, errors: [] })
    expect(APP_REGISTRY.map((app) => app.appId).sort()).toEqual([...Object.keys(SETTINGS), "stickr"].sort())
  })
  for (const appId of Object.keys(SETTINGS) as SettingsAppId[]) {
    it(`${appId}: loads without writes, saves validated preferences, cancels drafts and resets without touching data`, async () => {
      const originalData = JSON.stringify({
        movies: ["keep"],
        results: [500],
        duplicates: ["FWC-1"],
        exchanges: ["keep"],
      })
      localStorage.setItem("existing-user-data", originalData)
      const setItem = vi.spyOn(Storage.prototype, "setItem")
      render(panel(appId))
      await screen.findByRole("button", { name: "Reset preferences" })
      expect(setItem).not.toHaveBeenCalled()
      expect(state.writes).not.toHaveBeenCalled()
      expect(values()).toEqual(defaultSettings(appId))
      const checkbox = screen.getAllByRole("checkbox")[0]
      const initialChecked = (checkbox as HTMLInputElement).checked
      const user = userEvent.setup()
      await user.click(checkbox)
      expect(values()).toEqual(defaultSettings(appId))
      await user.click(screen.getByRole("button", { name: "Cancel changes" }))
      expect((screen.getAllByRole("checkbox")[0] as HTMLInputElement).checked).toBe(initialChecked)
      await user.click(screen.getAllByRole("checkbox")[0])
      await user.click(screen.getByRole("button", { name: "Save settings" }))
      await waitFor(() => expect(localStorage.getItem(settingsStorageKey(appId))).not.toBeNull())
      expect(values()).not.toEqual(defaultSettings(appId))
      await user.click(screen.getByRole("button", { name: "Reset preferences" }))
      expect(values()).not.toEqual(defaultSettings(appId))
      await user.click(screen.getByRole("button", { name: "Save settings" }))
      await waitFor(() => expect(values()).toEqual(defaultSettings(appId)))
      expect(localStorage.getItem("existing-user-data")).toBe(originalData)
      expect(state.writes).not.toHaveBeenCalled()
    })
  }
  it("recovers malformed fields independently without mutating the source", () => {
    const raw = {
      fontSize: -1,
      ignoreCase: true,
      ignoreWhitespace: "yes",
      retainedMetadata: { keep: true },
    }
    const before = JSON.stringify(raw)
    expect(readSettings("diffchecker", raw)).toEqual({
      fontSize: 14,
      showLineNumbers: true,
      ignoreWhitespace: false,
      ignoreCase: true,
    })
    expect(JSON.stringify(raw)).toBe(before)
    expect(() => validateSettings("timezone", { defaultTimeZones: ["invalid-zone"] })).toThrow()
    expect(() => validateSettings("stl-monitor", { defaultSeverityRange: [90, 10] })).toThrow()
    expect(() => validateSettings("lmgtfy", { defaultAnimationSpeed: "2" })).toThrow()
    expect(() => validateSettings("encryption", { defaultTab: "missing" })).toThrow()
  })
  it("preserves legacy local settings without migrating on read", async () => {
    const raw = JSON.stringify({
      focusOnCorrectAnswer: false,
      futureField: "keep",
    })
    localStorage.setItem("atlas-sprint-settings", raw)
    render(panel("atlas-sprint"))
    await waitFor(() => expect(values().focusOnCorrectAnswer).toBe(false))
    expect(localStorage.getItem("atlas-sprint-settings")).toBe(raw)
    expect(localStorage.getItem(settingsStorageKey("atlas-sprint"))).toBeNull()
  })
  it("does not claim a save succeeded when local storage is blocked", async () => {
    render(panel("atlas-sprint"))
    await screen.findByRole("checkbox")
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage is full")
    })
    await userEvent.click(screen.getByRole("checkbox"))
    await userEvent.click(screen.getByRole("button", { name: "Save settings" }))
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Storage is full")
    expect(values().focusOnCorrectAnswer).toBe(true)
  })
  it("blocks saves after corrupt local data is detected and leaves that data intact", async () => {
    const key = settingsStorageKey("atlas-sprint")
    localStorage.setItem(key, "{broken")
    render(panel("atlas-sprint"))
    await screen.findByRole("alert")
    expect(
      (
        screen.getByRole("button", {
          name: "Save settings",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    expect(localStorage.getItem(key)).toBe("{broken")
  })
  it("rejects invalid imports without changing the stored settings", async () => {
    render(panel("encryption"))
    const input = await screen.findByLabelText("Import settings")
    const file = new File(['{"fontSize": -500}'], "bad.json", {
      type: "application/json",
    })
    Object.defineProperty(file, "text", {
      value: async () => '{"fontSize": -500}',
    })
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByRole("alert")
    expect(localStorage.getItem(settingsStorageKey("encryption"))).toBeNull()
  })
})

describe("account settings persistence", () => {
  it("merges local edits without overwriting unrelated preferences changed in another tab", async () => {
    const key = settingsStorageKey("diffchecker")
    localStorage.setItem(key, JSON.stringify({ fontSize: 14, ignoreCase: false, futureField: "keep" }))
    render(panel("diffchecker"))
    fireEvent.change(await screen.findByLabelText("Text size (px)"), {
      target: { value: "18" },
    })
    localStorage.setItem(key, JSON.stringify({ fontSize: 14, ignoreCase: true, futureField: "keep" }))
    await userEvent.click(screen.getByRole("button", { name: "Save settings" }))
    await waitFor(() => expect(values().fontSize).toBe(18))
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
      fontSize: 18,
      ignoreCase: true,
      futureField: "keep",
    })
  })
  const path = "users/alice/encryptionSettings/default"
  it("merges only edited preferences and preserves unrelated legacy fields and timestamps", async () => {
    state.user = { uid: "alice" }
    state.documents.set(path, {
      fontSize: 18,
      futureField: "keep",
      createdAt: "original",
    })
    render(panel("encryption"))
    await waitFor(() => expect(values().fontSize).toBe(18))
    await userEvent.click(screen.getByRole("checkbox", { name: "Convert as you type" }))
    await userEvent.click(screen.getByRole("button", { name: "Save settings" }))
    await waitFor(() => expect(state.writes).toHaveBeenCalledTimes(1))
    expect(state.documents.get(path)).toEqual({
      fontSize: 18,
      autoConvert: false,
      futureField: "keep",
      createdAt: "original",
      updatedAt: "server-time",
    })
  })
  it("rejects conflicting edits from another device", async () => {
    state.user = { uid: "alice" }
    state.documents.set(path, { fontSize: 14 })
    render(panel("encryption"))
    const input = await screen.findByLabelText("Text size (px)")
    fireEvent.change(input, { target: { value: "18" } })
    state.documents.set(path, { fontSize: 20 })
    await userEvent.click(screen.getByRole("button", { name: "Save settings" }))
    expect((await screen.findByRole("alert")).textContent).toContain("changed on another device")
    expect(state.writes).not.toHaveBeenCalled()
  })
  it("clears the previous account's draft on account change", async () => {
    state.user = { uid: "alice" }
    state.documents.set(path, { fontSize: 20 })
    const view = render(panel("encryption"))
    await waitFor(() => expect(values().fontSize).toBe(20))
    fireEvent.change(screen.getByLabelText("Text size (px)"), {
      target: { value: "22" },
    })
    state.user = { uid: "bob" }
    view.rerender(panel("encryption"))
    await waitFor(() => expect(values().fontSize).toBe(14))
    expect((screen.getByLabelText("Text size (px)") as HTMLInputElement).value).toBe("14")
    expect(state.writes).not.toHaveBeenCalled()
    expect(state.documents.get(path)).toEqual({ fontSize: 20 })
  })
  it("blocks save when the remote read fails and can retry", async () => {
    state.user = { uid: "alice" }
    state.failRead = true
    render(panel("encryption"))
    await screen.findByRole("alert")
    expect(state.writes).not.toHaveBeenCalled()
    state.failRead = false
    await userEvent.click(screen.getByRole("button", { name: "Retry loading settings" }))
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
  })
  it("reports remote write failures and keeps the editable draft", async () => {
    state.user = { uid: "alice" }
    state.failWrite = true
    render(panel("encryption"))
    await userEvent.click(await screen.findByRole("checkbox", { name: "Convert as you type" }))
    await userEvent.click(screen.getByRole("button", { name: "Save settings" }))
    expect((await screen.findByRole("alert")).textContent).toBe("Network unavailable")
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Convert as you type",
        }) as HTMLInputElement
      ).checked
    ).toBe(false)
  })
})

describe("settings behavior and safeguards", () => {
  it("imports quoted and multiline watchlist rows safely, handles missing fields and rejects unsafe links", () => {
    const movies = parseLetterboxdCsv(
      'Name,Year,Letterboxd URI\r\n"Movie, One",1999,https://letterboxd.com/film/movie-one/\r\n"Movie\nTwo",2000,javascript:alert(1)\r\n\r\n,2001,\r\n"Movie, One",1999,'
    )
    expect(movies).toHaveLength(2)
    expect(movies[0].name).toBe("Movie, One")
    expect(movies[1].name).toBe("Movie\nTwo")
    expect(movies[1].uri).toBeUndefined()
    expect(() => parseLetterboxdCsv('Name\n"unclosed')).toThrow()
    expect(safeMovieUrl("https://letterboxd.com.evil.example/film/test")).toBeUndefined()
    expect(safeMovieUrl("https://attacker@letterboxd.com/film/test")).toBeUndefined()
    expect(isMovieList([{ id: "1", name: "Movie", year: {} }])).toBe(false)
  })
  it("diff comparison honors case and whitespace preferences while preserving original output", () => {
    expect(
      calculateTextDiff(" Hello ", "hello", {
        ignoreCase: true,
        ignoreWhitespace: true,
      })
    ).toEqual([{ type: "equal", content: " Hello ", lineNumber: 1 }])
    expect(
      calculateTextDiff("Hello", "hello", {
        ignoreCase: false,
        ignoreWhitespace: false,
      }).map((line) => line.type)
    ).toEqual(["delete", "insert"])
    expect(() =>
      calculateTextDiff("a\n".repeat(2000), "b\n".repeat(2000), {
        ignoreCase: false,
        ignoreWhitespace: false,
      })
    ).toThrow("too large")
  })
  it("formats time and UTC offsets for the selected date, including daylight saving and fractional offsets", () => {
    const winter = new Date("2026-01-15T20:05:06Z"),
      summer = new Date("2026-07-15T20:05:06Z")
    expect(timezoneOffset("America/Chicago", winter)).toBe("UTC-06:00")
    expect(timezoneOffset("America/Chicago", summer)).toBe("UTC-05:00")
    expect(timezoneOffset("Asia/Kolkata", summer)).toBe("UTC+05:30")
    expect(formatZoneTime("UTC", winter, "24", false)).toBe("20:05")
    expect(formatZoneTime("UTC", winter, "12", true)).toBe("08:05:06 PM")
  })
  it("joins and leaves without mutating existing players and enforces capacity", () => {
    const players = ["alice"]
    expect(changeGameMembership(players, "bob", 2, true)).toEqual(["alice", "bob"])
    expect(players).toEqual(["alice"])
    expect(() => changeGameMembership(["alice", "bob"], "eve", 2, true)).toThrow("full")
    expect(() => changeGameMembership(players, "alice", 2, true)).toThrow("already")
    expect(changeGameMembership(["alice", "bob"], "bob", 2, false)).toEqual(["alice"])
  })
})

function StickerProbe() {
  const context = useStickr()
  return (
    <>
      <output data-testid="stickers">{JSON.stringify(context.state)}</output>
      <button
        onClick={() =>
          context.setState((previous) => ({
            ...previous,
            displayName: "Changed name",
          }))
        }
      >
        Edit display name
      </button>
    </>
  )
}
describe("sticker data preservation", () => {
  it("updates a display preference without rewriting either list or metadata", async () => {
    state.user = { uid: "alice" }
    const path = "users/alice/stickrSettings/default"
    state.documents.set(path, {
      albumPresetId: "custom",
      customStickerCount: 100,
      displayName: "Original",
      shareCardTheme: "dark",
      duplicates: ["1", "2"],
      needs: ["3"],
      createdAt: "original",
      futureField: "keep",
    })
    render(
      <StickrProvider>
        <StickerProbe />
      </StickrProvider>
    )
    await waitFor(() => expect(screen.getByTestId("stickers").textContent).toContain("Original"))
    expect(state.writes).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Edit display name" }))
    await waitFor(() => expect(state.writes).toHaveBeenCalledTimes(1))
    expect(state.writes.mock.calls[0][1]).toEqual({
      displayName: "Changed name",
      updatedAt: "server-time",
    })
    expect(state.documents.get(path)).toMatchObject({
      duplicates: ["1", "2"],
      needs: ["3"],
      createdAt: "original",
      futureField: "keep",
    })
  })
  it("does not copy guest or previous-account lists into a different account", async () => {
    const guest = JSON.stringify({
      albumPresetId: "custom",
      customStickerCount: 100,
      duplicates: ["9"],
      needs: ["10"],
    })
    localStorage.setItem("stickr-v1", guest)
    state.user = { uid: "alice" }
    state.documents.set("users/alice/stickrSettings/default", {
      albumPresetId: "custom",
      customStickerCount: 100,
      duplicates: ["1"],
      needs: ["2"],
    })
    const view = render(
      <StickrProvider>
        <StickerProbe />
      </StickrProvider>
    )
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId("stickers").textContent!).duplicates).toEqual(["1"])
    )
    state.user = { uid: "bob" }
    view.rerender(
      <StickrProvider>
        <StickerProbe />
      </StickrProvider>
    )
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId("stickers").textContent!).duplicates).toEqual([])
    )
    expect(state.writes).not.toHaveBeenCalled()
    expect(localStorage.getItem("stickr-v1")).toBe(guest)
  })
})
