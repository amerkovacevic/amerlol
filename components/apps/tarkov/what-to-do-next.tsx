"use client"

import * as React from "react"
import { ArrowRight, Backpack, CheckCircle2, Eye, KeyRound, MapPinned, Route, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RaidRouteMap } from "@/components/apps/tarkov/raid-route-map"
import { buildRaidPlans } from "@/lib/tarkov/domain/raid-planner"
import { getMapRoutingData } from "@/lib/tarkov/routing/data"
import type { RouteContext, RouteStrategy } from "@/lib/tarkov/routing/types"
import { loadQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress } from "@/lib/tarkov/storage/quest-progress"
import type { TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

interface WhatToDoNextProps {
  mode: TarkovGameMode
  quests: TarkovQuest[]
  maps: Record<string, string>
  items: Record<string, string>
}

const STRATEGIES: Array<{ id: RouteStrategy; label: string; description: string }> = [
  { id: "max-progression", label: "Max progression", description: "Stack the most confirmed quest progress into one raid." },
  { id: "shortest-line", label: "Shortest line", description: "Prefer maps with stronger coordinate coverage and tighter geographic routing." },
  { id: "safer-line", label: "Safer line", description: "Use route-pack risk weights when verified risk data exists." },
  { id: "kappa-focus", label: "Kappa focus", description: "Heavily prioritize confirmed Kappa-required quest progression." },
  { id: "fast-xp", label: "Fast XP", description: "Favor raids representing the highest quest XP opportunity." },
]

function formatRouteDistance(distance: number | undefined): string {
  if (distance === undefined) return "Unknown"
  if (distance < 10) return distance.toFixed(2)
  return Math.round(distance).toLocaleString()
}

export function WhatToDoNext({ mode, quests, maps, items }: WhatToDoNextProps) {
  const [revision, setRevision] = React.useState(0)
  const [strategy, setStrategy] = React.useState<RouteStrategy>("max-progression")
  const [routeContext, setRouteContext] = React.useState<Record<string, RouteContext>>({})

  React.useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener("storage", refresh)
    window.addEventListener("amerlol:tarkov-progress-changed", refresh)
    return () => {
      window.removeEventListener("storage", refresh)
      window.removeEventListener("amerlol:tarkov-progress-changed", refresh)
    }
  }, [])

  const routingData = React.useMemo(() => Object.fromEntries(
    [...new Set(quests.flatMap((quest) => quest.mapIds))]
      .map((mapId) => [mapId, getMapRoutingData(mapId)] as const)
      .filter((entry) => Boolean(entry[1]))
  ), [quests])

  const playerState = React.useMemo(() => {
    void revision
    return {
      progress: loadQuestProgress(mode),
      presence: loadQuestPresence(mode),
    }
  }, [mode, revision])

  const result = React.useMemo(() => buildRaidPlans(
    quests,
    playerState.progress,
    playerState.presence,
    { routingData, routeContextByMap: routeContext, strategy }
  ), [playerState, quests, routeContext, routingData, strategy])

  const strategyComparisons = React.useMemo(() => STRATEGIES.map((option) => ({
    ...option,
    result: buildRaidPlans(
      quests,
      playerState.progress,
      playerState.presence,
      { routingData, routeContextByMap: routeContext, strategy: option.id }
    ).best,
  })), [playerState, quests, routeContext, routingData])

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

  const mapRouting = routingData[plan.mapId]
  const spawnOptions = mapRouting?.locations.filter((location) => location.kind === "spawn") ?? []
  const extractOptions = mapRouting?.locations.filter((location) => location.kind === "extract") ?? []
  const currentContext = routeContext[plan.mapId] ?? {}

  const setSpawn = (spawnLocationId?: string) => {
    setRouteContext((current) => ({
      ...current,
      [plan.mapId]: { ...current[plan.mapId], spawnLocationId, strategy },
    }))
  }

  const toggleExtract = (extractLocationId: string) => {
    setRouteContext((current) => {
      const existing = current[plan.mapId]?.extractLocationIds ?? []
      const next = existing.includes(extractLocationId)
        ? existing.filter((id) => id !== extractLocationId)
        : [...existing, extractLocationId]
      return {
        ...current,
        [plan.mapId]: { ...current[plan.mapId], extractLocationIds: next, strategy },
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Optimization strategy</CardTitle>
          <CardDescription>Choose what “best raid” means. The map ranking and route behavior recalculate immediately.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {STRATEGIES.map((option) => (
            <Button
              key={option.id}
              variant={strategy === option.id ? "default" : "outline"}
              className="h-auto min-h-16 flex-col items-start whitespace-normal px-3 py-2 text-left"
              onClick={() => setStrategy(option.id)}
            >
              <span>{option.label}</span>
              <span className="mt-1 text-xs font-normal opacity-75">{option.description}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strategy comparison</CardTitle>
          <CardDescription>
            Compare the top raid under each goal before committing. Known route distance includes only geographic legs the tracker can actually calculate; an unknown spawn is never estimated.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {strategyComparisons.map((comparison) => {
            const candidate = comparison.result
            if (!candidate) return null
            return (
              <button
                key={comparison.id}
                type="button"
                className={`rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${strategy === comparison.id ? "bg-muted" : ""}`}
                onClick={() => setStrategy(comparison.id)}
              >
                <p className="text-sm font-semibold">{comparison.label}</p>
                <p className="mt-2 font-medium">{maps[candidate.mapId] ?? candidate.mapId}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>{candidate.objectives.length} objectives · {candidate.questIds.length} quests</p>
                  <p>{candidate.potentialExperience.toLocaleString()} represented XP</p>
                  <p>Known route: {formatRouteDistance(candidate.route.totalDistance ?? candidate.route.objectiveDistance)}</p>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Best raid now</Badge>
                <Badge variant="outline">Score {plan.score}</Badge>
                <Badge variant="outline">{STRATEGIES.find((entry) => entry.id === strategy)?.label}</Badge>
                <Badge variant="outline">{routeLabel}</Badge>
                <Badge variant="outline">{coordinateLabel}</Badge>
              </div>
              <CardTitle className="mt-3 text-2xl">Run {mapName}</CardTitle>
              <CardDescription className="mt-2">
                Built only from quests confirmed on your character. Predicted quests never affect the recommendation.
              </CardDescription>
            </div>
            <MapPinned className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          {plan.reasons.map((reason) => <div key={reason} className="rounded-lg border p-3 text-sm">{reason}</div>)}
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">Known route distance</p>
            <p className="mt-1 text-muted-foreground">{formatRouteDistance(plan.route.totalDistance ?? plan.route.objectiveDistance)}</p>
          </div>
        </CardContent>
      </Card>

      {(spawnOptions.length > 0 || extractOptions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Raid start / finish</CardTitle>
            <CardDescription>
              Select the spawn you received and the extracts currently available to you. The planner will route from that spawn and finish at the best selected extract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {spawnOptions.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Spawn</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={!currentContext.spawnLocationId ? "default" : "outline"} onClick={() => setSpawn(undefined)}>Unknown</Button>
                  {spawnOptions.map((location) => (
                    <Button key={location.id} size="sm" variant={currentContext.spawnLocationId === location.id ? "default" : "outline"} onClick={() => setSpawn(location.id)}>
                      {location.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {extractOptions.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Available extracts</p>
                <div className="flex flex-wrap gap-2">
                  {extractOptions.map((location) => {
                    const selected = (currentContext.extractLocationIds ?? []).includes(location.id)
                    return (
                      <Button key={location.id} size="sm" variant={selected ? "default" : "outline"} onClick={() => toggleExtract(location.id)}>
                        {location.name}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <RaidRouteMap plan={plan} mapName={mapName} routingData={mapRouting} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Route className="h-5 w-5" />Optimal objective line</CardTitle>
            <CardDescription>
              {plan.route.mode === "geographic"
                ? plan.route.usedSpawn
                  ? `Route starts from your selected spawn and geographically orders all ${plan.route.geographicObjectiveCount} located objectives.`
                  : `All ${plan.route.geographicObjectiveCount} routed objectives have coordinate data. Select a verified spawn when available to anchor the start of the line.`
                : plan.route.mode === "partial"
                  ? `${plan.route.geographicObjectiveCount} objectives are geographically ordered; ${plan.route.fallbackObjectiveCount} still use priority fallback because coordinate data is missing.`
                  : "Coordinate data is not available for these objectives, so the line uses deterministic priority ordering."}
              {plan.route.selectedExtractName ? ` Finish at ${plan.route.selectedExtractName}.` : ""}
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
            {plan.route.selectedExtractName && (
              <div className="mt-3 flex gap-3 rounded-lg border p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold">E</div>
                <div>
                  <p className="font-medium">Extract: {plan.route.selectedExtractName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Chosen as the best finish among the extracts you marked available.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Backpack className="h-5 w-5" />What to bring</CardTitle></CardHeader>
            <CardContent>
              {plan.bringItemIds.length === 0 ? <p className="text-sm text-muted-foreground">No mandatory carried quest items detected for this plan.</p> : (
                <ul className="space-y-2">{plan.bringItemIds.map((id) => <li key={id} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4" />{items[id] ?? id}</li>)}</ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />Keys / access</CardTitle></CardHeader>
            <CardContent>
              {plan.requiredKeyIds.length === 0 ? <p className="text-sm text-muted-foreground">No required key metadata detected for this route.</p> : (
                <ul className="space-y-2">{plan.requiredKeyIds.map((id) => <li key={id} className="flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4" />{items[id] ?? id}</li>)}</ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Watch for in raid</CardTitle>
              <CardDescription>Quest loot from confirmed incomplete objectives. FIR requirements are prioritized.</CardDescription>
            </CardHeader>
            <CardContent>
              {plan.watchForItems.length === 0 ? <p className="text-sm text-muted-foreground">No quest loot to watch for was detected for this raid.</p> : (
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
                  <p className="text-xs text-muted-foreground">
                    {alternate.objectives.length} objectives across {alternate.questIds.length} confirmed quests · {alternate.route.mode} routing · known route {formatRouteDistance(alternate.route.totalDistance ?? alternate.route.objectiveDistance)}
                  </p>
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
