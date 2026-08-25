"use client"

import * as React from "react"
import { Clock3, Eye, Hammer, PackageSearch } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HideoutItemRequirement } from "@/lib/tarkov/adapters/hideout"
import { calculateConfirmedQuestItemNeeds, calculateFutureQuestItemNeeds } from "@/lib/tarkov/domain/item-needs"
import { loadLocalTarkovProfile } from "@/lib/tarkov/storage/profile"
import { loadQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress } from "@/lib/tarkov/storage/quest-progress"
import type { TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

interface ItemsNeededProps {
  mode: TarkovGameMode
  quests: TarkovQuest[]
  items: Record<string, string>
  hideoutRequirements: HideoutItemRequirement[]
}

interface AggregatedHideoutNeed {
  itemId: string
  count: number
  stations: string[]
  earliestLevel: number
}

function aggregateHideoutNeeds(requirements: HideoutItemRequirement[]): AggregatedHideoutNeed[] {
  const byItem = new Map<string, AggregatedHideoutNeed>()

  for (const requirement of requirements) {
    const current = byItem.get(requirement.itemId)
    if (current) {
      current.count += requirement.count
      current.earliestLevel = Math.min(current.earliestLevel, requirement.level)
      if (!current.stations.includes(requirement.stationName)) current.stations.push(requirement.stationName)
    } else {
      byItem.set(requirement.itemId, {
        itemId: requirement.itemId,
        count: requirement.count,
        stations: [requirement.stationName],
        earliestLevel: requirement.level,
      })
    }
  }

  return [...byItem.values()].sort((a, b) => a.earliestLevel - b.earliestLevel || b.count - a.count || a.itemId.localeCompare(b.itemId))
}

export function ItemsNeeded({ mode, quests, items, hideoutRequirements }: ItemsNeededProps) {
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

  const data = React.useMemo(() => {
    void revision
    const progress = loadQuestProgress(mode)
    const presence = loadQuestPresence(mode)
    const profile = loadLocalTarkovProfile(mode)
    return {
      current: calculateConfirmedQuestItemNeeds(quests, progress, presence),
      future: calculateFutureQuestItemNeeds(quests, progress, presence, profile.level, profile.faction),
      hideout: aggregateHideoutNeeds(hideoutRequirements),
      profile,
    }
  }, [hideoutRequirements, mode, quests, revision])

  const soon = data.future.filter((need) => need.bucket === "soon")
  const later = data.future.filter((need) => need.bucket === "later")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5" />Items needed now</CardTitle>
          <CardDescription>
            This list is built only from quests confirmed on your current character and incomplete objectives. Predicted quests never add items here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.current.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No current quest loot requirements detected.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.current.map((need) => (
                <div key={need.itemId} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{items[need.itemId] ?? need.itemId}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Needed across {need.questIds.length} confirmed quest{need.questIds.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Badge variant="outline">×{need.count}</Badge>
                      {need.foundInRaid && <Badge>FIR</Badge>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    Watch for this during raids until the related objectives are completed.
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" />Save for later</CardTitle>
          <CardDescription>
            Predictive only. These items come from future faction-compatible quests and never enter `My Quests`, `Items needed now`, or raid planning until the quest is actually confirmed on your character.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">Soon</p>
                <p className="text-xs text-muted-foreground">Quest minimum level is at or within 5 levels of your current level {data.profile.level}.</p>
              </div>
              <Badge variant="outline">{soon.length}</Badge>
            </div>
            {soon.length === 0 ? (
              <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No near-term future item requirements detected.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {soon.map((need) => (
                  <div key={need.itemId} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{items[need.itemId] ?? need.itemId}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Earliest quest level {need.minimumLevel} · {need.questIds.length} future quest{need.questIds.length === 1 ? "" : "s"}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <Badge variant="outline">×{need.count}</Badge>
                        {need.foundInRaid && <Badge variant="secondary">FIR later</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">Later</p>
                <p className="text-xs text-muted-foreground">Useful long-term stash knowledge, kept separate from immediate decisions.</p>
              </div>
              <Badge variant="outline">{later.length}</Badge>
            </div>
            {later.length === 0 ? (
              <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No later item requirements detected.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {later.slice(0, 24).map((need) => (
                  <div key={need.itemId} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{items[need.itemId] ?? need.itemId}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Earliest quest level {need.minimumLevel} · {need.questIds.length} future quest{need.questIds.length === 1 ? "" : "s"}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <Badge variant="outline">×{need.count}</Badge>
                        {need.foundInRaid && <Badge variant="secondary">FIR later</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {later.length > 24 && <p className="mt-3 text-xs text-muted-foreground">Showing the first 24 later requirements, ordered by earliest quest level.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Hammer className="h-5 w-5" />Hideout materials</CardTitle>
          <CardDescription>
            Reference totals across hideout upgrades in the current game-mode dataset. These are intentionally not labeled “needed now” until hideout station progress tracking is implemented.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.hideout.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No hideout item requirements were detected in the current dataset.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.hideout.slice(0, 36).map((need) => (
                <div key={need.itemId} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{items[need.itemId] ?? need.itemId}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Used by {need.stations.length} station{need.stations.length === 1 ? "" : "s"} · earliest station level {need.earliestLevel}
                      </p>
                    </div>
                    <Badge variant="outline">×{need.count}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{need.stations.join(", ")}</p>
                </div>
              ))}
            </div>
          )}
          {data.hideout.length > 36 && <p className="mt-3 text-xs text-muted-foreground">Showing the first 36 hideout material totals.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
