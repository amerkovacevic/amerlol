"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  parseTarkovBackup,
  resetTarkovModeProgress,
  restoreTarkovBackup,
  serializeTarkovBackup,
} from "@/lib/tarkov/storage/backup"
import type { TarkovGameMode, QuestVisibilityMode } from "@/lib/tarkov/types"

const MODE_STORAGE_KEY = "amerlol:tarkov:default-mode"
const VISIBILITY_STORAGE_KEY = "amerlol:tarkov:quest-visibility"

export function TarkovSettings() {
  const [mode, setMode] = React.useState<TarkovGameMode>("pvp")
  const [visibilityMode, setVisibilityMode] = React.useState<QuestVisibilityMode>("my-quests")
  const [message, setMessage] = React.useState<string | undefined>()
  const importInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY)
    if (storedMode === "pvp" || storedMode === "pve" || storedMode === "seasonal") setMode(storedMode)
    const storedVisibility = window.localStorage.getItem(VISIBILITY_STORAGE_KEY)
    if (storedVisibility === "my-quests" || storedVisibility === "eligible" || storedVisibility === "all") setVisibilityMode(storedVisibility)
  }, [])

  const saveMode = (nextMode: TarkovGameMode) => {
    setMode(nextMode)
    setMessage(undefined)
    window.localStorage.setItem(MODE_STORAGE_KEY, nextMode)
  }

  const saveVisibility = (nextMode: QuestVisibilityMode) => {
    setVisibilityMode(nextMode)
    window.localStorage.setItem(VISIBILITY_STORAGE_KEY, nextMode)
  }

  const exportBackup = () => {
    const blob = new Blob([serializeTarkovBackup(mode)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `amerlol-tarkov-${mode}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setMessage(`${mode.toUpperCase()} backup exported.`)
  }

  const importBackup = async (file: File) => {
    try {
      const backup = parseTarkovBackup(await file.text())
      restoreTarkovBackup(backup)
      setMode(backup.mode)
      window.localStorage.setItem(MODE_STORAGE_KEY, backup.mode)
      setMessage(`${backup.mode.toUpperCase()} backup restored.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to restore Tarkov backup.")
    } finally {
      if (importInputRef.current) importInputRef.current.value = ""
    }
  }

  const resetMode = () => {
    const confirmed = window.confirm(`Reset all ${mode.toUpperCase()} Tarkov progression? Export a backup first if you want to preserve this wipe.`)
    if (!confirmed) return
    resetTarkovModeProgress(mode)
    setMessage(`${mode.toUpperCase()} progression reset.`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Default game mode</CardTitle><CardDescription>Choose which progression dataset the tracker should prefer when it opens.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={mode === "pvp" ? "default" : "outline"} onClick={() => saveMode("pvp")}>PvP</Button>
          <Button variant={mode === "pve" ? "default" : "outline"} onClick={() => saveMode("pve")}>PvE</Button>
          <Button variant={mode === "seasonal" ? "default" : "outline"} onClick={() => saveMode("seasonal")}>Seasonal PvP</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quest visibility</CardTitle><CardDescription>My Quests is the safest default. It only shows quests confirmed on your current character instead of assuming every mathematically eligible quest is actually present in-game.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant={visibilityMode === "my-quests" ? "default" : "outline"} onClick={() => saveVisibility("my-quests")}>My Quests</Button>
            <Button variant={visibilityMode === "eligible" ? "default" : "outline"} onClick={() => saveVisibility("eligible")}>Eligible</Button>
            <Button variant={visibilityMode === "all" ? "default" : "outline"} onClick={() => saveVisibility("all")}>All Quests</Button>
          </div>
          <p className="text-sm text-muted-foreground">Eligible mode is useful for planning but may include quests the game has not issued yet. All Quests is intended for research and debugging.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Backup and wipe controls</CardTitle><CardDescription>Export the selected mode before a wipe or major manual reset. Imports are validated and restore only the mode stored in the backup.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportBackup}>Export {mode.toUpperCase()}</Button>
            <Button variant="outline" onClick={() => importInputRef.current?.click()}>Import backup</Button>
            <Button variant="destructive" onClick={resetMode}>Reset {mode.toUpperCase()}</Button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importBackup(file)
            }}
          />
          {message && <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">{message}</p>}
          <p className="text-xs text-muted-foreground">A reset affects only the selected game mode. It does not delete static Tarkov game data or another mode&apos;s progress.</p>
        </CardContent>
      </Card>
    </div>
  )
}
