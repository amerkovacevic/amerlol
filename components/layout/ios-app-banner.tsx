"use client"

import * as React from "react"
import { ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const APP_STORE_URL = "https://apps.apple.com/us/app/flickfeed-social/id6755321974"
const DISMISSED_STORAGE_KEY = "amerlol:flickfeed-promotion-dismissed"
let dismissedThisSession = false
const listeners = new Set<() => void>()

function isIOSDevice() {
  const userAgent = window.navigator.userAgent
  const isAppleMobileDevice = /iPad|iPhone|iPod/.test(userAgent)
  const isModernIPad = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1

  return isAppleMobileDevice || isModernIPad
}

function canShowPromotion() {
  try {
    return (
      isIOSDevice() && !dismissedThisSession && window.localStorage.getItem(DISMISSED_STORAGE_KEY) !== "true"
    )
  } catch {
    // Avoid repeatedly advertising when the browser blocks preference storage.
    return false
  }
}

function dismiss() {
  dismissedThisSession = true
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "true")
  } catch {
    // The in-memory preference still covers navigation in this session.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === DISMISSED_STORAGE_KEY && event.newValue === "true") {
      dismissedThisSession = true
      onChange()
    }
  }
  listeners.add(onChange)
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener("storage", onStorage)
  }
}

/** A dismissible banner for the FlickFeed iOS app. It never blocks the page. */
export function IOSAppPromotion() {
  const canShow = React.useSyncExternalStore(subscribe, canShowPromotion, () => false)
  if (!canShow) return null

  return (
    <aside
      aria-label="FlickFeed for iPhone"
      className="animate-enter fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-primary/20 bg-background/95 p-4 shadow-2xl backdrop-blur [padding-bottom:max(1rem,env(safe-area-inset-bottom))]"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="pr-8 font-space-grotesk text-lg font-bold leading-tight">
        Came from that other movie app?
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Didn&apos;t love it? Log your next watch with FlickFeed instead.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Maybe later
        </Button>
        <Button asChild size="sm">
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
            Try FlickFeed
            <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </aside>
  )
}
