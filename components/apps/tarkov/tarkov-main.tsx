"use client"

import * as React from "react"
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Database,
  KeyRound,
  Map,
  PackageSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ItemsNeeded } from "@/components/apps/tarkov/items-needed"
import { ProgressDashboard } from "@/components/apps/tarkov/progress-dashboard"
import { QuestReconciliation } from "@/components/apps/tarkov/quest-reconciliation"
import { TarkovCloudSync } from "@/components/apps/tarkov/tarkov-cloud-sync"
import { WhatToDoNext } from "@/components/apps/tarkov/what-to-do-next"
import { cn } from "@/lib/utils"
import { fetchTarkovDataset } from "@/lib/tarkov/api/json-tarkov-dev"
import { normalizeHideoutItemRequirements, type HideoutItemRequirement } from "@/lib/tarkov/adapters/hideout"
import { buildItemReferenceMap } from "@/lib/tarkov/adapters/items"
import { buildTaskReferenceMaps, normalizeTasksPayload } from "@/lib/tarkov/adapters/tasks"
import type { TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

type TrackerView = "overview" | "next" | "quests" | "maps" | "items" | "traders" | "progress"

interface ReadyDataset {
  state: "ready"
  quests: TarkovQuest[]
  traders: Record<string, string>
  maps: Record<string, string>
  items: Record<string, string>
  hideoutRequirements: HideoutItemRequirement[]
}

type DatasetStatus =
  | { state: "loading" }
  | ReadyDataset
  | { state: "error"; message: string }

const navigation: Array<{
  id: TrackerView
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "next", label: "What to do next", icon: Sparkles },
  { id: "quests", label: "Quests", icon: ClipboardList },
  { id: "maps", label: "Map Planner", icon: Map },
  { id: "items", label: "Items Needed", icon: PackageSearch },
  { id: "traders", label: "Traders", icon: Users },
  { id: "progress", label: "Progress", icon: Target },
]

export function TarkovMain() {
  const [view, setView] = React.useState<TrackerView>("overview")
  const [mode, setMode] = React.useState<TarkovGameMode>("pvp")
  const [datasetStatus, setDatasetStatus] = React.useState<DatasetStatus>({ state: "loading" })

  React.useEffect(() => {
    const controller = new AbortController()
    setDatasetStatus({ state: "loading" })

    Promise.all([
      fetchTarkovDataset({ mode, dataset: "tasks", signal: controller.signal }),
      fetchTarkovDataset({ mode, dataset: "traders", signal: controller.signal }),
      fetchTarkovDataset({ mode, dataset: "maps", signal: controller.signal }),
      fetchTarkovDataset({ mode, dataset: "items", signal: controller.signal }),
      fetchTarkovDataset({ mode, dataset: "hideout", signal: controller.signal }),
    ])
      .then(([tasksPayload, tradersPayload, mapsPayload, itemsPayload, hideoutPayload]) => {
        const quests = normalizeTasksPayload(tasksPayload.data)
        const references = buildTaskReferenceMaps(tasksPayload.data, tradersPayload.data, mapsPayload.data)
        setDatasetStatus({
          state: "ready",
          quests,
          traders: references.traders,
          maps: references.maps,
          items: buildItemReferenceMap(itemsPayload.data),
          hideoutRequirements: normalizeHideoutItemRequirements(hideoutPayload.data),
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setDatasetStatus({ state: "error", message: error instanceof Error ? error.message : "Unable to load Tarkov data" })
      })

    return () => controller.abort()
  }, [mode])

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-lg border bg-card p-2">
          <nav className="space-y-1" aria-label="Tarkov tracker navigation">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Button key={item.id} variant={view === item.id ? "secondary" : "ghost"} className="w-full justify-start gap-2" onClick={() => setView(item.id)}>
                  <Icon className="h-4 w-4" />{item.label}
                </Button>
              )
            })}
          </nav>
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Game mode</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button size="sm" variant={mode === "pvp" ? "default" : "outline"} onClick={() => setMode("pvp")}>PvP</Button>
            <Button size="sm" variant={mode === "pve" ? "default" : "outline"} onClick={() => setMode("pve")}>PvE</Button>
          </CardContent>
        </Card>
      </aside>

      <section className="min-w-0 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-space-grotesk text-2xl font-bold">{navigation.find((item) => item.id === view)?.label}</h2>
              <Badge variant="secondary">Beta</Badge>
              <TarkovCloudSync mode={mode} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{mode === "pvp" ? "PvP" : "PvE"} progression profile</p>
          </div>
          <Button variant="outline" className="gap-2" disabled><Search className="h-4 w-4" />Global search</Button>
        </div>

        {datasetStatus.state === "error" ? (
          <DatasetError message={datasetStatus.message} />
        ) : view === "overview" ? (
          <Overview datasetStatus={datasetStatus} onOpenQuests={() => setView("quests")} onOpenNext={() => setView("next")} />
        ) : view === "next" ? (
          datasetStatus.state === "ready" ? <WhatToDoNext mode={mode} quests={datasetStatus.quests} maps={datasetStatus.maps} items={datasetStatus.items} /> : <LoadingCard label="Building raid optimization data…" />
        ) : view === "quests" ? (
          datasetStatus.state === "ready" ? <QuestReconciliation mode={mode} quests={datasetStatus.quests} traders={datasetStatus.traders} maps={datasetStatus.maps} /> : <LoadingCard label="Loading and normalizing Tarkov quests…" />
        ) : view === "items" ? (
          datasetStatus.state === "ready" ? <ItemsNeeded mode={mode} quests={datasetStatus.quests} items={datasetStatus.items} hideoutRequirements={datasetStatus.hideoutRequirements} /> : <LoadingCard label="Calculating quest and hideout item needs…" />
        ) : view === "progress" ? (
          datasetStatus.state === "ready" ? <ProgressDashboard mode={mode} quests={datasetStatus.quests} traders={datasetStatus.traders} /> : <LoadingCard label="Calculating Kappa and Lightkeeper progression…" />
        ) : (
          <FeatureFoundation view={view} />
        )}
      </section>
    </div>
  )
}

