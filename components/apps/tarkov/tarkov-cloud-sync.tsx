"use client"

import * as React from "react"
import { Cloud, CloudOff, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { loadTarkovCloudSnapshot, subscribeTarkovAuth } from "@/lib/tarkov/storage/cloud-sync"
import { loadHideoutProgress, saveHideoutProgress } from "@/lib/tarkov/storage/hideout-progress"
import { loadLocalTarkovProfile, saveLocalTarkovProfile } from "@/lib/tarkov/storage/profile"
import { loadQuestPresence, saveQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress, saveQuestProgress } from "@/lib/tarkov/storage/quest-progress"
import type { QuestProgress, QuestPresence, TarkovGameMode } from "@/lib/tarkov/types"

type SyncState = "guest" | "syncing" | "synced" | "error"

function timestamp(value: { updatedAt?: string } | undefined): number {
  if (!value?.updatedAt) return 0
  const parsed = Date.parse(value.updatedAt)
  return Number.isFinite(parsed) ? parsed : 0
}

function mergeTimed<T extends { updatedAt?: string }>(local: Record<string, T>, remote: Record<string, T>): Record<string, T> {
  const merged: Record<string, T> = { ...remote }
  for (const [id, localEntry] of Object.entries(local)) {
    const remoteEntry = remote[id]
    merged[id] = !remoteEntry || timestamp(localEntry) >= timestamp(remoteEntry) ? localEntry : remoteEntry
  }
  return merged
}

function mergeHideout(local: Record<string, number>, remote: Record<string, number>): Record<string, number> {
  const merged = { ...remote }
  for (const [stationId, level] of Object.entries(local)) {
    merged[stationId] = Math.max(level, remote[stationId] ?? 0)
  }
  return merged
}

function isDefaultProfile(profile: ReturnType<typeof loadLocalTarkovProfile>) {
  return profile.level === 1 && profile.faction === "USEC"
}

async function hydrateMode(mode: TarkovGameMode) {
  const cloud = await loadTarkovCloudSnapshot(mode)
  if (!cloud) return

  const localProfile = loadLocalTarkovProfile(mode)
  const profile = cloud.profile && isDefaultProfile(localProfile) ? cloud.profile : localProfile
  const presence = mergeTimed<QuestPresence>(loadQuestPresence(mode), cloud.presence)
  const progress = mergeTimed<QuestProgress>(loadQuestProgress(mode), cloud.progress)
  const hideout = mergeHideout(loadHideoutProgress(mode), cloud.hideout)

  saveLocalTarkovProfile(mode, profile)
  saveQuestPresence(mode, presence)
  saveQuestProgress(mode, progress)
  saveHideoutProgress(mode, hideout)
}

export function TarkovCloudSync({ mode }: { mode: TarkovGameMode }) {
  const [state, setState] = React.useState<SyncState>("guest")

  React.useEffect(() => subscribeTarkovAuth((signedIn) => {
    if (!signedIn) {
      setState("guest")
      return
    }

    setState("syncing")
    void hydrateMode(mode)
      .then(() => setState("synced"))
      .catch(() => setState("error"))
  }), [mode])

  if (state === "guest") return <Badge variant="outline" className="gap-1.5"><CloudOff className="h-3 w-3" />Local only</Badge>
  if (state === "syncing") return <Badge variant="outline" className="gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" />Syncing</Badge>
  if (state === "error") return <Badge variant="destructive" className="gap-1.5"><CloudOff className="h-3 w-3" />Sync error</Badge>
  return <Badge variant="outline" className="gap-1.5"><Cloud className="h-3 w-3" />Cloud synced</Badge>
}
