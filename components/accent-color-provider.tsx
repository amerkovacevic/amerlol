"use client"

import * as React from "react"
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore"
import { useAuth } from "@/components/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import {
  DEFAULT_THEME_COLOR,
  isThemeColor,
  THEME_COLOR_STORAGE_KEY,
  type ThemeColor,
} from "@/lib/theme-colors"

interface AccentColorContextValue {
  color: ThemeColor
  saving: boolean
  setColor: (color: ThemeColor) => Promise<void>
}

const AccentColorContext = React.createContext<AccentColorContextValue | null>(null)

function applyColor(color: ThemeColor) {
  document.documentElement.dataset.accent = color
  localStorage.setItem(THEME_COLOR_STORAGE_KEY, color)
}

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [color, setColorState] = React.useState<ThemeColor>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME_COLOR
    const stored = localStorage.getItem(THEME_COLOR_STORAGE_KEY)
    return isThemeColor(stored) ? stored : DEFAULT_THEME_COLOR
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    applyColor(color)
  }, [color])

  React.useEffect(() => {
    if (authLoading || !user) return
    return onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const saved = snapshot.data()?.accentColor
      if (!isThemeColor(saved)) return
      setColorState(saved)
      applyColor(saved)
    })
  }, [authLoading, user])

  const setColor = React.useCallback(async (next: ThemeColor) => {
    const previous = color
    setColorState(next)
    applyColor(next)
    setSaving(true)
    try {
      if (user) {
        const userRef = doc(db, "users", user.uid)
        const snapshot = await getDoc(userRef)
        await setDoc(
          userRef,
          {
            accentColor: next,
            updatedAt: serverTimestamp(),
            ...(!snapshot.exists() ? { createdAt: serverTimestamp() } : {}),
          },
          { merge: true }
        )
      }
    } catch (error) {
      setColorState(previous)
      applyColor(previous)
      throw error
    } finally {
      setSaving(false)
    }
  }, [color, user])

  return (
    <AccentColorContext.Provider value={{ color, saving, setColor }}>
      {children}
    </AccentColorContext.Provider>
  )
}

export function useAccentColor() {
  const context = React.useContext(AccentColorContext)
  if (!context) throw new Error("useAccentColor must be used within AccentColorProvider")
  return context
}
