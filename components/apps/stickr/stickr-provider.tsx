"use client"

import * as React from "react"
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore"
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

const DEBOUNCE_MS = 500

function readLocal(): StickrPersistedState {
  if (typeof window === "undefined") return DEFAULT_STICKR_STATE
  try {
    const raw = localStorage.getItem(STICKR_STORAGE_KEY)
    if (!raw) return DEFAULT_STICKR_STATE
    const parsed = JSON.parse(raw) as Partial<StickrPersistedState>
    return normalizeState(parsed, getPresetById(parsed.albumPresetId ?? ""))
  } catch {
    return DEFAULT_STICKR_STATE
  }
}

function writeLocal(state: StickrPersistedState) {
  try {
    localStorage.setItem(STICKR_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function firestoreToState(data: Record<string, unknown>): StickrPersistedState {
  return normalizeState(
    {
      albumPresetId: data.albumPresetId as string | undefined,
      customStickerCount: data.customStickerCount as number | undefined,
      displayName: data.displayName as string | undefined,
      shareCardTheme: data.shareCardTheme as StickrPersistedState["shareCardTheme"] | undefined,
      duplicates: data.duplicates as number[] | undefined,
      needs: data.needs as number[] | undefined,
    },
    getPresetById((data.albumPresetId as string) ?? "")
  )
}

export interface StickrContextValue {
  state: StickrPersistedState
  setState: (next: StickrPersistedState | ((prev: StickrPersistedState) => StickrPersistedState)) => void
  hydrated: boolean
  stickerCount: number
  authLoading: boolean
}

const StickrContext = React.createContext<StickrContextValue | null>(null)

export function StickrProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = React.useState<StickrPersistedState>(DEFAULT_STICKR_STATE)
  const [hydrated, setHydrated] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      setState(readLocal())
      setHydrated(true)
      return
    }

    const ref = doc(db, "users", user.uid, "stickrSettings", "default")
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setState(firestoreToState(snap.data() as Record<string, unknown>))
        } else {
          setState(readLocal())
        }
        setHydrated(true)
      },
      () => {
        setState(readLocal())
        setHydrated(true)
      }
    )
    return () => unsub()
  }, [user, authLoading])

  const persist = React.useCallback(
    (next: StickrPersistedState | ((prev: StickrPersistedState) => StickrPersistedState)) => {
      setState((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: StickrPersistedState) => StickrPersistedState)(prev) : next
        writeLocal(resolved)

        if (user) {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(async () => {
            try {
              await setDoc(
                doc(db, "users", user.uid, "stickrSettings", "default"),
                {
                  albumPresetId: resolved.albumPresetId,
                  customStickerCount: resolved.customStickerCount,
                  displayName: resolved.displayName,
                  shareCardTheme: resolved.shareCardTheme,
                  duplicates: resolved.duplicates,
                  needs: resolved.needs,
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              )
            } catch (e) {
              console.error("Stickr save failed:", e)
            }
          }, DEBOUNCE_MS)
        }

        return resolved
      })
    },
    [user]
  )

  const stickerCount = resolveStickerCount(state)

  const value = React.useMemo(
    () => ({ state, setState: persist, hydrated, stickerCount, authLoading }),
    [state, persist, hydrated, stickerCount, authLoading]
  )

  return <StickrContext.Provider value={value}>{children}</StickrContext.Provider>
}

export function useStickr(): StickrContextValue {
  const ctx = React.useContext(StickrContext)
  if (!ctx) {
    throw new Error("useStickr must be used within StickrProvider")
  }
  return ctx
}
