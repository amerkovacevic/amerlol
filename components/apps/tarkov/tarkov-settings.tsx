"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { TarkovGameMode, QuestVisibilityMode } from "@/lib/tarkov/types"

const MODE_STORAGE_KEY = "amerlol:tarkov:default-mode"
const VISIBILITY_STORAGE_KEY = "amerlol:tarkov:quest-visibility"

export function TarkovSettings() {
  const [mode, setMode] = React.useState<TarkovGameMode>("pvp")
  const [visibilityMode, setVisibilityMode] = React.useState<QuestVisibilityMode>("my-quests")

  React.useEffect(() => {
    const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY)
    if (storedMode === "pvp" || storedMode === "pve" || storedMode === "seasonal") {
      setMode(storedMode)
    }

    const storedVisibility = window.localStorage.getItem(VISIBILITY_STORAGE_KEY)
    if (storedVisibility === "my-quests" || storedVisibility === "eligible" || storedVisibility === "all") {
      setVisibilityMode(storedVisibility)
    }
  }, [])

  const saveMode = (nextMode: TarkovGameMode) => {
    setMode(nextMode)
    window.localStorage.setItem(MODE_STORAGE_KEY, nextMode)
  }

  const saveVisibility = (nextMode: QuestVisibilityMode) => {
    setVisibilityMode(nextMode)
    window.localStorage.setItem(VISIBILITY_STORAGE_KEY, nextMode)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default game mode</CardTitle>
          <CardDescription>
            Choose which progression dataset the tracker should prefer when it opens. Profile-backed settings will replace this local preference once Tarkov profiles are implemented.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={mode === "pvp" ? "default" : "outline"} onClick={() => saveMode("pvp")}>
            PvP
          </Button>
          <Button variant={mode === "pve" ? "default" : "outline"} onClick={() => saveMode("pve")}>
            PvE
          </Button>
          <Button variant={mode === "seasonal" ? "default" : "outline"} onClick={() => saveMode("seasonal")}>
            Seasonal PvP
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quest visibility</CardTitle>
          <CardDescription>
            My Quests is the default and safest mode. It only shows quests confirmed on your current character instead of assuming every mathematically eligible quest is actually present in-game.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant={visibilityMode === "my-quests" ? "default" : "outline"} onClick={() => saveVisibility("my-quests")}>
              My Quests
            </Button>
            <Button variant={visibilityMode === "eligible" ? "default" : "outline"} onClick={() => saveVisibility("eligible")}>
              Eligible
            </Button>
            <Button variant={visibilityMode === "all" ? "default" : "outline"} onClick={() => saveVisibility("all")}>
              All Quests
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Eligible mode is useful for planning but may include quests the game has not issued yet. All Quests is intended for research and debugging.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
