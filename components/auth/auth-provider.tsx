"use client"

import * as React from "react"
import { User, onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut } from "firebase/auth"
import { auth } from "@/lib/firebase/config"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  ensurePlayerIdentity: () => Promise<User>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const identityRequest = React.useRef<Promise<User> | null>(null)

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    }, () => { setUser(null); setLoading(false) })

    return () => unsubscribe()
  }, [])

  const signOut = React.useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  const ensurePlayerIdentity = React.useCallback(async () => {
    if (auth.currentUser) return auth.currentUser
    if (!identityRequest.current) {
      identityRequest.current = signInAnonymously(auth).then((credential) => credential.user).finally(() => { identityRequest.current = null })
    }
    return identityRequest.current
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signOut, ensurePlayerIdentity }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
