"use client"

import * as React from "react"
import { Check, CircleSlash2, Search, ShieldCheck, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  loadQuestPresence,
  removeQuestPresence,
  saveQuestPresence,
  setQuestPresenceStatus,
} from "@/lib/tarkov/storage/quest-presence"
import type { QuestPresence, TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

interface QuestReconciliationProps {
  mode: TarkovGameMode
  quests: TarkovQuest[]
  traders: Record<string, string>
  maps: Record<string, string>
}

type ReconcileView = "my-quests" | "find"

const MAX_RESULTS = 100

export function QuestReconciliation({ mode, quests, traders, maps }: QuestReconciliationProps) {
  const [view, setView] = React.useState<ReconcileView>("my-quests")
  const [query, setQuery] = React.useState("")
  const [presence, setPresence] = React.useState<Record<string, QuestPresence>>({})
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setPresence(loadQuestPresence(mode))
    setHydrated(true)
  }, [mode])

  const persist = React.useCallback((next: Record<string, QuestPresence>) => {
    setPresence(next)
    saveQuestPresence(mode, next)
  }, [mode])

  const markPresent = (questId: string) => {
    persist(setQuestPresenceStatus(presence, questId, "available"))
  }

  const markNotPresent = (questId: string) => {
    persist(setQuestPresenceStatus(presence, questId, "not-present"))
  }

  const clearDecision = (questId: string) => {
    persist(removeQuestPresence(presence, questId))
  }

  const confirmedIds = React.useMemo(
    () => new Set(Object.values(presence).filter((entry) => entry.status !== "not-present").map((entry) => entry.questId)),
    [presence]
  )

  const rejectedIds = React.useMemo(
    () => new Set(Object.values(presence).filter((entry) => entry.status === "not-present").map((entry) => entry.questId)),
    [presence]
  )

  const normalizedQuery = query.trim().toLowerCase()
  const visibleQuests = React.useMemo(() => {
    const base = view === "my-quests"
      ? quests.filter((quest) => confirmedIds.has(quest.id))
      : quests

    const filtered = normalizedQuery
      ? base.filter((quest) => {
          const trader = traders[quest.traderId] ?? ""
          const mapNames = quest.mapIds.map((id) => maps[id] ?? "").join(" ")
          return `${quest.name} ${trader} ${mapNames}`.toLowerCase().includes(normalizedQuery)
        })
      : base

    return [...filtered]
      .sort((a, b) => a.minimumLevel - b.minimumLevel || a.name.localeCompare(b.name))
      .slice(0, MAX_RESULTS)
  }, [confirmedIds, maps, normalizedQuery, quests, traders, view])

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading quest confirmations…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Confirmed on character" value={confirmedIds.size} />
        <SummaryCard label="Hidden false positives" value={rejectedIds.size} />
        <SummaryCard label="Quest catalog" value={quests.length} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Quest reconciliation</CardTitle>
              <CardDescription className="mt-1 max-w-2xl">
                Amer.lol does not assume an eligible quest exists on your character. Confirm what Tarkov actually shows you, and explicitly reject incorrect predictions so they stay out of My Quests.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={view === "my-quests" ? "default" : "outline"}
                onClick={() => setView("my-quests")}
              >
                My Quests
              </Button>
              <Button
                size="sm"
                variant={view === "find" ? "default" : "outline"}
                onClick={() => setView("find")}
              >
                Find / Reconcile
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search quest, trader, or map…"
              className="pl-9"
            />
          </div>

          {view === "my-quests" && confirmedIds.size === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No quests confirmed yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Open Find / Reconcile and mark the quests that are actually visible in your Tarkov task list. Nothing is added automatically just because the data says you may qualify for it.
              </p>
              <Button className="mt-4" onClick={() => setView("find")}>
                Reconcile my quests
              </Button>
            </div>
          ) : visibleQuests.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No matching quests.
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {visibleQuests.map((quest) => {
                const decision = presence[quest.id]
                const traderName = traders[quest.traderId] ?? "Unknown trader"
                const mapNames = quest.mapIds.map((id) => maps[id]).filter(Boolean)

                return (
                  <div key={quest.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{quest.name}</p>
                        <Badge variant="outline">Lv {quest.minimumLevel}</Badge>
                        {quest.kappaRequired && <Badge variant="secondary">Kappa</Badge>}
                        {decision?.status === "available" && <Badge>Confirmed</Badge>}
                        {decision?.status === "not-present" && <Badge variant="destructive">Not on character</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {traderName}
                        {mapNames.length > 0 ? ` · ${mapNames.join(", ")}` : ""}
                        {quest.objectives.length > 0 ? ` · ${quest.objectives.length} objective${quest.objectives.length === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {decision?.status !== "available" && (
                        <Button size="sm" onClick={() => markPresent(quest.id)} className="gap-1.5">
                          <Check className="h-4 w-4" />
                          I have this
                        </Button>
                      )}
                      {decision?.status !== "not-present" && (
                        <Button size="sm" variant="outline" onClick={() => markNotPresent(quest.id)} className="gap-1.5">
                          <CircleSlash2 className="h-4 w-4" />
                          Not on my character
                        </Button>
                      )}
                      {decision && (
                        <Button size="icon" variant="ghost" onClick={() => clearDecision(quest.id)} aria-label={`Clear decision for ${quest.name}`}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {visibleQuests.length === MAX_RESULTS && (
            <p className="text-center text-xs text-muted-foreground">
              Showing the first {MAX_RESULTS} matches. Refine your search to narrow the catalog.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
