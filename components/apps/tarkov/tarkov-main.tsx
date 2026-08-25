"use client"

import * as React from "react"
import {
  BarChart3,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Database,
  Eye,
  EyeOff,
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
import { cn } from "@/lib/utils"
import { fetchTarkovDataset } from "@/lib/tarkov/api/json-tarkov-dev"
import type { TarkovGameMode } from "@/lib/tarkov/types"

type TrackerView = "overview" | "quests" | "maps" | "items" | "traders" | "progress"

type DatasetStatus =
  | { state: "loading" }
  | { state: "ready"; taskCount: number }
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

function countEntities(data: unknown, key: string): number {
  if (!data || typeof data !== "object") return 0
  const value = (data as Record<string, unknown>)[key]
  if (Array.isArray(value)) return value.length
  if (value && typeof value === "object") return Object.keys(value).length
  return 0
}

export function TarkovMain() {
  const [view, setView] = React.useState<TrackerView>("overview")
  const [mode, setMode] = React.useState<TarkovGameMode>("pvp")
  const [datasetStatus, setDatasetStatus] = React.useState<DatasetStatus>({ state: "loading" })

  React.useEffect(() => {
    const controller = new AbortController()
    setDatasetStatus({ state: "loading" })

    fetchTarkovDataset({ mode, dataset: "tasks", signal: controller.signal })
      .then((payload) => {
        setDatasetStatus({ state: "ready", taskCount: countEntities(payload.data, "tasks") })
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
              <Badge variant="secondary">Foundation</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "pvp" ? "PvP" : "PvE"} progression profile
            </p>
          </div>
          <Button variant="outline" className="gap-2" disabled>
            <Search className="h-4 w-4" />
            Search Tarkov
          </Button>
        </div>

        {view === "overview" ? (
          <Overview datasetStatus={datasetStatus} />
        ) : view === "quests" ? (
          <QuestFoundation />
        ) : (
          <FeatureFoundation view={view} />
        )}
      </section>
    </div>
  )
}

function Overview({ datasetStatus }: { datasetStatus: DatasetStatus }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          title="Game data"
          icon={Database}
          value={
            datasetStatus.state === "loading"
              ? "Loading"
              : datasetStatus.state === "error"
                ? "Unavailable"
                : "Connected"
          }
          detail={
            datasetStatus.state === "ready"
              ? `${datasetStatus.taskCount.toLocaleString()} quests discovered`
              : datasetStatus.state === "error"
                ? datasetStatus.message
                : "Connecting to json.tarkov.dev"
          }
          healthy={datasetStatus.state === "ready"}
        />
        <StatusCard title="Quest engine" icon={ShieldCheck} value="Strict" detail="Confirmed in-game quests are separate from predicted eligibility" healthy />
        <StatusCard title="Item intelligence" icon={PackageSearch} value="Queued" detail="FIR and future quest requirements" />
        <StatusCard title="Raid planner" icon={Map} value="Queued" detail="Group objectives by map and raid" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracker foundation</CardTitle>
          <CardDescription>
            The app shell and validated Tarkov data boundary are active. Player progress is not fabricated before the profile and quest-state engine exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <FoundationRow icon={CheckCircle2} title="Amer.lol app integration" description="Registered in the existing App Hub and application shell." complete />
          <FoundationRow icon={CheckCircle2} title="Typed game modes" description="PvP, PvE, and seasonal modes map to upstream identifiers." complete />
          <FoundationRow icon={CheckCircle2} title="Strict quest visibility" description="Predicted eligibility cannot silently become a quest shown in My Quests." complete />
          <FoundationRow icon={CircleDot} title="Quest normalization" description="Next implementation step: adapt raw task records into canonical quests." />
        </CardContent>
      </Card>
    </div>
  )
}

function QuestFoundation() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                My Quests is strict by default
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                The tracker will not put a quest in your normal list just because the dependency graph predicts you should have it. A quest must be confirmed on your current character first.
              </CardDescription>
            </div>
            <Badge>Default</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <VisibilityCard
            icon={Eye}
            title="My Quests"
            description="Only quests confirmed in-game, active quests, and optionally completed history. This is the normal tracker view."
          />
          <VisibilityCard
            icon={CircleDot}
            title="Eligible"
            description="Planning view. Adds quests that level, faction, prerequisite status, and branch rules predict could be available."
          />
          <VisibilityCard
            icon={EyeOff}
            title="All Quests"
            description="Research/debug view. Shows the whole loaded dataset and never contaminates your real current quest list."
          />
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h3 className="font-semibold">Current implementation step</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                The visibility and branch-aware dependency engines are implemented. The next step is normalizing the live task records, then wiring manual quest confirmation so you can quickly reconcile Amer.lol with the quests actually visible in Tarkov.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function VisibilityCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border p-4">
      <Icon className="mb-3 h-5 w-5" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
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
  complete = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  complete?: boolean
}) {
  return (
    <div className="flex gap-3 rounded-lg border p-4">
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0 text-muted-foreground", complete && "text-foreground")} />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function FeatureFoundation({ view }: { view: Exclude<TrackerView, "overview" | "quests"> }) {
  const details: Record<Exclude<TrackerView, "overview" | "quests">, { icon: React.ComponentType<{ className?: string }>; title: string; description: string }> = {
    maps: { icon: Map, title: "Map planner", description: "This view will rank maps using active and available quest objectives." },
    items: { icon: PackageSearch, title: "Items needed", description: "This view will aggregate FIR, future quest, key, and hideout requirements." },
    traders: { icon: Users, title: "Trader progression", description: "This view will group active, completed, and locked quests by trader." },
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
