"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { loadQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress } from "@/lib/tarkov/storage/quest-progress"
import type { TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

interface QuestChainProps {
  mode: TarkovGameMode
  quests: TarkovQuest[]
  traders: Record<string, string>
}

function ancestors(questId: string, byId: Map<string, TarkovQuest>): string[] {
  const seen = new Set<string>()
  const visit = (id: string) => {
    const quest = byId.get(id)
    if (!quest) return
    for (const prerequisiteId of quest.prerequisiteQuestIds) {
      if (seen.has(prerequisiteId)) continue
      seen.add(prerequisiteId)
      visit(prerequisiteId)
    }
  }
  visit(questId)
  return [...seen]
}

function descendants(questId: string, quests: readonly TarkovQuest[]): string[] {
  const seen = new Set<string>()
  const visit = (id: string) => {
    for (const quest of quests) {
      if (!quest.prerequisiteQuestIds.includes(id) || seen.has(quest.id)) continue
      seen.add(quest.id)
      visit(quest.id)
    }
  }
  visit(questId)
  return [...seen]
}

export function QuestChain({ mode, quests, traders }: QuestChainProps) {
  const [query, setQuery] = React.useState("")
  const [selectedId, setSelectedId] = React.useState<string | undefined>()
  const [revision, setRevision] = React.useState(0)

  React.useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener("storage", refresh)
    window.addEventListener("amerlol:tarkov-progress-changed", refresh)
    return () => {
      window.removeEventListener("storage", refresh)
      window.removeEventListener("amerlol:tarkov-progress-changed", refresh)
    }
  }, [])

  const matches = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return quests.filter((quest) =>
      quest.name.toLowerCase().includes(term) || (traders[quest.traderId] ?? "").toLowerCase().includes(term)
    ).slice(0, 12)
  }, [query, quests, traders])

  const selected = quests.find((quest) => quest.id === selectedId)
  const chain = React.useMemo(() => {
    void revision
    if (!selected) return undefined
    const byId = new Map(quests.map((quest) => [quest.id, quest]))
    const presence = loadQuestPresence(mode)
    const progress = loadQuestProgress(mode)
    const before = ancestors(selected.id, byId).map((id) => byId.get(id)).filter(Boolean) as TarkovQuest[]
    const after = descendants(selected.id, quests).map((id) => byId.get(id)).filter(Boolean) as TarkovQuest[]
    const statusFor = (quest: TarkovQuest) => {
      const state = progress[quest.id]?.status
      if (state) return state
      const seen = presence[quest.id]
      if (!seen) return "unconfirmed"
      return seen.status
    }
    return { before, after, statusFor }
  }, [mode, quests, revision, selected])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quest chain explorer</CardTitle>
          <CardDescription>Inspect one quest at a time to see prerequisites, blockers, and downstream unlocks without rendering the entire wipe graph.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search quest or trader" className="pl-9" />
          </div>
          {matches.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {matches.map((quest) => (
                <button key={quest.id} type="button" onClick={() => { setSelectedId(quest.id); setQuery(quest.name) }} className="rounded-lg border p-3 text-left hover:bg-muted/50">
                  <p className="font-medium">{quest.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{traders[quest.traderId] ?? quest.traderId}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && chain && (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px_1fr]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUp className="h-4 w-4" />Prerequisites</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {chain.before.length === 0 ? <p className="text-sm text-muted-foreground">No prerequisite quests.</p> : chain.before.map((quest) => (
                <div key={quest.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2"><p className="font-medium">{quest.name}</p><Badge variant="outline">{chain.statusFor(quest)}</Badge></div>
                  <p className="mt-1 text-xs text-muted-foreground">{traders[quest.traderId] ?? quest.traderId} · level {quest.minimumLevel}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="self-start">
            <CardHeader>
              <CardTitle>{selected.name}</CardTitle>
              <CardDescription>{traders[selected.traderId] ?? selected.traderId} · minimum level {selected.minimumLevel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Prerequisites</span><span>{selected.prerequisiteQuestIds.length}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Direct unlocks</span><span>{quests.filter((quest) => quest.prerequisiteQuestIds.includes(selected.id)).length}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Kappa</span><span>{selected.kappaRequired ? "Required" : "No"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Lightkeeper</span><span>{selected.lightkeeperRequired ? "Required" : "No"}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowDown className="h-4 w-4" />Unlocks downstream</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {chain.after.length === 0 ? <p className="text-sm text-muted-foreground">No downstream quests detected.</p> : chain.after.map((quest) => (
                <div key={quest.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2"><p className="font-medium">{quest.name}</p><Badge variant="outline">{chain.statusFor(quest)}</Badge></div>
                  <p className="mt-1 text-xs text-muted-foreground">{traders[quest.traderId] ?? quest.traderId} · level {quest.minimumLevel}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
