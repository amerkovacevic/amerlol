"use client"

import * as React from "react"
import { Eye, PackageSearch } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateConfirmedQuestItemNeeds } from "@/lib/tarkov/domain/item-needs"
import { loadQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress } from "@/lib/tarkov/storage/quest-progress"
import type { TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

interface ItemsNeededProps {
  mode: TarkovGameMode
  quests: TarkovQuest[]
  items: Record<string, string>
}

export function ItemsNeeded({ mode, quests, items }: ItemsNeededProps) {
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

  const needs = React.useMemo(() => {
    void revision
    return calculateConfirmedQuestItemNeeds(
      quests,
      loadQuestProgress(mode),
      loadQuestPresence(mode)
    )
  }, [mode, quests, revision])

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
          {needs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No current quest loot requirements detected.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {needs.map((need) => (
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
    </div>
  )
}
