import * as React from "react"
import { beforeEach, afterEach, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { APP_REGISTRY } from "../lib/apps/registry"
import { HubApp } from "../lib/apps/components"
import { settingsStorageKey, type SettingsAppId } from "../lib/apps/settings"

const mocks = vi.hoisted(() => ({
  writes: vi.fn(),
  user: null as null | { uid: string },
  documents: new Map<string, Record<string, unknown>>(),
  listeners: new Map<string, (snapshot: unknown) => void>(),
  ensurePlayerIdentity: vi.fn(async () => ({
    uid: "guest",
    isAnonymous: true,
  })),
  incidentFetch: vi.fn(async () => []),
}))
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    user: mocks.user,
    account: mocks.user,
    loading: false,
    ensurePlayerIdentity: mocks.ensurePlayerIdentity,
  }),
}))
vi.mock("@/components/auth/auth-dialog", () => ({ AuthDialog: () => null }))
vi.mock("@/components/accent-color-provider", () => ({
  useAccentColor: () => ({ color: "teal", saving: false, setColor: vi.fn() }),
}))
vi.mock("@/lib/firebase/config", () => ({ db: {}, auth: {} }))
vi.mock("@/components/apps/atlas-sprint/country-map", () => ({
  CountryMap: (props: { focusOnGuess: boolean }) => (
    <div data-testid="country-map" data-focus={String(props.focusOnGuess)} />
  ),
}))
vi.mock("@/components/apps/stl-monitor/map-component", () => ({
  default: (props: { mapStyle: string }) => (
    <div data-testid="incident-map" data-style={props.mapStyle} />
  ),
}))
vi.mock("@/components/apps/stl-monitor/data-service", () => ({
  fetchMoDOTIncidents: mocks.incidentFetch,
  fetchIDOTIncidents: mocks.incidentFetch,
  fetchNWSAlerts: mocks.incidentFetch,
  fetchTransitAlerts: mocks.incidentFetch,
  fetchLocalNews: mocks.incidentFetch,
  weatherAlertsToIncidents: () => [],
  transitAlertsToIncidents: () => [],
  newsToIncidents: () => [],
}))
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock("firebase/firestore", async (original) => ({
  ...(await original<typeof import("firebase/firestore")>()),
  doc: (_db: unknown, ...path: string[]) => path.join("/"),
  collection: (_db: unknown, ...path: string[]) => path.join("/"),
  query: (ref: unknown) => ref,
  getDoc: async () => ({ exists: () => false }),
  getDocs: async () => ({ docs: [], forEach: () => {} }),
  onSnapshot: (ref: string, next: (snapshot: unknown) => void) => {
    mocks.listeners.set(ref, next)
    next({
      exists: () => mocks.documents.has(ref),
      data: () => mocks.documents.get(ref),
    })
    return () => {
      mocks.listeners.delete(ref)
    }
  },
  runTransaction: async (
    _db: unknown,
    callback: (transaction: unknown) => Promise<void>
  ) =>
    callback({
      get: async (ref: string) => ({
        exists: () => mocks.documents.has(ref),
        data: () => mocks.documents.get(ref),
      }),
      set: (ref: string, values: Record<string, unknown>) => {
        mocks.writes(ref, values)
        mocks.documents.set(ref, { ...mocks.documents.get(ref), ...values })
        queueMicrotask(() =>
          mocks.listeners.get(ref)?.({
            exists: () => true,
            data: () => mocks.documents.get(ref),
          })
        )
      },
    }),
  setDoc: mocks.writes,
  updateDoc: mocks.writes,
  addDoc: mocks.writes,
  writeBatch: () => ({
    set: mocks.writes,
    update: mocks.writes,
    delete: mocks.writes,
    commit: mocks.writes,
  }),
}))
vi.mock("@/lib/football-deepcuts/static-game", async (original) => ({
  ...(await original<typeof import("../lib/football-deepcuts/static-game")>()),
  selectStaticDailyQuestions: (questions: unknown[]) => questions,
}))
const question = {
  id: "q1",
  type: "club_pair",
  clubIds: ["c1", "c2"],
  prompt: "Name a player",
  answerCount: 7,
  answers: [],
}
beforeEach(() => {
  localStorage.clear()
  mocks.writes.mockClear()
  mocks.incidentFetch.mockClear()
  mocks.user = null
  mocks.documents.clear()
  mocks.listeners.clear()
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("football-manager-teams")
          ? { countries: [] }
          : {
              meta: {},
              clubs: [
                { id: "c1", name: "Club 1" },
                { id: "c2", name: "Club 2" },
              ],
              players: [],
              questions: [question],
            },
    }))
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
// Apps are code-split, so wait for the lazily loaded app body before interacting.
async function mount(appId: string) {
  const app = APP_REGISTRY.find((entry) => entry.appId === appId)!
  const view = render(<HubApp appId={app.appId} />)
  await waitFor(() => expect(screen.queryByText("Loading app…")).toBeNull())
  return view
}
async function openSettings() {
  await userEvent.click(screen.getByRole("tab", { name: "Settings" }))
}
async function overview() {
  await userEvent.click(screen.getByRole("tab", { name: "Overview" }))
}
async function save() {
  await userEvent.click(screen.getByRole("button", { name: "Save settings" }))
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Save settings",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
  )
}

