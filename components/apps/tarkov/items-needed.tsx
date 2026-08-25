"use client"

import * as React from "react"
import { Clock3, Eye, Hammer, Minus, PackageSearch, Plus, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HideoutItemRequirement } from "@/lib/tarkov/adapters/hideout"
import { calculateRemainingHideoutNeeds, summarizeHideoutStations } from "@/lib/tarkov/domain/hideout-needs"
import { calculateConfirmedQuestItemNeeds, calculateFutureQuestItemNeeds } from "@/lib/tarkov/domain/item-needs"
import { loadHideoutProgress, resetHideoutProgress, saveHideoutStationLevel } from "@/lib/tarkov/storage/hideout-progress"
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
    const hideoutProgress = loadHideoutProgress(mode)

    return {
      current: calculateConfirmedQuestItemNeeds(quests, progress, presence),
      future: calculateFutureQuestItemNeeds(quests, progress, presence, profile.level, profile.faction),
      hideoutStations: summarizeHideoutStations(hideoutRequirements, hideoutProgress),
      hideoutRemaining: calculateRemainingHideoutNeeds(hideoutRequirements, hideoutProgress),
      profile,
    }
  }, [hideoutRequirements, mode, quests, revision])

  const soon = data.future.filter((need) => need.bucket === "soon")
  const later = data.future.filter((need) => need.bucket === "later")
  const completedStations = data.hideoutStations.filter((station) => station.currentLevel >= station.maxLevel).length

  const changeStationLevel = (stationId: string, current: number, max: number, delta: number) => {
    saveHideoutStationLevel(mode, stationId, Math.max(0, Math.min(max, current + delta)))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5" />Items needed now</CardTitle>
          <CardDescription>
            Built only from quests confirmed on your current character and incomplete objectives. Predicted quests never add items here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.current.length === 0 ? (
            <EmptyState text="No current quest loot requirements detected." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.current.map((need) => (
                <div key={need.itemId} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{items[need.itemId] ?? need.itemId}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Needed across {need.questIds.length} confirmed quest{need.questIds.length === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Badge variant="outline">×{need.count}</Badge>
                      {need.foundInRaid && <Badge>FIR</Badge>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" />Watch for this during raids until its objectives are completed.</div>
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
            Predictive only. Future faction-compatible quests never enter My Quests, current needs, or raid planning until you confirm the quest in-game.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FutureBucket title="Soon" description={`Quest minimum level is at or within 5 levels of your current level ${data.profile.level}.`} needs={soon} items={items} />
          <FutureBucket title="Later" description="Long-term stash knowledge kept separate from immediate decisions." needs={later.slice(0, 24)} items={items} total={later.length} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Hammer className="h-5 w-5" />Hideout progression</CardTitle>
              <CardDescription className="mt-2">
                Set each station to the level you actually have in-game. Remaining materials are calculated only from upgrades above those recorded levels.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{completedStations}/{data.hideoutStations.length} maxed</Badge>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => resetHideoutProgress(mode)}><RotateCcw className="h-3.5 w-3.5" />Reset</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.hideoutStations.length === 0 ? (
            <EmptyState text="No hideout stations were detected in the current dataset." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.hideoutStations.map((station) => {
                const maxed = station.currentLevel >= station.maxLevel
                return (
                  <div key={station.stationId} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{station.stationName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {maxed ? "Max level reached" : `Next upgrade: level ${station.nextLevel ?? station.currentLevel + 1}`}
                        </p>
                      </div>
                      {maxed && <Badge>Max</Badge>}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <Button size="icon" variant="outline" aria-label={`Decrease ${station.stationName} level`} disabled={station.currentLevel <= 0} onClick={() => changeStationLevel(station.stationId, station.currentLevel, station.maxLevel, -1)}><Minus className="h-4 w-4" /></Button>
                      <div className="text-center">
                        <p className="text-xl font-semibold">{station.currentLevel} / {station.maxLevel}</p>
                        <p className="text-xs text-muted-foreground">{station.remainingUpgradeLevels} upgrade{station.remainingUpgradeLevels === 1 ? "" : "s"} left</p>
                      </div>
                      <Button size="icon" variant="outline" aria-label={`Increase ${station.stationName} level`} disabled={maxed} onClick={() => changeStationLevel(station.stationId, station.currentLevel, station.maxLevel, 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remaining hideout materials</CardTitle>
          <CardDescription>
            These are actual remaining requirements based on the station levels above, not full-wipe reference totals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.hideoutRemaining.length === 0 ? (
            <EmptyState text={data.hideoutStations.length > 0 ? "No remaining hideout item requirements detected." : "Set up hideout data to calculate remaining materials."} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.hideoutRemaining.slice(0, 48).map((need) => (
                <div key={need.itemId} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{items[need.itemId] ?? need.itemId}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{need.stations.length} station{need.stations.length === 1 ? "" : "s"} · next used at station level {need.nextNeededLevel}</p>
                    </div>
                    <Badge variant="outline">×{need.count}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{need.stations.join(", ")}</p>
                </div>
              ))}
            </div>
          )}
          {data.hideoutRemaining.length > 48 && <p className="mt-3 text-xs text-muted-foreground">Showing the first 48 remaining material requirements.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function FutureBucket({ title, description, needs, items, total }: { title: string; description: string; needs: ReturnType<typeof calculateFutureQuestItemNeeds>; items: Record<string, string>; total?: number }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div>
        <Badge variant="outline">{total ?? needs.length}</Badge>
      </div>
      {needs.length === 0 ? <EmptyState text={`No ${title.toLowerCase()} future item requirements detected.`} compact /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {needs.map((need) => (
            <div key={need.itemId} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{items[need.itemId] ?? need.itemId}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Earliest quest level {need.minimumLevel} · {need.questIds.length} future quest{need.questIds.length === 1 ? "" : "s"}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5"><Badge variant="outline">×{need.count}</Badge>{need.foundInRaid && <Badge variant="secondary">FIR later</Badge>}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {total && total > needs.length ? <p className="mt-3 text-xs text-muted-foreground">Showing the first {needs.length} of {total} requirements.</p> : null}
    </div>
  )
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`rounded-lg border border-dashed text-center text-sm text-muted-foreground ${compact ? "p-5" : "p-8"}`}>{text}</div>
}
