"use client"

import * as React from "react"
import { onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut, type User } from "firebase/auth"
import { auth } from "@/lib/firebase/config"

interface AuthContextType {
  /** Any Firebase identity, including the anonymous one created for game guests. */
  user: User | null
  /** The registered account. Anonymous guests count as signed out everywhere in the UI. */
  account: User | null
  loading: boolean
  signOut: () => Promise<void>
  /** Returns the current identity, signing in anonymously when there is none. */
  ensurePlayerIdentity: () => Promise<User>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const identityRequest = React.useRef<Promise<User> | null>(null)

  React.useEffect(
    () =>
      onAuthStateChanged(
        auth,
        (nextUser) => {
          setUser(nextUser)
          setLoading(false)
        },
        () => {
          setUser(null)
          setLoading(false)
        }
      ),
    []
  )

  const signOut = React.useCallback(() => firebaseSignOut(auth), [])

  const ensurePlayerIdentity = React.useCallback(async () => {
    if (auth.currentUser) return auth.currentUser
    // Concurrent callers share one anonymous sign-in.
    identityRequest.current ??= signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => {
        identityRequest.current = null
      })
    return identityRequest.current
  }, [])

  const value = React.useMemo(
    () => ({
      user,
      account: user && !user.isAnonymous ? user : null,
      loading,
      signOut,
      ensurePlayerIdentity,
    }),
    [user, loading, signOut, ensurePlayerIdentity]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
