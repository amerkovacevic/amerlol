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
const STICKR_DOC_ID = "default"

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
      duplicates: data.duplicates as unknown as StickrPersistedState["duplicates"] | undefined,
      needs: data.needs as unknown as StickrPersistedState["needs"] | undefined,
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
  const stateRef = React.useRef<StickrPersistedState>(DEFAULT_STICKR_STATE)
  const pendingClientUpdatedAtRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    stateRef.current = state
  }, [state])

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      setState(readLocal())
      setHydrated(true)
      return
    }

    const ref = doc(db, "users", user.uid, "stickrSettings", STICKR_DOC_ID)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>
          const remoteClientUpdatedAt =
            typeof data.clientUpdatedAt === "number" ? (data.clientUpdatedAt as number) : null

          // If we have a newer local write pending, ignore older remote snapshots to avoid clobbering edits.
          if (
            pendingClientUpdatedAtRef.current != null &&
            remoteClientUpdatedAt != null &&
            remoteClientUpdatedAt < pendingClientUpdatedAtRef.current
          ) {
            setHydrated(true)
            return
          }

          if (
            pendingClientUpdatedAtRef.current != null &&
            remoteClientUpdatedAt != null &&
            remoteClientUpdatedAt >= pendingClientUpdatedAtRef.current
          ) {
            pendingClientUpdatedAtRef.current = null
          }

          setState(firestoreToState(data))
        } else {
          // No remote doc yet: initialize from local (and create remote doc so the user can come back).
          const local = readLocal()
          setState(local)
          pendingClientUpdatedAtRef.current = Date.now()
          setDoc(
            doc(db, "users", user.uid, "stickrSettings", STICKR_DOC_ID),
            {
              albumPresetId: local.albumPresetId,
              customStickerCount: local.customStickerCount,
              displayName: local.displayName,
              shareCardTheme: local.shareCardTheme,
              duplicates: local.duplicates,
              needs: local.needs,
              clientUpdatedAt: pendingClientUpdatedAtRef.current,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ).catch((e) => console.error("Stickr init save failed:", e))
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

  const flushSave = React.useCallback(
    async (snapshot: StickrPersistedState) => {
      if (!user) return
      const clientUpdatedAt = Date.now()
      pendingClientUpdatedAtRef.current = clientUpdatedAt
      try {
        await setDoc(
          doc(db, "users", user.uid, "stickrSettings", STICKR_DOC_ID),
          {
            albumPresetId: snapshot.albumPresetId,
            customStickerCount: snapshot.customStickerCount,
            displayName: snapshot.displayName,
            shareCardTheme: snapshot.shareCardTheme,
            duplicates: snapshot.duplicates,
            needs: snapshot.needs,
            clientUpdatedAt,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      } catch (e) {
        console.error("Stickr save failed:", e)
      }
    },
    [user]
  )

  const persist = React.useCallback(
    (next: StickrPersistedState | ((prev: StickrPersistedState) => StickrPersistedState)) => {
      setState((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: StickrPersistedState) => StickrPersistedState)(prev) : next
        writeLocal(resolved)

        if (user) {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(async () => {
            await flushSave(resolved)
          }, DEBOUNCE_MS)
        }

        return resolved
      })
    },
    [user, flushSave]
  )

  // Flush any pending debounced save if the tab is closed/reloaded.
  React.useEffect(() => {
    if (!user) return
    const handler = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
        // Fire and forget; best effort.
        void flushSave(stateRef.current)
      }
    }
    window.addEventListener("pagehide", handler)
    return () => window.removeEventListener("pagehide", handler)
  }, [user, flushSave])

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
