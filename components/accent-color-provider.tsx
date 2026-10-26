"use client"

import * as React from "react"
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore"
import { useAuth } from "@/components/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import { readStorage, writeStorage } from "@/lib/storage"
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

function readStoredColor(): ThemeColor {
  const stored = readStorage(THEME_COLOR_STORAGE_KEY)
  return isThemeColor(stored) ? stored : DEFAULT_THEME_COLOR
}

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth()
  const [color, setColorState] = React.useState(readStoredColor)
  const [saving, setSaving] = React.useState(false)
  const colorRef = React.useRef(color)

  // Mirror the colour onto <html> for the CSS palette and remember it on this device.
  React.useEffect(() => {
    colorRef.current = color
    document.documentElement.dataset.accent = color
    writeStorage(THEME_COLOR_STORAGE_KEY, color)
  }, [color])

  // A registered account's saved colour follows it across devices.
  React.useEffect(() => {
    if (!account) return
    return onSnapshot(doc(db, "users", account.uid), (snapshot) => {
      const saved = snapshot.data()?.accentColor
      if (isThemeColor(saved)) setColorState(saved)
    })
  }, [account])

  const setColor = React.useCallback(
    async (next: ThemeColor) => {
      const previous = colorRef.current
      setColorState(next)
      if (!account) return
      setSaving(true)
      try {
        const userRef = doc(db, "users", account.uid)
        const exists = (await getDoc(userRef)).exists()
        // Merge writes keep the rest of the profile intact.
        await setDoc(
          userRef,
          {
            accentColor: next,
            updatedAt: serverTimestamp(),
            ...(exists ? {} : { createdAt: serverTimestamp() }),
          },
          { merge: true }
        )
      } catch (error) {
        setColorState(previous)
        throw error
      } finally {
        setSaving(false)
      }
    },
    [account]
  )

  const value = React.useMemo(() => ({ color, saving, setColor }), [color, saving, setColor])
  return <AccentColorContext.Provider value={value}>{children}</AccentColorContext.Provider>
}

export function useAccentColor() {
  const context = React.useContext(AccentColorContext)
  if (!context) throw new Error("useAccentColor must be used within AccentColorProvider")
  return context
}
