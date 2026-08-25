"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { loadQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress } from "@/lib/tarkov/storage/quest-progress"
import type { TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

interface TraderProgressionProps { mode: TarkovGameMode; quests: TarkovQuest[]; traders: Record<string, string> }

export function TraderProgression({ mode, quests, traders }: TraderProgressionProps) {
  const [revision, setRevision] = React.useState(0)
  React.useEffect(() => { const refresh = () => setRevision((value) => value + 1); window.addEventListener("storage", refresh); window.addEventListener("amerlol:tarkov-progress-changed", refresh); return () => { window.removeEventListener("storage", refresh); window.removeEventListener("amerlol:tarkov-progress-changed", refresh) } }, [])

  const rows = React.useMemo(() => {
    void revision
    const presence = loadQuestPresence(mode); const progress = loadQuestProgress(mode); const grouped = new Map<string, TarkovQuest[]>()
    for (const quest of quests) { const current = grouped.get(quest.traderId) ?? []; current.push(quest); grouped.set(quest.traderId, current) }
    return [...grouped.entries()].map(([traderId, traderQuests]) => {
      let completed = 0; let active = 0; let currentConfirmed = 0; let kappaRemaining = 0; let lightkeeperRemaining = 0
      for (const quest of traderQuests) {
        const state = progress[quest.id]?.status; const seen = presence[quest.id]
        const isCompleted = state === "completed" || seen?.status === "completed"
        const isCurrent = Boolean(seen && (seen.status === "available" || seen.status === "active") && state !== "completed" && state !== "failed")
        const isActive = isCurrent && (state === "active" || seen?.status === "active")
        if (isCompleted) completed += 1
        if (isActive) active += 1
        if (isCurrent) currentConfirmed += 1
        if (quest.kappaRequired && !isCompleted) kappaRemaining += 1
        if (quest.lightkeeperRequired && !isCompleted) lightkeeperRemaining += 1
      }
      return { traderId, name: traders[traderId] ?? traderId, total: traderQuests.length, completed, active, currentConfirmed, kappaRemaining, lightkeeperRemaining, percent: traderQuests.length === 0 ? 0 : Math.round((completed / traderQuests.length) * 100) }
    }).sort((a, b) => b.active - a.active || b.completed - a.completed || a.name.localeCompare(b.name))
  }, [mode, quests, revision, traders])

  return <div className="space-y-6"><Card><CardHeader><CardTitle>Trader progression</CardTitle><CardDescription>Completion is based on tracked history. Current confirmed counts include only unfinished quests actually present on your character.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <div key={row.traderId} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{row.name}</p><p className="mt-1 text-xs text-muted-foreground">{row.completed} / {row.total} completed</p></div><Badge variant="outline">{row.percent}%</Badge></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground transition-all" style={{ width: `${row.percent}%` }} /></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-md border p-2"><span className="text-muted-foreground">Active</span><p className="mt-1 font-medium">{row.active}</p></div><div className="rounded-md border p-2"><span className="text-muted-foreground">Current confirmed</span><p className="mt-1 font-medium">{row.currentConfirmed}</p></div><div className="rounded-md border p-2"><span className="text-muted-foreground">Kappa remaining</span><p className="mt-1 font-medium">{row.kappaRemaining}</p></div><div className="rounded-md border p-2"><span className="text-muted-foreground">Lightkeeper remaining</span><p className="mt-1 font-medium">{row.lightkeeperRemaining}</p></div></div></div>)}</CardContent></Card></div>
}
