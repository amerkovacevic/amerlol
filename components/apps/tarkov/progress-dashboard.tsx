"use client"

import * as React from "react"
import { CheckCircle2, CircleDashed, Crown, LockKeyhole, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { loadLocalTarkovProfile } from "@/lib/tarkov/storage/profile"
import { loadQuestPresence } from "@/lib/tarkov/storage/quest-presence"
import { loadQuestProgress } from "@/lib/tarkov/storage/quest-progress"
import type { TarkovFaction, TarkovGameMode, TarkovQuest } from "@/lib/tarkov/types"

interface ProgressDashboardProps {
  mode: TarkovGameMode
  quests: TarkovQuest[]
  traders: Record<string, string>
}

function matchesFaction(quest: TarkovQuest, faction: TarkovFaction): boolean {
  const factionRequirements = quest.requirements.filter((requirement) => requirement.type === "faction" && requirement.faction)
  return factionRequirements.length === 0 || factionRequirements.some((requirement) => requirement.faction === faction)
}

function percentage(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

export function ProgressDashboard({ mode, quests, traders }: ProgressDashboardProps) {
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
    const profile = loadLocalTarkovProfile(mode)
    const presence = loadQuestPresence(mode)
    const progress = loadQuestProgress(mode)
    const compatible = quests.filter((quest) => matchesFaction(quest, profile.faction))

    const completed = (quest: TarkovQuest) => progress[quest.id]?.status === "completed" || presence[quest.id]?.status === "completed"
    const current = (quest: TarkovQuest) => {
      const seen = presence[quest.id]
      if (!seen || (seen.status !== "available" && seen.status !== "active")) return false
      const state = progress[quest.id]?.status
      return state !== "completed" && state !== "failed"
    }

    const kappa = compatible.filter((quest) => quest.kappaRequired)
    const lightkeeper = compatible.filter((quest) => quest.lightkeeperRequired)

    return {
      compatible,
      completedCompatible: compatible.filter(completed),
      activeConfirmed: compatible.filter(current),
      kappa,
      kappaCompleted: kappa.filter(completed),
      kappaRemaining: kappa.filter((quest) => !completed(quest)),
      lightkeeper,
      lightkeeperCompleted: lightkeeper.filter(completed),
      lightkeeperRemaining: lightkeeper.filter((quest) => !completed(quest)),
      current,
    }
  }, [mode, quests, revision])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Target} title="Overall quests" done={data.completedCompatible.length} total={data.compatible.length} />
        <MetricCard icon={CircleDashed} title="Confirmed current" value={String(data.activeConfirmed.length)} detail="Only unfinished quests confirmed on your character" />
        <MetricCard icon={Crown} title="Kappa" done={data.kappaCompleted.length} total={data.kappa.length} />
        <MetricCard icon={LockKeyhole} title="Lightkeeper" done={data.lightkeeperCompleted.length} total={data.lightkeeper.length} />
      </div>

      <GoalCard title="Kappa progression" description="Required quests are derived from current game data. Unconfirmed required quests are planning information only and do not enter My Quests or raid recommendations." completed={data.kappaCompleted.length} total={data.kappa.length} remaining={data.kappaRemaining} isCurrent={data.current} traders={traders} />
      <GoalCard title="Lightkeeper progression" description="Tracks current upstream Lightkeeper-required quests while preserving the same strict confirmed-vs-predicted separation as the rest of the tracker." completed={data.lightkeeperCompleted.length} total={data.lightkeeper.length} remaining={data.lightkeeperRemaining} isCurrent={data.current} traders={traders} />
    </div>
  )
}

function MetricCard({ icon: Icon, title, done, total, value, detail }: { icon: React.ComponentType<{ className?: string }>; title: string; done?: number; total?: number; value?: string; detail?: string }) {
  const hasProgress = typeof done === "number" && typeof total === "number"
  return <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardDescription>{title}</CardDescription><Icon className="h-4 w-4 text-muted-foreground" /></div><CardTitle className="text-2xl">{hasProgress ? `${done}/${total}` : value}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{hasProgress ? `${percentage(done, total)}% complete` : detail}</p></CardContent></Card>
}

function GoalCard({ title, description, completed, total, remaining, isCurrent, traders }: { title: string; description: string; completed: number; total: number; remaining: TarkovQuest[]; isCurrent: (quest: TarkovQuest) => boolean; traders: Record<string, string> }) {
  const ordered = [...remaining].sort((a, b) => Number(isCurrent(b)) - Number(isCurrent(a)) || a.minimumLevel - b.minimumLevel || a.name.localeCompare(b.name))
  return (
    <Card>
      <CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>{title}</CardTitle><CardDescription className="mt-2 max-w-3xl">{description}</CardDescription></div><Badge variant="outline">{percentage(completed, total)}%</Badge></div></CardHeader>
      <CardContent className="space-y-4">
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage(completed, total)}><div className="h-full bg-foreground transition-[width]" style={{ width: `${percentage(completed, total)}%` }} /></div>
        {ordered.length === 0 ? <div className="flex items-center gap-2 rounded-lg border p-4 text-sm"><CheckCircle2 className="h-4 w-4" />No remaining required quests detected.</div> : (
          <div className="grid gap-2 lg:grid-cols-2">
            {ordered.slice(0, 16).map((quest) => {
              const current = isCurrent(quest)
              return <div key={quest.id} className="flex items-start justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{quest.name}</p><p className="mt-1 text-xs text-muted-foreground">{traders[quest.traderId] ?? "Unknown trader"} · level {quest.minimumLevel}</p></div><Badge variant={current ? "secondary" : "outline"}>{current ? "On character" : "Unconfirmed"}</Badge></div>
            })}
          </div>
        )}
        {ordered.length > 16 && <p className="text-xs text-muted-foreground">Showing the first 16 of {ordered.length} remaining required quests, with current confirmed quests first.</p>}
      </CardContent>
    </Card>
  )
}
