"use client"

import * as React from "react"
import { Check, CheckCircle2, Circle, CircleSlash2, Search, ShieldCheck, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { calculateQuestState } from "@/lib/tarkov/domain/quest-state"
import {
  loadLocalTarkovProfile,
  saveLocalTarkovProfile,
  type LocalTarkovProfile,
} from "@/lib/tarkov/storage/profile"
import {
  loadQuestProgress,
  saveQuestProgress,
  setQuestProgressStatus,
  toggleObjectiveCompletion,
  type QuestProgressMap,
} from "@/lib/tarkov/storage/quest-progress"
import {
  loadQuestPresence,
  removeQuestPresence,
  saveQuestPresence,
  setQuestPresenceStatus,
} from "@/lib/tarkov/storage/quest-presence"
import type { QuestPresence, TarkovFaction, TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

interface QuestReconciliationProps {
  mode: TarkovGameMode
  quests: TarkovQuest[]
  traders: Record<string, string>
  maps: Record<string, string>
}

type ReconcileView = "my-quests" | "eligible" | "find"
const MAX_RESULTS = 100

export function QuestReconciliation({ mode, quests, traders, maps }: QuestReconciliationProps) {
  const [view, setView] = React.useState<ReconcileView>("my-quests")
  const [query, setQuery] = React.useState("")
  const [presence, setPresence] = React.useState<Record<string, QuestPresence>>({})
  const [progress, setProgress] = React.useState<QuestProgressMap>({})
  const [profile, setProfile] = React.useState<LocalTarkovProfile>({ level: 1, faction: "USEC" })
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setPresence(loadQuestPresence(mode))
    setProgress(loadQuestProgress(mode))
    setProfile(loadLocalTarkovProfile(mode))
    setHydrated(true)
  }, [mode])

  const persistPresence = React.useCallback((next: Record<string, QuestPresence>) => {
    setPresence(next)
    saveQuestPresence(mode, next)
  }, [mode])

  const persistProgress = React.useCallback((next: QuestProgressMap) => {
    setProgress(next)
    saveQuestProgress(mode, next)
  }, [mode])

  const updateProfile = (patch: Partial<LocalTarkovProfile>) => {
    const next = { ...profile, ...patch }
    setProfile(next)
    saveLocalTarkovProfile(mode, next)
  }

  const markPresent = (questId: string) => persistPresence(setQuestPresenceStatus(presence, questId, "available"))
  const markNotPresent = (questId: string) => persistPresence(setQuestPresenceStatus(presence, questId, "not-present"))
  const clearDecision = (questId: string) => persistPresence(removeQuestPresence(presence, questId))

  const setStatus = (questId: string, status: "active" | "completed" | "failed") => {
    persistProgress(setQuestProgressStatus(progress, questId, status))
    if (presence[questId]?.status === "not-present" || !presence[questId]) {
      persistPresence(setQuestPresenceStatus(presence, questId, status))
    }
  }

  const toggleObjective = (questId: string, objectiveId: string) => {
    persistProgress(toggleObjectiveCompletion(progress, questId, objectiveId))
  }

  const confirmedIds = React.useMemo(
    () => new Set(Object.values(presence).filter((entry) => entry.status !== "not-present").map((entry) => entry.questId)),
    [presence]
  )
  const rejectedIds = React.useMemo(
    () => new Set(Object.values(presence).filter((entry) => entry.status === "not-present").map((entry) => entry.questId)),
    [presence]
  )

  const eligibleIds = React.useMemo(() => {
    const ids = new Set<string>()
    for (const quest of quests) {
      const state = calculateQuestState(quest, profile, progress)
      if (state.state === "available" || state.state === "active") ids.add(quest.id)
    }
    return ids
  }, [profile, progress, quests])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleQuests = React.useMemo(() => {
    const base = view === "my-quests"
      ? quests.filter((quest) => confirmedIds.has(quest.id))
      : view === "eligible"
        ? quests.filter((quest) => eligibleIds.has(quest.id) && !rejectedIds.has(quest.id))
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
  }, [confirmedIds, eligibleIds, maps, normalizedQuery, quests, rejectedIds, traders, view])

  if (!hydrated) {
    return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading Tarkov profile…</CardContent></Card>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Character profile</CardTitle>
          <CardDescription>Used only to calculate the separate Eligible planning view. It never auto-adds quests to My Quests.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="w-full sm:w-40">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="tarkov-level">PMC level</label>
            <Input
              id="tarkov-level"
              type="number"
              min={1}
              max={79}
              value={profile.level}
              onChange={(event) => updateProfile({ level: Math.max(1, Math.min(79, Number(event.target.value) || 1)) })}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Faction</p>
            <div className="flex gap-2">
              {(["USEC", "BEAR"] as TarkovFaction[]).map((faction) => (
                <Button key={faction} size="sm" variant={profile.faction === faction ? "default" : "outline"} onClick={() => updateProfile({ faction })}>
                  {faction}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Confirmed on character" value={confirmedIds.size} />
        <SummaryCard label="Calculated eligible" value={eligibleIds.size} />
        <SummaryCard label="Hidden false positives" value={rejectedIds.size} />
        <SummaryCard label="Quest catalog" value={quests.length} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Quest tracker</CardTitle>
              <CardDescription className="mt-1 max-w-2xl">
                My Quests is presence-backed. Eligible is calculation-only. Find / Reconcile lets you correct the tracker against Tarkov itself.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={view === "my-quests" ? "default" : "outline"} onClick={() => setView("my-quests")}>My Quests</Button>
              <Button size="sm" variant={view === "eligible" ? "default" : "outline"} onClick={() => setView("eligible")}>Eligible</Button>
              <Button size="sm" variant={view === "find" ? "default" : "outline"} onClick={() => setView("find")}>Find / Reconcile</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search quest, trader, or map…" className="pl-9" />
          </div>

          {view === "my-quests" && confirmedIds.size === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No quests confirmed yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Open Find / Reconcile and confirm only the quests actually visible on your current character.</p>
              <Button className="mt-4" onClick={() => setView("find")}>Reconcile my quests</Button>
            </div>
          ) : visibleQuests.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No matching quests.</div>
          ) : (
            <div className="divide-y rounded-lg border">
              {visibleQuests.map((quest) => {
                const decision = presence[quest.id]
                const questProgress = progress[quest.id]
                const traderName = traders[quest.traderId] ?? "Unknown trader"
                const mapNames = quest.mapIds.map((id) => maps[id]).filter(Boolean)
                const completedObjectives = new Set(questProgress?.completedObjectiveIds ?? [])

                return (
                  <div key={quest.id} className="space-y-3 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{quest.name}</p>
                          <Badge variant="outline">Lv {quest.minimumLevel}</Badge>
                          {quest.kappaRequired && <Badge variant="secondary">Kappa</Badge>}
                          {questProgress?.status && <Badge>{questProgress.status}</Badge>}
                          {decision?.status === "not-present" && <Badge variant="destructive">Not on character</Badge>}
                          {view === "eligible" && !confirmedIds.has(quest.id) && <Badge variant="outline">Unconfirmed</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {traderName}{mapNames.length > 0 ? ` · ${mapNames.join(", ")}` : ""}{quest.objectives.length > 0 ? ` · ${quest.objectives.length} objective${quest.objectives.length === 1 ? "" : "s"}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {decision?.status !== "available" && decision?.status !== "active" && decision?.status !== "completed" && (
                          <Button size="sm" onClick={() => markPresent(quest.id)} className="gap-1.5"><Check className="h-4 w-4" />I have this</Button>
                        )}
                        {confirmedIds.has(quest.id) && (
                          <>
                            <Button size="sm" variant={questProgress?.status === "active" ? "default" : "outline"} onClick={() => setStatus(quest.id, "active")}>Active</Button>
                            <Button size="sm" variant={questProgress?.status === "completed" ? "default" : "outline"} onClick={() => setStatus(quest.id, "completed")}>Complete</Button>
                          </>
                        )}
                        {decision?.status !== "not-present" && view !== "my-quests" && (
                          <Button size="sm" variant="outline" onClick={() => markNotPresent(quest.id)} className="gap-1.5"><CircleSlash2 className="h-4 w-4" />Not on my character</Button>
                        )}
                        {decision && view === "find" && (
                          <Button size="icon" variant="ghost" onClick={() => clearDecision(quest.id)} aria-label={`Clear decision for ${quest.name}`}><X className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </div>

                    {confirmedIds.has(quest.id) && quest.objectives.length > 0 && questProgress?.status !== "completed" && (
                      <div className="grid gap-2 border-t pt-3 md:grid-cols-2">
                        {quest.objectives.map((objective) => {
                          const done = completedObjectives.has(objective.id)
                          return (
                            <button
                              key={objective.id}
                              type="button"
                              onClick={() => toggleObjective(quest.id, objective.id)}
                              className="flex items-start gap-2 rounded-md border p-3 text-left hover:bg-muted/50"
                            >
                              {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                              <span className={done ? "text-sm line-through text-muted-foreground" : "text-sm"}>{objective.description}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {visibleQuests.length === MAX_RESULTS && <p className="text-center text-xs text-muted-foreground">Showing the first {MAX_RESULTS} matches. Refine your search to narrow the catalog.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-4"><p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>
}