function Overview({ datasetStatus, onOpenQuests, onOpenNext }: { datasetStatus: DatasetStatus; onOpenQuests: () => void; onOpenNext: () => void }) {
  const questCount = datasetStatus.state === "ready" ? datasetStatus.quests.length : 0
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard title="Game data" icon={Database} value={datasetStatus.state === "loading" ? "Loading" : "Connected"} detail={datasetStatus.state === "ready" ? `${questCount.toLocaleString()} quests normalized` : "Connecting to json.tarkov.dev"} healthy={datasetStatus.state === "ready"} />
        <StatusCard title="Quest engine" icon={ShieldCheck} value="Strict" detail="Eligibility never equals confirmed quest presence" healthy />
        <StatusCard title="Raid optimizer" icon={Sparkles} value="Live" detail="Ranks confirmed objectives and builds a raid line" healthy />
        <StatusCard title="Item intelligence" icon={PackageSearch} value="Live" detail="Current, future, FIR, and hideout needs are separated" healthy />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Min-max your next raid</CardTitle>
          <CardDescription>The planner uses only quests you confirmed on your character, then ranks maps by how much real progression you can stack in one raid. It separates what to carry from what to find so the plan is useful before and during the raid.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FoundationRow icon={CheckCircle2} title="Confirmed quests only" description="Predicted quests never pollute the recommendation engine." />
            <FoundationRow icon={CheckCircle2} title="Best map scoring" description="Ranks maps using incomplete objectives, quest overlap, represented XP, FIR opportunities, and progression value." />
            <FoundationRow icon={CheckCircle2} title="What to bring" description="Quest markers, required equipment, and key metadata are extracted into the raid checklist." />
            <FoundationRow icon={CheckCircle2} title="Watch for" description="FIR and current quest loot requirements are surfaced separately so you know what not to miss or sell." />
          </div>
          <div className="flex flex-wrap gap-2"><Button onClick={onOpenNext}>What should I do next?</Button><Button variant="outline" onClick={onOpenQuests}>Update my quests</Button></div>
        </CardContent>
      </Card>
    </div>
  )
}

function DatasetError({ message }: { message: string }) {
  return <Card><CardHeader><CardTitle>Unable to load Tarkov quest data</CardTitle><CardDescription>{message}</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Existing confirmations are not deleted when the upstream dataset is unavailable. Reload the page to retry.</p></CardContent></Card>
}

function LoadingCard({ label }: { label: string }) {
  return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{label}</CardContent></Card>
}

function StatusCard({ title, value, detail, icon: Icon, healthy = false }: { title: string; value: string; detail: string; icon: React.ComponentType<{ className?: string }>; healthy?: boolean }) {
  return <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardDescription>{title}</CardDescription><Icon className="h-4 w-4 text-muted-foreground" /></div><CardTitle className="text-xl">{value}</CardTitle></CardHeader><CardContent><p className={cn("text-xs text-muted-foreground", healthy && "text-foreground")}>{detail}</p></CardContent></Card>
}

function FoundationRow({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return <div className="flex gap-3 rounded-lg border p-4"><Icon className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>
}

function FeatureFoundation({ view }: { view: Exclude<TrackerView, "overview" | "next" | "quests" | "items" | "progress"> }) {
  const details: Record<Exclude<TrackerView, "overview" | "next" | "quests" | "items" | "progress">, { icon: React.ComponentType<{ className?: string }>; title: string; description: string }> = {
    maps: { icon: Map, title: "Map planner", description: "This will expand the raid optimizer with interactive map locations and coordinate-backed pathing." },
    traders: { icon: Users, title: "Trader progression", description: "This view will group confirmed, completed, and predicted quests by trader." },
  }
  const detail = details[view]
  const Icon = detail.icon
  return <Card className="border-dashed"><CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center"><div className="mb-4 rounded-full border bg-muted p-3"><Icon className="h-6 w-6" /></div><h3 className="text-lg font-semibold">{detail.title}</h3><p className="mt-2 max-w-md text-sm text-muted-foreground">{detail.description}</p></CardContent></Card>
}
