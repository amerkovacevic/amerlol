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

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  ensurePlayerIdentity: async () => { throw new Error("Authentication is not ready") },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const ensurePlayerIdentity = async () => {
    if (auth.currentUser) return auth.currentUser
    const credential = await signInAnonymously(auth)
    return credential.user
  }

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
