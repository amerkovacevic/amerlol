"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { TarkovGameMode } from "@/lib/tarkov/types"

const STORAGE_KEY = "amerlol:tarkov:default-mode"

export function TarkovSettings() {
  const [mode, setMode] = React.useState<TarkovGameMode>("pvp")

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === "pvp" || stored === "pve" || stored === "seasonal") {
      setMode(stored)
    }
  }, [])

  const saveMode = (nextMode: TarkovGameMode) => {
    setMode(nextMode)
    window.localStorage.setItem(STORAGE_KEY, nextMode)
  }

  return (
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
  )
}