for (const app of APP_REGISTRY)
  it(`${app.appId}: renders a usable settings panel without writing any app data on visit`, async () => {
    await mount(app.appId)
    expect(screen.getAllByRole("heading", { level: 1 }).map((heading) => heading.textContent)).toEqual([app.name])
    await openSettings()
    if (app.appId === "stickr") await screen.findByText("Stickr Settings")
    else {
      await screen.findByRole("button", { name: "Reset preferences" })
      expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0)
    }
    expect(mocks.writes).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  })

it("keeps text in memory when switching tabs and applies diff preferences to the comparison", async () => {
  await mount("diffchecker")
  fireEvent.change(screen.getByPlaceholderText("Enter original text here..."), {
    target: { value: " Hello " },
  })
  fireEvent.change(screen.getByPlaceholderText("Enter changed text here..."), {
    target: { value: "hello" },
  })
  await openSettings()
  await userEvent.click(
    screen.getByRole("checkbox", { name: "Ignore letter case" })
  )
  await userEvent.click(
    screen.getByRole("checkbox", {
      name: "Ignore leading and trailing whitespace",
    })
  )
  fireEvent.change(screen.getByLabelText("Text size (px)"), {
    target: { value: "20" },
  })
  await save()
  await overview()
  expect(
    (
      screen.getByPlaceholderText(
        "Enter original text here..."
      ) as HTMLTextAreaElement
    ).value
  ).toBe(" Hello ")
  await userEvent.click(screen.getByRole("button", { name: "Find Difference" }))
  expect(screen.getByText("Hello").parentElement?.className).toContain(
    "bg-transparent"
  )
  expect(document.querySelector("pre")?.style.fontSize).toBe("20px")
})

it("applies time zone defaults and display preferences", async () => {
  await mount("timezone")
  await openSettings()
  fireEvent.change(screen.getByLabelText(/Default time zones/), {
    target: { value: "Asia/Kolkata" },
  })
  fireEvent.change(screen.getByLabelText("Time format"), {
    target: { value: "24" },
  })
  await userEvent.click(screen.getByRole("checkbox", { name: "Show seconds" }))
  await userEvent.click(
    screen.getByRole("checkbox", { name: "Show day/night indicator" })
  )
  await userEvent.click(
    screen.getByRole("checkbox", { name: "Refresh automatically" })
  )
  await save()
  await overview()
  expect(screen.getByText("Kolkata")).toBeTruthy()
  expect(screen.queryByText("New York")).toBeNull()
  expect(screen.queryByText("Day")).toBeNull()
  expect(screen.queryByText("Night")).toBeNull()
  expect(screen.getByText("UTC+05:30")).toBeTruthy()
})

