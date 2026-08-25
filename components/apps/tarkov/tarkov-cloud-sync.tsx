"use client"

import * as React from "react"
import { Cloud, CloudOff, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  loadTarkovCloudSnapshot,
  replaceCloudProgress,
  subscribeTarkovAuth,
  type CloudTarkovSnapshot,
} from "@/lib/tarkov/storage/cloud-sync"
import { loadHideoutProgress, saveHideoutProgress } from "@/lib/tarkov/storage/hideout-progress"
import { loadLocalTarkovProfile, saveLocalTarkovProfile, type LocalTarkovProfile } from "@/lib/tarkov/storage/profile"
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

function generationTime(profile: LocalTarkovProfile | undefined): number {
  if (!profile?.generationStartedAt) return 0
  const parsed = Date.parse(profile.generationStartedAt)
  return Number.isFinite(parsed) ? parsed : 0
}

function generationsDiffer(local: LocalTarkovProfile, remote: LocalTarkovProfile | undefined): boolean {
  if (!local.generationId && !remote?.generationId) return false
  return local.generationId !== remote?.generationId
}

async function hydrateMode(mode: TarkovGameMode) {
  const cloud = await loadTarkovCloudSnapshot(mode)
  if (!cloud) return

  const localProfile = loadLocalTarkovProfile(mode)
  const localSnapshot: CloudTarkovSnapshot = {
    profile: localProfile,
    presence: loadQuestPresence(mode),
    progress: loadQuestProgress(mode),
    hideout: loadHideoutProgress(mode),
  }

  let profile: LocalTarkovProfile
  let presence: Record<string, QuestPresence>
  let progress: Record<string, QuestProgress>
  let hideout: Record<string, number>

  if (generationsDiffer(localProfile, cloud.profile)) {
    const localIsNewer = generationTime(localProfile) > generationTime(cloud.profile)

    if (localIsNewer) {
      profile = localProfile
      presence = localSnapshot.presence
      progress = localSnapshot.progress
      hideout = localSnapshot.hideout
      await replaceCloudProgress(mode, localSnapshot)
    } else {
      profile = cloud.profile ?? localProfile
      presence = cloud.presence
      progress = cloud.progress
      hideout = cloud.hideout
    }
  } else {
    profile = cloud.profile ?? localProfile
    presence = mergeTimed<QuestPresence>(localSnapshot.presence, cloud.presence)
    progress = mergeTimed<QuestProgress>(localSnapshot.progress, cloud.progress)
    hideout = mergeHideout(localSnapshot.hideout, cloud.hideout)
  }

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
