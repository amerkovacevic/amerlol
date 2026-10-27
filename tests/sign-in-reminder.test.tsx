import * as React from "react"
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { SignInReminder } from "../components/auth/sign-in-reminder"

const auth = vi.hoisted(() => ({ loading: false, user: null as null | { isAnonymous: boolean } }))
vi.mock("@/components/auth/auth-provider", () => ({ useAuth: () => auth }))
vi.mock("@/components/auth/auth-dialog", () => ({
  AuthDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog">Sign in form</div> : null),
}))
afterEach(() => {
  cleanup()
  auth.loading = false
  auth.user = null
})

it("opens sign-in from the guest reminder", () => {
  render(<SignInReminder />)
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
  expect(screen.getByRole("dialog")).toBeTruthy()
})
it("offers sign-in to anonymous game players", () => {
  auth.user = { isAnonymous: true }
  render(<SignInReminder />)
  expect(screen.getByRole("complementary", { name: "Account benefits" })).toBeTruthy()
})
it("hides the reminder for registered accounts", () => {
  auth.user = { isAnonymous: false }
  render(<SignInReminder />)
  expect(screen.queryByRole("complementary")).toBeNull()
})
it("waits for authentication to resolve", () => {
  auth.loading = true
  render(<SignInReminder />)
  expect(screen.queryByRole("complementary")).toBeNull()
})
