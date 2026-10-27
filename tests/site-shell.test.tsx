import * as React from "react"
import { afterEach, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { HubBrowser } from "../components/hub/hub-browser"
import { ProfileProvider, useProfile } from "../components/auth/profile-provider"
import { UsernameOnboarding } from "../components/auth/username-onboarding"
import { APP_REGISTRY } from "../lib/apps/registry"

const auth = vi.hoisted(() => ({
  loading: false,
  account: null as null | { uid: string; displayName: string | null; email: string | null },
}))
const profileStore = vi.hoisted(() => ({
  listeners: new Map<string, (data: Record<string, unknown> | undefined) => void>(),
}))

vi.mock("@/components/auth/auth-provider", () => ({ useAuth: () => auth }))
vi.mock("@/lib/account/profile", () => ({
  subscribeToProfile: (uid: string, onData: (data: Record<string, unknown> | undefined) => void) => {
    profileStore.listeners.set(uid, onData)
    return () => profileStore.listeners.delete(uid)
  },
  saveProfile: vi.fn(),
}))

afterEach(() => {
  cleanup()
  auth.account = null
  profileStore.listeners.clear()
})

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve)))

it("lets people recover from a search with no results", async () => {
  render(<HubBrowser />)
  fireEvent.change(screen.getByRole("searchbox", { name: "Search apps" }), {
    target: { value: "no app is called this" },
  })
  expect(await screen.findByText("No apps found")).toBeTruthy()

  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
  expect(await screen.findByText(`${APP_REGISTRY.length} apps found`)).toBeTruthy()
})

function ProfileStatus() {
  const { status, username } = useProfile()
  return <p>{`${status}:${username ?? "-"}`}</p>
}

it("shares one profile subscription and never shows a previous account's data", async () => {
  auth.account = { uid: "a", displayName: null, email: null }
  const { rerender } = render(
    <ProfileProvider>
      <ProfileStatus />
    </ProfileProvider>
  )
  expect(screen.getByText("loading:-")).toBeTruthy()
  await flush()
  act(() => profileStore.listeners.get("a")?.({ username: "amer" }))
  expect(screen.getByText("ready:amer")).toBeTruthy()

  auth.account = { uid: "b", displayName: null, email: null }
  rerender(
    <ProfileProvider>
      <ProfileStatus />
    </ProfileProvider>
  )
  expect(screen.getByText("loading:-")).toBeTruthy()
})

it("asks for a username only once the profile has loaded without one", async () => {
  auth.account = { uid: "a", displayName: "Amer K", email: "amer@example.com" }
  render(
    <ProfileProvider>
      <UsernameOnboarding />
    </ProfileProvider>
  )
  await flush()
  expect(screen.queryByRole("dialog")).toBeNull()

  act(() => profileStore.listeners.get("a")?.({}))
  expect(screen.getByRole("dialog", { name: "Choose your @username" })).toBeTruthy()
  expect((screen.getByLabelText("Username") as HTMLInputElement).value).toBe("Amer_K")
})
