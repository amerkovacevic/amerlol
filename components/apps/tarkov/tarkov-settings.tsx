"use client"

import * as React from "react"
import { Download, RotateCcw, Upload } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { parseTarkovBackup, resetTarkovModeProgress, restoreTarkovBackup, serializeTarkovBackup } from "@/lib/tarkov/storage/backup"
import type { TarkovGameMode, QuestVisibilityMode } from "@/lib/tarkov/types"

const MODE_STORAGE_KEY = "amerlol:tarkov:default-mode"
const VISIBILITY_STORAGE_KEY = "amerlol:tarkov:quest-visibility"

export function TarkovSettings() {
  const [mode, setMode] = React.useState<TarkovGameMode>("pvp")
  const [visibilityMode, setVisibilityMode] = React.useState<QuestVisibilityMode>("my-quests")
  const [message, setMessage] = React.useState<string>()
  const importRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY)
    if (storedMode === "pvp" || storedMode === "pve" || storedMode === "seasonal") setMode(storedMode)
    const storedVisibility = window.localStorage.getItem(VISIBILITY_STORAGE_KEY)
    if (storedVisibility === "my-quests" || storedVisibility === "eligible" || storedVisibility === "all") setVisibilityMode(storedVisibility)
  }, [])

  const saveMode = (nextMode: TarkovGameMode) => {
    setMode(nextMode)
    window.localStorage.setItem(MODE_STORAGE_KEY, nextMode)
  }

  const saveVisibility = (nextMode: QuestVisibilityMode) => {
    setVisibilityMode(nextMode)
    window.localStorage.setItem(VISIBILITY_STORAGE_KEY, nextMode)
  }

  const exportBackup = () => {
    const blob = new Blob([serializeTarkovBackup(mode)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `amerlol-tarkov-${mode}-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage(`${mode.toUpperCase()} backup exported.`)
  }

  const importBackup = async (file: File) => {
    try {
      const backup = parseTarkovBackup(await file.text())
      restoreTarkovBackup(backup)
      saveMode(backup.mode)
      setMessage(`${backup.mode.toUpperCase()} backup restored and synced where signed in.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to import Tarkov backup.")
    } finally {
      if (importRef.current) importRef.current.value = ""
    }
  }

  const resetMode = () => {
    if (!window.confirm(`Reset all ${mode.toUpperCase()} Tarkov progression? Export a backup first if you want to keep this wipe.`)) return
    resetTarkovModeProgress(mode)
    setMessage(`${mode.toUpperCase()} progression reset. Other game modes were not changed.`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default game mode</CardTitle>
          <CardDescription>Choose which progression dataset the tracker should prefer when it opens. PvP and PvE progression remain isolated.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={mode === "pvp" ? "default" : "outline"} onClick={() => saveMode("pvp")}>PvP</Button>
          <Button variant={mode === "pve" ? "default" : "outline"} onClick={() => saveMode("pve")}>PvE</Button>
          <Button variant={mode === "seasonal" ? "default" : "outline"} onClick={() => saveMode("seasonal")}>Seasonal PvP</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quest visibility</CardTitle>
          <CardDescription>My Quests is the safest mode. It only shows quests confirmed on your current character instead of assuming every mathematically eligible quest is actually present in-game.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant={visibilityMode === "my-quests" ? "default" : "outline"} onClick={() => saveVisibility("my-quests")}>My Quests</Button>
            <Button variant={visibilityMode === "eligible" ? "default" : "outline"} onClick={() => saveVisibility("eligible")}>Eligible</Button>
            <Button variant={visibilityMode === "all" ? "default" : "outline"} onClick={() => saveVisibility("all")}>All Quests</Button>
          </div>
          <p className="text-sm text-muted-foreground">Eligible is planning-only and may include quests the game has not issued. All Quests is for research/debugging.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup and wipe reset</CardTitle>
          <CardDescription>Backup files are mode-scoped and contain your PMC profile, quest confirmations, quest/objective progress, and hideout station levels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={exportBackup}><Download className="h-4 w-4" />Export {mode.toUpperCase()}</Button>
            <Button variant="outline" className="gap-2" onClick={() => importRef.current?.click()}><Upload className="h-4 w-4" />Import backup</Button>
            <Button variant="destructive" className="gap-2" onClick={resetMode}><RotateCcw className="h-4 w-4" />Reset {mode.toUpperCase()}</Button>
          </div>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importBackup(file)
            }}
          />
          {message && <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">{message}</p>}
          <p className="text-xs text-muted-foreground">A reset affects only the selected game mode. It does not delete static Tarkov game data or another mode's progress.</p>
        </CardContent>
      </Card>
    </div>
  )
}