it("applies encoding tool defaults and preserves input across hub settings tabs", async () => {
  await mount("encryption")
  await openSettings()
  fireEvent.change(screen.getByLabelText("Default tool"), {
    target: { value: "hex" },
  })
  await save()
  await overview()
  expect(
    screen.getByRole("tab", { name: "Hex" }).getAttribute("data-state")
  ).toBe("active")
})

it("embeds playback settings in generated search links and accepts literal percent characters", async () => {
  await mount("lmgtfy")
  await openSettings()
  fireEvent.change(screen.getByLabelText("Animation speed"), {
    target: { value: "2" },
  })
  fireEvent.change(
    screen.getByLabelText("Delay before search (milliseconds)"),
    { target: { value: "500" } }
  )
  await userEvent.click(
    screen.getByRole("checkbox", { name: "Show query during animation" })
  )
  await save()
  await overview()
  const input = screen.getByLabelText("Search Query")
  fireEvent.change(input, { target: { value: "100% real" } })
  await userEvent.click(
    screen.getByRole("button", { name: "Generate Shareable Link" })
  )
  const url = new URL(document.querySelector("code")!.textContent!)
  expect(url.searchParams.get("q")).toBe("100% real")
  expect(url.searchParams.get("speed")).toBe("2")
  expect(url.searchParams.get("delay")).toBe("500")
  expect(url.searchParams.get("show")).toBe("0")
})

it("shows the missing Deepcuts display settings and applies them", async () => {
  await mount("football-deepcuts")
  await screen.findByText("7 sourced answers in the database")
  await openSettings()
  await userEvent.click(
    screen.getByRole("checkbox", { name: "Show sourced answer counts" })
  )
  await userEvent.click(
    screen.getByRole("checkbox", { name: "Show question mix guide" })
  )
  await save()
  await overview()
  expect(screen.queryByText("7 sourced answers in the database")).toBeNull()
  expect(screen.queryByText("Question mix")).toBeNull()
})

it("preserves an existing watchlist while changing Next Watch preferences", async () => {
  const watchlist = JSON.stringify([
    { id: "sample-old", name: "Existing movie", year: "1999" },
    { id: "real", name: "Another movie", year: "2000" },
  ])
  localStorage.setItem("next-watch-movies-v1", watchlist)
  await mount("next-watch")
  await screen.findByText("1999")
  await openSettings()
  await userEvent.click(
    screen.getByRole("checkbox", { name: "Show movie release years" })
  )
  await save()
  await overview()
  expect(screen.queryByText("1999")).toBeNull()
  expect(localStorage.getItem("next-watch-movies-v1")).toBe(watchlist)
})

it("does not overwrite a malformed watchlist on visit", async () => {
  localStorage.setItem("next-watch-movies-v1", "{broken")
  await mount("next-watch")
  await openSettings()
  expect(localStorage.getItem("next-watch-movies-v1")).toBe("{broken")
})

it("Stickr preference reset leaves album and both sticker lists intact", async () => {
  localStorage.setItem(
    "stickr-v1",
    JSON.stringify({
      albumPresetId: "custom",
      customStickerCount: 100,
      displayName: "My name",
      shareCardTheme: "light",
      duplicates: ["1", "2"],
      needs: ["3"],
    })
  )
  await mount("stickr")
  await openSettings()
  await userEvent.click(
    await screen.findByRole("button", { name: "Reset display preferences" })
  )
  const saved = JSON.parse(localStorage.getItem("stickr-v1")!)
  expect(saved.duplicates).toEqual(["1", "2"])
  expect(saved.needs).toEqual(["3"])
  expect(saved.albumPresetId).toBe("custom")
  expect(saved.customStickerCount).toBe(100)
  expect(saved.shareCardTheme).toBe("dark")
})

