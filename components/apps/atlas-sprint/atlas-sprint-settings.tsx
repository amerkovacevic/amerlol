"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export const ATLAS_SPRINT_SETTINGS_KEY = "atlas-sprint-settings"
export const ATLAS_SPRINT_SETTINGS_EVENT = "atlas-sprint-settings-changed"

export interface AtlasSprintPreferences {
  focusOnCorrectAnswer: boolean
}

export const DEFAULT_ATLAS_SPRINT_PREFERENCES: AtlasSprintPreferences = {
  focusOnCorrectAnswer: true,
}

export function readAtlasSprintPreferences(): AtlasSprintPreferences {
  if (typeof window === "undefined") return DEFAULT_ATLAS_SPRINT_PREFERENCES
  try {
    const saved = window.localStorage.getItem(ATLAS_SPRINT_SETTINGS_KEY)
    return saved ? { ...DEFAULT_ATLAS_SPRINT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_ATLAS_SPRINT_PREFERENCES
  } catch {
    return DEFAULT_ATLAS_SPRINT_PREFERENCES
  }
}

export function AtlasSprintSettings() {
  const [preferences, setPreferences] = React.useState<AtlasSprintPreferences>(DEFAULT_ATLAS_SPRINT_PREFERENCES)

  React.useEffect(() => setPreferences(readAtlasSprintPreferences()), [])

  const setFocusOnCorrectAnswer = (enabled: boolean) => {
    const next = { ...preferences, focusOnCorrectAnswer: enabled }
    setPreferences(next)
    window.localStorage.setItem(ATLAS_SPRINT_SETTINGS_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(ATLAS_SPRINT_SETTINGS_EVENT, { detail: next }))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card>
        <CardHeader>
          <CardTitle>Map settings</CardTitle>
          <CardDescription>Choose how the map responds while you play.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-1">
              <Label htmlFor="focus-on-answer">Focus on correct answers</Label>
              <p className="text-sm text-muted-foreground">Briefly zoom to each country after you guess it, then return to the quiz view.</p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input id="focus-on-answer" type="checkbox" checked={preferences.focusOnCorrectAnswer} onChange={(event) => setFocusOnCorrectAnswer(event.target.checked)} className="peer sr-only" />
              <span className="h-6 w-11 rounded-full bg-secondary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-transform after:content-[''] peer-checked:after:translate-x-full" />
            </label>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
