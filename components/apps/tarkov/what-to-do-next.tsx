"use client"

import * as React from "react"
import { ArrowRight, Backpack, CheckCircle2, Eye, KeyRound, MapPinned, Route, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buildRaidPlans } from "@/lib/tarkov/domain/raid-planner"
import { getMapRoutingData } from "@/lib/tarkov/routing/data"
import { loadQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress } from "@/lib/tarkov/storage/quest-progress"
import type { TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

interface WhatToDoNextProps {
  mode: TarkovGameMode
  quests: TarkovQuest[]
  maps: Record<string, string>
  items: Record<string, string>
}

export function WhatToDoNext({ mode, quests, maps, items }: WhatToDoNextProps) {
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

  const result = React.useMemo(() => {
    void revision
    const routingData = Object.fromEntries(
      [...new Set(quests.flatMap((quest) => quest.mapIds))]
        .map((mapId) => [mapId, getMapRoutingData(mapId)] as const)
        .filter((entry) => Boolean(entry[1]))
    )

    return buildRaidPlans(quests, loadQuestProgress(mode), loadQuestPresence(mode), { routingData })
  }, [mode, quests, revision])

  if (!result.best) {
    return (
      <Card>
        <CardContent className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No raid plan yet</h3>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Confirm your actual Tarkov quests and mark them active. The optimizer intentionally refuses to plan around unconfirmed predicted quests.
          </p>
        </CardContent>
      </Card>
    )
  }

  const plan = result.best
  const mapName = maps[plan.mapId] ?? plan.mapId
  const routeLabel = plan.route.mode === "geographic"
    ? "Geographic route"
    : plan.route.mode === "partial"
      ? "Partial geographic route"
      : "Priority route"
  const coordinateLabel = plan.route.coordinateSource === "upstream-world"
    ? "Live world coordinates"
    : plan.route.coordinateSource === "override"
      ? "Verified route pack"
      : "No coordinates"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Best raid now</Badge>
                <Badge variant="outline">Score {plan.score}</Badge>
                <Badge variant="outline">{routeLabel}</Badge>
                <Badge variant="outline">{coordinateLabel}</Badge>
              </div>
              <CardTitle className="mt-3 text-2xl">Run {mapName}</CardTitle>
              <CardDescription className="mt-2">
                Chosen only from quests confirmed on your character. The score favors stacking multiple incomplete objectives, quest overlap, setup-sensitive tasks, FIR opportunities, and represented quest XP.
              </CardDescription>
            </div>
            <MapPinned className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {plan.reasons.map((reason) => (
            <div key={reason} className="rounded-lg border p-3 text-sm">{reason}</div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Route className="h-5 w-5" />Optimal objective line</CardTitle>
            <CardDescription>
              {plan.route.mode === "geographic"
                ? plan.route.coordinateSource === "upstream-world"
                  ? `All ${plan.route.geographicObjectiveCount} routed objectives expose Tarkov world-space positions. The planner orders them geographically on the X/Z map plane. Spawn-aware routing is the next step.`
                  : `All ${plan.route.geographicObjectiveCount} routed objectives use verified route-pack coordinates.`
                : plan.route.mode === "partial"
                  ? `${plan.route.geographicObjectiveCount} objectives are geographically ordered; ${plan.route.fallbackObjectiveCount} still use priority fallback because coordinate data is missing.`
                  : "Coordinate data is not available for these objectives, so the line uses deterministic priority ordering: carried-item/key objectives first, general location tasks next, passive kill tasks while moving, and extract/survive objectives last."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {plan.objectives.map((step, index) => (
                <li key={`${step.questId}:${step.objectiveId}`} className="flex gap-3 rounded-lg border p-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold">{index + 1}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{step.description}</p>
                      <Badge variant="outline">{step.questName}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{step.reason}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Backpack className="h-5 w-5" />What to bring</CardTitle></CardHeader>
            <CardContent>
              {plan.bringItemIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mandatory carried quest items detected for this plan.</p>
              ) : (
                <ul className="space-y-2">
                  {plan.bringItemIds.map((id) => <li key={id} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4" />{items[id] ?? id}</li>)}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />Keys / access</CardTitle></CardHeader>
            <CardContent>
              {plan.requiredKeyIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No required key metadata detected for this route.</p>
              ) : (
                <ul className="space-y-2">
                  {plan.requiredKeyIds.map((id) => <li key={id} className="flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4" />{items[id] ?? id}</li>)}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Watch for in raid</CardTitle>
              <CardDescription>Quest loot detected from your confirmed incomplete objectives. FIR requirements are prioritized.</CardDescription>
            </CardHeader>
            <CardContent>
              {plan.watchForItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No quest loot to watch for was detected for this raid.</p>
              ) : (
                <ul className="space-y-3">
                  {plan.watchForItems.map((entry) => (
                    <li key={entry.itemId} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{items[entry.itemId] ?? entry.itemId}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Needed for {entry.questIds.length} confirmed quest{entry.questIds.length === 1 ? "" : "s"}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          {entry.count > 1 && <Badge variant="outline">×{entry.count}</Badge>}
                          {entry.foundInRaid && <Badge>FIR</Badge>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {result.alternatives.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Next-best maps</CardTitle><CardDescription>Useful when you do not want to run the top-ranked map.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {result.alternatives.map((alternate) => (
              <div key={alternate.mapId} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{maps[alternate.mapId] ?? alternate.mapId}</p>
                  <p className="text-xs text-muted-foreground">{alternate.objectives.length} objectives across {alternate.questIds.length} confirmed quests · {alternate.route.mode} routing</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">{alternate.score}<ArrowRight className="h-4 w-4" /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
