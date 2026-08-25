"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buildRaidPlans } from "@/lib/tarkov/domain/raid-planner"
import { getMapRoutingData } from "@/lib/tarkov/routing/data"
import { loadQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress } from "@/lib/tarkov/storage/quest-progress"
import type { TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

interface MapPlannerProps {
  mode: TarkovGameMode
  quests: TarkovQuest[]
  maps: Record<string, string>
}

function formatDistance(value: number | undefined): string {
  if (value === undefined) return "Unknown"
  return value < 10 ? value.toFixed(2) : Math.round(value).toLocaleString()
}

export function MapPlanner({ mode, quests, maps }: MapPlannerProps) {
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

  const plans = React.useMemo(() => {
    void revision
    const mapIds = [...new Set(quests.flatMap((quest) => quest.mapIds))]
    const routingData = Object.fromEntries(
      mapIds.map((mapId) => [mapId, getMapRoutingData(mapId)] as const).filter((entry) => Boolean(entry[1]))
    )
    const result = buildRaidPlans(
      quests,
      loadQuestProgress(mode),
      loadQuestPresence(mode),
      { routingData, strategy: "max-progression" }
    )
    return [result.best, ...result.alternatives].filter(Boolean)
  }, [mode, quests, revision])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Map planner</CardTitle>
          <CardDescription>
            Ranked from confirmed incomplete quests only. This is the same scoring engine used by What to do next, so map recommendations cannot drift between views.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Confirm active quests to generate map recommendations.</div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan, index) => {
                if (!plan) return null
                return (
                  <div key={plan.mapId} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold">{maps[plan.mapId] ?? plan.mapId}</p>
                          {index === 0 && <Badge>Best now</Badge>}
                          <Badge variant="outline">Score {plan.score}</Badge>
                          <Badge variant="outline">{plan.route.mode}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{plan.objectives.length} objectives across {plan.questIds.length} confirmed quests</p>
                      </div>
                      <div className="text-left text-sm md:text-right">
                        <p>{plan.potentialExperience.toLocaleString()} XP represented</p>
                        <p className="text-muted-foreground">Known route {formatDistance(plan.route.totalDistance ?? plan.route.objectiveDistance)}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-md border p-3 text-sm"><span className="text-muted-foreground">Bring items</span><p className="mt-1 font-medium">{plan.bringItemIds.length}</p></div>
                      <div className="rounded-md border p-3 text-sm"><span className="text-muted-foreground">Keys/access</span><p className="mt-1 font-medium">{plan.requiredKeyIds.length}</p></div>
                      <div className="rounded-md border p-3 text-sm"><span className="text-muted-foreground">Watch-for items</span><p className="mt-1 font-medium">{plan.watchForItems.length}</p></div>
                      <div className="rounded-md border p-3 text-sm"><span className="text-muted-foreground">Located objectives</span><p className="mt-1 font-medium">{plan.route.geographicObjectiveCount}</p></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