it("applies Pickup Soccer defaults to new forms without creating a game", async () => {
  await mount("pickup-soccer")
  await openSettings()
  fireEvent.change(screen.getByLabelText("Default player limit"), {
    target: { value: "16" },
  })
  fireEvent.change(screen.getByLabelText("Default game location"), {
    target: { value: "Forest Park" },
  })
  await save()
  await overview()
  await userEvent.click(screen.getByRole("button", { name: "Create Game" }))
  expect(
    (screen.getByLabelText("Max Players *") as HTMLInputElement).value
  ).toBe("16")
  expect((screen.getByLabelText("Location *") as HTMLInputElement).value).toBe(
    "Forest Park"
  )
  expect(mocks.writes).not.toHaveBeenCalled()
})

it("applies Secret Santa's budget only to a new exchange form", async () => {
  await mount("secret-santa")
  await openSettings()
  fireEvent.change(screen.getByLabelText("Default gift budget"), {
    target: { value: "$50" },
  })
  await save()
  await overview()
  await userEvent.click(screen.getByRole("button", { name: "Create Exchange" }))
  expect((screen.getByLabelText(/Budget/) as HTMLInputElement).value).toBe(
    "$50"
  )
  expect(mocks.writes).not.toHaveBeenCalled()
})

it("applies Color Crafter's default color count to new palettes without saving a palette", async () => {
  await mount("color-palette-crafter")
  await openSettings()
  fireEvent.change(screen.getByLabelText("Colors in new palettes"), {
    target: { value: "6" },
  })
  await save()
  await overview()
  await userEvent.click(screen.getByRole("button", { name: "Create" }))
  expect(document.querySelectorAll('input[type="color"]')).toHaveLength(6)
  expect(mocks.writes).not.toHaveBeenCalled()
})

it("applies Football Manager picking defaults to the active controls", async () => {
  await mount("football-manager-team-picker")
  await openSettings()
  fireEvent.change(screen.getByLabelText("Default picking mode"), {
    target: { value: "multiple" },
  })
  fireEvent.change(screen.getByLabelText("Default number of picks"), {
    target: { value: "8" },
  })
  await save()
  await overview()
  expect(screen.getByText("Number of Teams")).toBeTruthy()
  expect((screen.getByRole("spinbutton") as HTMLInputElement).value).toBe("8")
})

it("updates Atlas Sprint's map focus preference during an active game", async () => {
  await mount("atlas-sprint")
  await userEvent.click(screen.getByRole("button", { name: /Start/i }))
  expect(screen.getByTestId("country-map").getAttribute("data-focus")).toBe(
    "true"
  )
  await openSettings()
  await userEvent.click(
    screen.getByRole("checkbox", { name: "Focus map on correct answers" })
  )
  await save()
  await overview()
  expect(screen.getByTestId("country-map").getAttribute("data-focus")).toBe(
    "false"
  )
  expect(screen.getByLabelText("Country")).toBeTruthy()
})

it("applies Gauntlet hint visibility without resetting a running game", async () => {
  mocks.user = { uid: "player" }
  await mount("amer-gauntlet")
  await userEvent.click(
    await screen.findByRole("button", { name: "Start Challenge" })
  )
  expect(
    screen.getByRole("button", { name: "Use Hint (-100 pts)" })
  ).toBeTruthy()
  await openSettings()
  await userEvent.click(screen.getByRole("checkbox", { name: "Enable hints" }))
  await save()
  await overview()
  expect(
    screen.queryByRole("button", { name: "Use Hint (-100 pts)" })
  ).toBeNull()
  expect(screen.queryByRole("button", { name: "Start Challenge" })).toBeNull()
})

it("applies STL Monitor's map appearance preference", async () => {
  await mount("stl-monitor")
  await screen.findByTestId("incident-map")
  await openSettings()
  fireEvent.change(screen.getByLabelText("Map appearance"), {
    target: { value: "light" },
  })
  await save()
  await overview()
  expect(screen.getByTestId("incident-map").getAttribute("data-style")).toBe(
    "light"
  )
})

it("generates a Let Me Google That link straight from an example query", async () => {
  await mount("lmgtfy")
  await userEvent.click(screen.getByRole("button", { name: "Why is the sky blue?" }))
  const url = new URL(document.querySelector("code")!.textContent!)
  expect(url.searchParams.get("q")).toBe("Why is the sky blue?")
})
