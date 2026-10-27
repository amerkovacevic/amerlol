"use client"

import * as React from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { saveProfile, useProfile } from "@/components/auth/profile-provider"
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
  const { accentColor: savedColor } = useProfile()
  const [color, setColorState] = React.useState(readStoredColor)
  const [saving, setSaving] = React.useState(false)
  const colorRef = React.useRef(color)

  // A registered account's saved colour follows it across devices.
  const [seenSavedColor, setSeenSavedColor] = React.useState(savedColor)
  if (savedColor !== seenSavedColor) {
    setSeenSavedColor(savedColor)
    if (isThemeColor(savedColor)) setColorState(savedColor)
  }

  // Mirror the colour onto <html> for the CSS palette and remember it on this device.
  React.useEffect(() => {
    colorRef.current = color
    document.documentElement.dataset.accent = color
    writeStorage(THEME_COLOR_STORAGE_KEY, color)
  }, [color])

  const setColor = React.useCallback(
    async (next: ThemeColor) => {
      const previous = colorRef.current
      setColorState(next)
      if (!account) return
      setSaving(true)
      try {
        await saveProfile(account.uid, { accentColor: next })
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
