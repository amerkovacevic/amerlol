"use client"

import * as React from "react"
import type { DocumentData } from "firebase/firestore"
import { useAuth } from "@/components/auth/auth-provider"

export interface Profile {
  /** "loading" until the first snapshot; "error" when the profile could not be read. */
  status: "signed-out" | "loading" | "ready" | "error"
  username: string | null
  accentColor: unknown
}

const SIGNED_OUT: Profile = { status: "signed-out", username: null, accentColor: undefined }
const LOADING: Profile = { status: "loading", username: null, accentColor: undefined }

const ProfileContext = React.createContext<Profile>(SIGNED_OUT)

function toProfile(data: DocumentData | undefined): Profile {
  const username = typeof data?.username === "string" && data.username.trim() ? data.username : null
  return { status: "ready", username, accentColor: data?.accentColor }
}

/** One live subscription to the signed-in account's users/{uid} document, shared by the whole site. */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth()
  const uid = account?.uid ?? null
  const [state, setState] = React.useState<{ uid: string; profile: Profile } | null>(null)

  React.useEffect(() => {
    if (!uid) return
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    import("@/lib/account/profile")
      .then(({ subscribeToProfile }) => {
        if (cancelled) return
        unsubscribe = subscribeToProfile(
          uid,
          (data) => setState({ uid, profile: toProfile(data) }),
          () => setState({ uid, profile: { ...LOADING, status: "error" } })
        )
      })
      .catch(() => {
        if (!cancelled) setState({ uid, profile: { ...LOADING, status: "error" } })
      })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [uid])

  // A snapshot that belongs to a previously signed-in account is never shown.
  const profile = !uid ? SIGNED_OUT : state?.uid === uid ? state.profile : LOADING
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  return React.useContext(ProfileContext)
}

/** Writes profile fields for an account; loads Firestore on demand. */
export async function saveProfile(...args: Parameters<typeof import("@/lib/account/profile").saveProfile>) {
  const { saveProfile } = await import("@/lib/account/profile")
  return saveProfile(...args)
}
