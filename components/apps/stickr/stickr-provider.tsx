"use client"

import * as React from "react"
import { doc, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import { getPresetById } from "@/lib/stickr/album-presets"
import {
  DEFAULT_STICKR_STATE,
  STICKR_STORAGE_KEY,
  normalizeState,
  resolveStickerCount,
  type StickrPersistedState,
} from "@/lib/stickr/stickr-state"

export interface StickrContextValue {
  state: StickrPersistedState
  setState: (next: StickrPersistedState | ((previous: StickrPersistedState) => StickrPersistedState)) => void
  hydrated: boolean
  stickerCount: number
  authLoading: boolean
}
const StickrContext = React.createContext<StickrContextValue | null>(null)
const normalize = (raw: Partial<StickrPersistedState>) =>
  normalizeState(raw, getPresetById(raw.albumPresetId ?? ""))

export function StickrProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  return (
    <StickrSession key={user?.uid ?? "guest"} uid={user?.uid} authLoading={loading}>
      {children}
    </StickrSession>
  )
}

function StickrSession({
  uid,
  authLoading,
  children,
}: {
  uid?: string
  authLoading: boolean
  children: React.ReactNode
}) {
  const [state, setState] = React.useState<StickrPersistedState>(DEFAULT_STICKR_STATE)
  const [hydrated, setHydrated] = React.useState(false)
  const current = React.useRef(state)
  const remote = React.useRef(state)
  const pending = React.useRef(false)
  const ready = React.useRef(false)
  const queue = React.useRef<Promise<void>>(Promise.resolve())
  const writeFailed = React.useRef(false)
  const active = React.useRef(true)
  const key = uid ? `${STICKR_STORAGE_KEY}:${uid}` : STICKR_STORAGE_KEY

  React.useEffect(() => {
    active.current = true
    if (authLoading) return
    ready.current = false
    const apply = (next: StickrPersistedState) => {
      current.current = next
      remote.current = next
      setState(next)
      ready.current = true
      setHydrated(true)
    }
    if (!uid) {
      const loadLocal = () => {
        try {
          const raw = localStorage.getItem(key)
          apply(raw ? normalize(JSON.parse(raw)) : DEFAULT_STICKR_STATE)
        } catch {
          setHydrated(true)
          toast.error("Your saved sticker lists could not be read. They have been left untouched.")
        }
      }
      loadLocal()
      return () => {
        active.current = false
      }
    }
    const unsubscribe = onSnapshot(
      doc(db, "users", uid, "stickrSettings", "default"),
      (snapshot) => {
        if (pending.current) return
        // Reading an absent document never initializes or migrates it.
        apply(snapshot.exists() ? normalize(snapshot.data()) : DEFAULT_STICKR_STATE)
      },
      () => {
        setHydrated(true)
        toast.error(
          "Sticker sync could not be loaded. Existing lists have been left untouched; reload to retry."
        )
      }
    )
    return () => {
      active.current = false
      ready.current = false
      unsubscribe()
    }
  }, [authLoading, key, uid])

  const persist: StickrContextValue["setState"] = (update) => {
    if (!ready.current) {
      toast.error("Wait for your sticker lists to load successfully before editing.")
      return
    }
    const before = current.current
    const next = typeof update === "function" ? update(before) : update
    const fields = (Object.keys(next) as (keyof StickrPersistedState)[]).filter(
      (field) => JSON.stringify(next[field]) !== JSON.stringify(before[field])
    )
    if (!fields.length) return
    if (!uid) {
      try {
        const stored = localStorage.getItem(key)
        const raw = stored ? JSON.parse(stored) : DEFAULT_STICKR_STATE
        const latest = normalize(raw)
        for (const field of fields) {
          if (JSON.stringify(latest[field]) !== JSON.stringify(before[field]))
            throw new Error("Your sticker lists changed in another tab. Reload before editing.")
        }
        const changes = Object.fromEntries(fields.map((field) => [field, next[field]]))
        localStorage.setItem(key, JSON.stringify({ ...raw, ...changes }))
        const merged = { ...latest, ...changes }
        current.current = merged
        setState(merged)
      } catch {
        toast.error("Your sticker changes could not be saved. Existing lists have been left untouched.")
      }
      return
    }
    current.current = next
    setState(next)
    pending.current = true
    queue.current = queue.current
      .then(async () => {
        if (writeFailed.current) return
        const ref = doc(db, "users", uid, "stickrSettings", "default")
        const baseline = remote.current
        const merged = await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref)
          const latest = snapshot.exists() ? normalize(snapshot.data()) : DEFAULT_STICKR_STATE
          for (const field of fields)
            if (JSON.stringify(latest[field]) !== JSON.stringify(baseline[field]))
              throw new Error(
                "Your sticker lists changed on another device. Reload before making more changes."
              )
          transaction.set(
            ref,
            {
              ...Object.fromEntries(fields.map((field) => [field, next[field]])),
              updatedAt: serverTimestamp(),
              ...(!snapshot.exists() ? { createdAt: serverTimestamp() } : {}),
            },
            { merge: true }
          )
          return {
            ...latest,
            ...Object.fromEntries(fields.map((field) => [field, next[field]])),
          }
        })
        remote.current = merged
        if (active.current && current.current === next) {
          current.current = merged
          setState(merged)
        }
      })
      .catch((cause) => {
        writeFailed.current = true
        if (active.current) {
          ready.current = false
          toast.error(
            cause instanceof Error ? cause.message : "Sticker changes could not sync. Reload to retry."
          )
        }
      })
      .finally(() => {
        if (current.current === next || current.current === remote.current) pending.current = false
      })
  }
  return (
    <StickrContext.Provider
      value={{
        state,
        setState: persist,
        hydrated,
        stickerCount: resolveStickerCount(state),
        authLoading,
      }}
    >
      {children}
    </StickrContext.Provider>
  )
}

export function useStickr(): StickrContextValue {
  const context = React.useContext(StickrContext)
  if (!context) throw new Error("useStickr must be used within StickrProvider")
  return context
}
