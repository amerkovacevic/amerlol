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
  Target,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QuestReconciliation } from "@/components/apps/tarkov/quest-reconciliation"
import { cn } from "@/lib/utils"
import { fetchTarkovDataset } from "@/lib/tarkov/api/json-tarkov-dev"
import { buildTaskReferenceMaps, normalizeTasksPayload } from "@/lib/tarkov/adapters/tasks"
import type { TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

type TrackerView = "overview" | "quests" | "maps" | "items" | "traders" | "progress"

interface ReadyDataset {
  state: "ready"
  quests: TarkovQuest[]
  traders: Record<string, string>
  maps: Record<string, string>
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

    fetchTarkovDataset({ mode, dataset: "tasks", signal: controller.signal })
      .then((payload) => {
        const quests = normalizeTasksPayload(payload.data)
        const references = buildTaskReferenceMaps(payload.data)
        setDatasetStatus({
          state: "ready",
          quests,
          traders: references.traders,
          maps: references.maps,
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setDatasetStatus({
          state: "error",
          message: error instanceof Error ? error.message : "Unable to load Tarkov data",
        })
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
                <Button
                  key={item.id}
                  variant={view === item.id ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setView(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              )
            })}
          </nav>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Game mode</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button size="sm" variant={mode === "pvp" ? "default" : "outline"} onClick={() => setMode("pvp")}>
              PvP
            </Button>
            <Button size="sm" variant={mode === "pve" ? "default" : "outline"} onClick={() => setMode("pve")}>
              PvE
            </Button>
          </CardContent>
        </Card>
      </aside>

      <section className="min-w-0 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-space-grotesk text-2xl font-bold">{navigation.find((item) => item.id === view)?.label}</h2>
              <Badge variant="secondary">Beta</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "pvp" ? "PvP" : "PvE"} progression profile
            </p>
          </div>
          <Button variant="outline" className="gap-2" disabled>
            <Search className="h-4 w-4" />
            Global search
          </Button>
        </div>

        {datasetStatus.state === "error" ? (
          <DatasetError message={datasetStatus.message} />
        ) : view === "overview" ? (
          <Overview datasetStatus={datasetStatus} onOpenQuests={() => setView("quests")} />
        ) : view === "quests" ? (
          datasetStatus.state === "ready" ? (
            <QuestReconciliation
              mode={mode}
              quests={datasetStatus.quests}
              traders={datasetStatus.traders}
              maps={datasetStatus.maps}
            />
          ) : (
            <LoadingCard label="Loading and normalizing Tarkov quests…" />
          )
        ) : (
          <FeatureFoundation view={view} />
        )}
      </section>
    </div>
  )
}

function Overview({
  datasetStatus,
  onOpenQuests,
}: {
  datasetStatus: DatasetStatus
  onOpenQuests: () => void
}) {
  const questCount = datasetStatus.state === "ready" ? datasetStatus.quests.length : 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          title="Game data"
          icon={Database}
          value={datasetStatus.state === "loading" ? "Loading" : "Connected"}
          detail={datasetStatus.state === "ready" ? `${questCount.toLocaleString()} quests normalized` : "Connecting to json.tarkov.dev"}
          healthy={datasetStatus.state === "ready"}
        />
        <StatusCard title="Quest engine" icon={ShieldCheck} value="Strict" detail="Eligibility never equals confirmed quest presence" healthy />
        <StatusCard title="Item intelligence" icon={PackageSearch} value="Queued" detail="FIR and future quest requirements" />
        <StatusCard title="Raid planner" icon={Map} value="Queued" detail="Group objectives by map and raid" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usable quest reconciliation is live</CardTitle>
          <CardDescription>
            The live Tarkov task dataset is now normalized into Amer.lol quest records. Your real quest list is built only from confirmations you make against what Tarkov actually shows on your character.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FoundationRow icon={CheckCircle2} title="Live quest normalization" description="Raw json.tarkov.dev tasks are converted into canonical Amer.lol quest records." />
            <FoundationRow icon={CheckCircle2} title="Negative confirmation" description="Not on my character persists and suppresses repeat false-positive suggestions." />
            <FoundationRow icon={CheckCircle2} title="Mode-isolated presence" description="PvP and PvE confirmations are stored separately." />
            <FoundationRow icon={CheckCircle2} title="Searchable reconciliation" description="Find quests by quest name, trader, or map and reconcile them against Tarkov." />
          </div>
          <Button onClick={onOpenQuests}>Open quest reconciliation</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function DatasetError({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unable to load Tarkov quest data</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Existing confirmations are not deleted when the upstream dataset is unavailable. Reload the page to retry.
        </p>
      </CardContent>
    </Card>
  )
}

function LoadingCard({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  )
}

function StatusCard({
  title,
  value,
  detail,
  icon: Icon,
  healthy = false,
}: {
  title: string
  value: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
  healthy?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-xs text-muted-foreground", healthy && "text-foreground")}>{detail}</p>
      </CardContent>
    </Card>
  )
}

function FoundationRow({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3 rounded-lg border p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function FeatureFoundation({ view }: { view: Exclude<TrackerView, "overview" | "quests"> }) {
  const details: Record<Exclude<TrackerView, "overview" | "quests">, { icon: React.ComponentType<{ className?: string }>; title: string; description: string }> = {
    maps: { icon: Map, title: "Map planner", description: "This view will rank maps using confirmed active quest objectives first, with predicted quests kept separate." },
    items: { icon: PackageSearch, title: "Items needed", description: "This view will aggregate FIR, future quest, key, and hideout requirements." },
    traders: { icon: Users, title: "Trader progression", description: "This view will group confirmed, completed, and predicted quests by trader." },
    progress: { icon: KeyRound, title: "Progress", description: "This view will track overall, Kappa, Lightkeeper, and wipe progression." },
  }
  const detail = details[view]
  const Icon = detail.icon

  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 rounded-full border bg-muted p-3">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">{detail.title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{detail.description}</p>
      </CardContent>
    </Card>
  )
}
