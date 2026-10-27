import * as React from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

const storageKey = "amerlol:flickfeed-promotion-dismissed"

beforeEach(() => {
  vi.resetModules()
  window.localStorage.clear()
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("iPhone")
})

afterEach(cleanup)

it("remembers Maybe later across app remounts and a fresh page load", async () => {
  const { IOSAppPromotion } = await import("../components/layout/ios-app-banner")
  const firstApp = render(<IOSAppPromotion />)
  fireEvent.click(screen.getByRole("button", { name: "Maybe later" }))
  expect(screen.queryByRole("complementary", { name: "FlickFeed for iPhone" })).toBeNull()
  expect(window.localStorage.getItem(storageKey)).toBe("true")

  firstApp.unmount()
  const nextApp = render(<IOSAppPromotion />)
  expect(screen.queryByRole("complementary", { name: "FlickFeed for iPhone" })).toBeNull()
  nextApp.unmount()

  // Reload the module to discard all in-memory state, as a refresh would.
  vi.resetModules()
  const { IOSAppPromotion: ReloadedPromotion } = await import("../components/layout/ios-app-banner")
  render(<ReloadedPromotion />)
  expect(screen.queryByRole("complementary", { name: "FlickFeed for iPhone" })).toBeNull()
})

it("also remembers dismissal using the close button", async () => {
  const { IOSAppPromotion } = await import("../components/layout/ios-app-banner")
  render(<IOSAppPromotion />)
  fireEvent.click(screen.getByRole("button", { name: "Close" }))
  expect(window.localStorage.getItem(storageKey)).toBe("true")
  expect(screen.queryByRole("complementary", { name: "FlickFeed for iPhone" })).toBeNull()
})

it("closes an open promotion when another tab dismisses it", async () => {
  const { IOSAppPromotion } = await import("../components/layout/ios-app-banner")
  render(<IOSAppPromotion />)
  expect(screen.queryByRole("complementary", { name: "FlickFeed for iPhone" })).not.toBeNull()
  fireEvent(window, new StorageEvent("storage", { key: storageKey, newValue: "true" }))
  expect(screen.queryByRole("complementary", { name: "FlickFeed for iPhone" })).toBeNull()
})

it("does not show the promotion when storage is unavailable", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Storage blocked", "SecurityError")
  })
  const { IOSAppPromotion } = await import("../components/layout/ios-app-banner")
  render(<IOSAppPromotion />)
  expect(screen.queryByRole("complementary", { name: "FlickFeed for iPhone" })).toBeNull()
})

it("does not show the promotion on non-iOS devices", async () => {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Android")
  const { IOSAppPromotion } = await import("../components/layout/ios-app-banner")
  render(<IOSAppPromotion />)
  expect(screen.queryByRole("complementary", { name: "FlickFeed for iPhone" })).toBeNull()
})
