"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Backpack, Check, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Import, Map as MapIcon, Minus, Plus, RefreshCw, RotateCcw, Search, Shield, Target, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { fetchTarkovTasks, type WipeMode } from "./data-service"
import { useTarkovTaskPlanner, type PmcFaction } from "./tarkov-task-planner-provider"
import type { MapPlan, TarkovItem, TarkovObjective, TarkovTask } from "./types"

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function objectiveMaps(task: TarkovTask, objective: TarkovObjective) {
  const names = objective.maps.map((map) => map.name)
  if (!names.length && task.map?.name) names.push(task.map.name)
  return [...new Set(names)].filter(Boolean)
}

function buildPlans(tasks: TarkovTask[]): MapPlan[] {
  const plans = new Map<string, MapPlan>()
  tasks.forEach((task) => {
    const objectivesByMap = new Map<string, TarkovObjective[]>()
    task.objectives.forEach((objective) => {
      objectiveMaps(task, objective).forEach((mapName) => {
        objectivesByMap.set(mapName, [...(objectivesByMap.get(mapName) || []), objective])
      })
    })
    objectivesByMap.forEach((objectives, mapName) => {
      const plan = plans.get(mapName) || { name: mapName, tasks: [], objectiveCount: 0 }
      plan.tasks.push({ task, objectives })
      plan.objectiveCount += objectives.length
      plans.set(mapName, plan)
    })
  })
  return [...plans.values()].sort((a, b) => b.tasks.length - a.tasks.length || b.objectiveCount - a.objectiveCount || a.name.localeCompare(b.name))
}

function flattenItems(groups?: TarkovItem[][]) {
  return groups?.flat().filter(Boolean) || []
}

function raidRequirements(objective: TarkovObjective) {
  const items = [
    ...flattenItems(objective.requiredKeys),
    ...(objective.markerItem ? [objective.markerItem] : []),
    ...(objective.useAny || []),
    ...(objective.usingWeapon || []),
    ...flattenItems(objective.wearing),
  ]
  return [...new Map(items.map((item) => [item.name, item])).values()]
}

function parseImports(raw: string) {
  try {
    const parsed = JSON.parse(raw)
    const values = Array.isArray(parsed) ? parsed : parsed.tasks || parsed.activeTasks || []
    return values.map((value: unknown) => typeof value === "string" ? value : (value as { id?: string; name?: string }).id || (value as { name?: string }).name).filter(Boolean)
  } catch {
    return raw.split(/\r?\n|,/).map((value) => value.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean)
  }
}

export function TarkovTaskPlannerMain() {
  const { selectedIds, setSelectedIds, completedObjectiveIds, setCompletedObjectiveIds, completedTaskIds, setCompletedTaskIds, failedTaskIds, setFailedTaskIds, wipeMode, setWipeMode, faction, setFaction, pmcLevel, setPmcLevel, traderLevels, setTraderLevels, hydrated } = useTarkovTaskPlanner()
  const [tasks, setTasks] = React.useState<TarkovTask[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [importText, setImportText] = React.useState("")
  const [showImport, setShowImport] = React.useState(false)
  const [expandedMap, setExpandedMap] = React.useState<string | null>(null)
  React.useEffect(() => { if (hydrated) loadTasks(wipeMode) }, [hydrated, wipeMode])

  async function loadTasks(mode: WipeMode = wipeMode) {
    setLoading(true)
    setError("")
    try {
      setTasks(await fetchTarkovTasks(mode))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reach tarkov.dev")
    } finally {
      setLoading(false)
    }
  }

  function changeWipeMode(mode: WipeMode) {
    setWipeMode(mode)
    setCompletedObjectiveIds([])
  }

  const traderUnlockTasks = React.useMemo(() => {
    const unlocks = new Map<string, TarkovTask>()
    tasks.forEach((task) => task.traderUnlocks.forEach((traderId) => unlocks.set(traderId, task)))
    return unlocks
  }, [tasks])

  function traderIsUnlocked(traderId: string) {
    const unlockTask = traderUnlockTasks.get(traderId)
    return !unlockTask || completedTaskIds.includes(unlockTask.id)
  }

  function ineligibilityReason(task: TarkovTask) {
    if ((task.minPlayerLevel || 1) > pmcLevel) return `Requires level ${task.minPlayerLevel}`
    const taskFaction = task.factionName?.toUpperCase()
    if (taskFaction && taskFaction !== "ANY" && taskFaction !== faction) return `${task.factionName} only`
    if (!traderIsUnlocked(task.trader.id)) return `Unlocks after ${traderUnlockTasks.get(task.trader.id)?.name}`
    const traderRequirement = task.traderRequirements.find((requirement) => {
      if (!traderIsUnlocked(requirement.traderId)) return true
      const currentLevel = traderLevels[requirement.traderId] || 1
      if (requirement.compareMethod === ">") return !(currentLevel > requirement.level)
      if (requirement.compareMethod === "=") return currentLevel !== requirement.level
      if (requirement.compareMethod === "<=") return !(currentLevel <= requirement.level)
      if (requirement.compareMethod === "<") return !(currentLevel < requirement.level)
      return currentLevel < requirement.level
    })
    if (traderRequirement) {
      const unlockTask = traderUnlockTasks.get(traderRequirement.traderId)
      if (unlockTask && !completedTaskIds.includes(unlockTask.id)) return `Unlock ${traderRequirement.traderName} via ${unlockTask.name}`
      return `Requires ${traderRequirement.traderName} LL${traderRequirement.level}`
    }
    return null
  }

  function prerequisitesMet(task: TarkovTask) {
    return task.taskRequirements.every((requirement) => requirement.status.some((status) => {
      if (status === "active") return selectedIds.includes(requirement.taskId)
      if (status === "complete") return completedTaskIds.includes(requirement.taskId)
      return failedTaskIds.includes(requirement.taskId)
    }))
  }

  function taskBlockReason(task: TarkovTask) {
    const profileReason = ineligibilityReason(task)
    if (profileReason) return profileReason
    const unmet = task.taskRequirements.find((requirement) => !requirement.status.some((status) => {
      if (status === "active") return selectedIds.includes(requirement.taskId)
      if (status === "complete") return completedTaskIds.includes(requirement.taskId)
      return failedTaskIds.includes(requirement.taskId)
    }))
    if (!unmet) return null
    const prerequisite = tasks.find((candidate) => candidate.id === unmet.taskId)
    return `Locked by ${prerequisite?.name || "a previous quest"}`
  }

  const selectedTasks = React.useMemo(() => tasks.filter((task) => selectedIds.includes(task.id)), [tasks, selectedIds])
  const progressionTraders = React.useMemo(() => {
    const traders = new Map<string, string>()
    tasks.forEach((task) => task.traderRequirements.forEach((requirement) => traders.set(requirement.traderId, requirement.traderName)))
    return [...traders.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [tasks])
  const eligibleSelectedTasks = React.useMemo(() => selectedTasks.filter((task) => !taskBlockReason(task)), [selectedTasks, tasks, selectedIds, completedTaskIds, failedTaskIds, pmcLevel, faction, traderLevels])
  const blockedSelectedTasks = React.useMemo(() => selectedTasks.filter((task) => taskBlockReason(task)), [selectedTasks, tasks, selectedIds, completedTaskIds, failedTaskIds, pmcLevel, faction, traderLevels])
  const activeTasks = React.useMemo(() => eligibleSelectedTasks.map((task) => ({ ...task, objectives: task.objectives.filter((objective, index) => !completedObjectiveIds.includes(objective.id || `${task.id}-${index}`)) })), [eligibleSelectedTasks, completedObjectiveIds])
  const plans = React.useMemo(() => buildPlans(activeTasks), [activeTasks])
  const availableTasks = React.useMemo(() => tasks.filter((task) => !selectedIds.includes(task.id) && !completedTaskIds.includes(task.id) && !failedTaskIds.includes(task.id) && !ineligibilityReason(task) && prerequisitesMet(task)), [tasks, selectedIds, completedTaskIds, failedTaskIds, pmcLevel, faction, traderLevels])
  const filteredTasks = React.useMemo(() => {
    const needle = normalize(query)
    if (!needle) return availableTasks.slice(0, 40)
    return availableTasks.filter((task) => normalize(`${task.name} ${task.trader.name}`).includes(needle)).slice(0, 50)
  }, [availableTasks, query])

  function importTasks() {
    const values = parseImports(importText)
    const matched = new Set<string>()
    values.forEach((value: string) => {
      const needle = normalize(value)
      const exact = tasks.find((task) => task.id === value || normalize(task.name) === needle)
      const partial = tasks.find((task) => normalize(task.name).includes(needle) || needle.includes(normalize(task.name)))
      const task = exact || partial
      if (task && !taskBlockReason(task)) matched.add(task.id)
    })
    setSelectedIds((current) => [...new Set([...current, ...matched])])
    toast.success(`Imported ${matched.size} eligible tasks from ${values.length} entries`)
    if (matched.size) { setImportText(""); setShowImport(false) }
  }

  function toggleTask(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  function setTaskStatus(id: string, status: "complete" | "failed") {
    setSelectedIds((current) => current.filter((value) => value !== id))
    if (status === "complete") setCompletedTaskIds((current) => [...new Set([...current, id])])
    else setFailedTaskIds((current) => [...new Set([...current, id])])
    toast.success(status === "complete" ? "Quest completed — new quests may be available" : "Quest marked failed — alternate quests may be available")
  }

  function resetTaskStatus(id: string) {
    setCompletedTaskIds((current) => current.filter((value) => value !== id))
    setFailedTaskIds((current) => current.filter((value) => value !== id))
  }

  function toggleObjective(task: TarkovTask, objective: TarkovObjective, index: number) {
    const id = objective.id || `${task.id}-${index}`
    setCompletedObjectiveIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  if (loading) return <div className="flex min-h-[320px] items-center justify-center text-muted-foreground"><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading current tasks from tarkov.dev…</div>

  if (error) return (
    <Card className="border-amber-500/40 bg-amber-500/5"><CardContent className="flex flex-col items-center gap-4 py-12 text-center"><AlertTriangle className="h-9 w-9 text-amber-500" /><div><h2 className="font-semibold">tarkov.dev is unavailable</h2><p className="mt-1 max-w-lg text-sm text-muted-foreground">{error}. Your imported tasks are saved locally; retry when the API is back online.</p></div><Button onClick={() => loadTasks()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></CardContent></Card>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Shield className="h-5 w-5 text-primary" />PMC profile</CardTitle><CardDescription>Only quests available to this character are included in search, imports, and raid recommendations.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Wipe type</Label><Select value={wipeMode} onValueChange={(value) => changeWipeMode(value as WipeMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pvp">PvP</SelectItem><SelectItem value="pve">PvE</SelectItem><SelectItem value="seasonal">Seasonal PvP</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>PMC faction</Label><Select value={faction} onValueChange={(value) => setFaction(value as PmcFaction)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USEC">USEC</SelectItem><SelectItem value="BEAR">BEAR</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="pmc-level">PMC level</Label><Input id="pmc-level" type="number" min={1} max={79} value={pmcLevel} onChange={(event) => setPmcLevel(Math.min(79, Math.max(1, Number(event.target.value) || 1)))} /></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-xl">Trader progression</CardTitle><CardDescription>Set each loyalty level. Quest-locked traders become available automatically when their unlock quest is completed.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{progressionTraders.map((trader) => { const unlockTask = traderUnlockTasks.get(trader.id); const unlocked = traderIsUnlocked(trader.id); const level = traderLevels[trader.id] || 1; return <div key={trader.id} className={`space-y-2 rounded-lg border p-3 ${unlocked ? "bg-background" : "bg-muted/40"}`}><Label>{trader.name}</Label>{unlocked ? <div className="flex items-center overflow-hidden rounded-md border bg-background"><Button type="button" size="icon" variant="ghost" className="rounded-none" disabled={level <= 1} aria-label={`Decrease ${trader.name} loyalty level`} onClick={() => setTraderLevels((current) => ({ ...current, [trader.id]: Math.max(1, level - 1) }))}><Minus className="h-4 w-4" /></Button><div className="flex min-w-0 flex-1 flex-col items-center border-x px-3 py-1"><span className="text-[10px] uppercase tracking-wide text-muted-foreground">Loyalty</span><span className="font-semibold tabular-nums">{level}</span></div><Button type="button" size="icon" variant="ghost" className="rounded-none" disabled={level >= 4} aria-label={`Increase ${trader.name} loyalty level`} onClick={() => setTraderLevels((current) => ({ ...current, [trader.id]: Math.min(4, level + 1) }))}><Plus className="h-4 w-4" /></Button></div> : <p className="text-xs text-muted-foreground">Complete {unlockTask?.name || "the unlock quest"}</p>}</div> })}</CardContent></Card>
      {blockedSelectedTasks.length > 0 && <Card className="border-amber-500/40 bg-amber-500/5"><CardContent className="flex gap-3 py-4"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><div><p className="text-sm font-medium">{blockedSelectedTasks.length} previously selected {blockedSelectedTasks.length === 1 ? "quest is" : "quests are"} currently locked</p><div className="mt-2 flex flex-wrap gap-2">{blockedSelectedTasks.map((task) => <Badge key={task.id} variant="outline">{task.name}: {taskBlockReason(task)}</Badge>)}</div></div></CardContent></Card>}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-xl">Quest progression</CardTitle><CardDescription>Choose from currently unlocked quests. Complete or fail active quests to unlock the next ones.</CardDescription></div><Button variant="outline" onClick={() => setShowImport((value) => !value)}><Import className="mr-2 h-4 w-4" />Import</Button></div></CardHeader><CardContent className="space-y-4">
          {showImport && <div className="rounded-lg border bg-muted/30 p-3"><Textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={'Paste one task name per line, task IDs, or JSON\nExample:\nDebut\nSearch Mission'} className="min-h-28" /><div className="mt-2 flex justify-end"><Button onClick={importTasks} disabled={!importText.trim()}>Match tasks</Button></div></div>}
          {eligibleSelectedTasks.length > 0 && <div><div className="mb-2 flex items-center justify-between"><Label>Active ({eligibleSelectedTasks.length})</Label><span className="text-xs text-muted-foreground">Update status to advance the quest tree</span></div><div className="space-y-2">{eligibleSelectedTasks.map((task) => <div key={task.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-primary/5 px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{task.name}</p><p className="text-xs text-muted-foreground">{task.trader.name}</p></div><Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => setTaskStatus(task.id, "complete")}><CheckCircle2 className="mr-1.5 h-4 w-4" />Complete</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => setTaskStatus(task.id, "failed")}><XCircle className="mr-1.5 h-4 w-4" />Fail</Button><Button size="icon" variant="ghost" aria-label={`Remove ${task.name}`} onClick={() => toggleTask(task.id)}><Trash2 className="h-4 w-4" /></Button></div>)}</div></div>}
          <div className="flex items-center justify-between"><Label>Available quests ({availableTasks.length})</Label><div className="flex gap-2"><Badge variant="secondary">{completedTaskIds.length} complete</Badge>{failedTaskIds.length > 0 && <Badge variant="outline">{failedTaskIds.length} failed</Badge>}</div></div>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search task or trader…" className="pl-9" /></div>
          <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border p-1">{filteredTasks.length ? filteredTasks.map((task) => <button key={task.id} onClick={() => toggleTask(task.id)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-input"><Check className="h-3.5 w-3.5 opacity-0" /></span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{task.name}</span><span className="text-xs text-muted-foreground">{task.trader.name}{task.minPlayerLevel ? ` · Level ${task.minPlayerLevel}` : ""}</span></span><Badge variant="outline">Add</Badge></button>) : <p className="px-3 py-8 text-center text-sm text-muted-foreground">No unlocked quests match this search.</p>}</div>
          {(completedTaskIds.length > 0 || failedTaskIds.length > 0) && <details className="rounded-lg border px-3 py-2"><summary className="cursor-pointer text-sm font-medium">Quest history</summary><div className="mt-2 space-y-1">{tasks.filter((task) => completedTaskIds.includes(task.id) || failedTaskIds.includes(task.id)).map((task) => <div key={task.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"><span className="min-w-0 flex-1 truncate">{task.name}</span><Badge variant={completedTaskIds.includes(task.id) ? "secondary" : "destructive"}>{completedTaskIds.includes(task.id) ? "Complete" : "Failed"}</Badge><Button size="icon" variant="ghost" aria-label={`Reset ${task.name}`} onClick={() => resetTaskStatus(task.id)}><RotateCcw className="h-3.5 w-3.5" /></Button></div>)}</div></details>}
        </CardContent></Card>
        <Card className="border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent"><CardHeader><CardDescription>Recommended raid</CardDescription><CardTitle className="flex items-center gap-2 text-2xl"><MapIcon className="h-6 w-6 text-emerald-500" />{plans[0]?.name || "Add tasks"}</CardTitle></CardHeader><CardContent>{plans[0] ? <><p className="text-sm text-muted-foreground">Progress <strong className="text-foreground">{plans[0].tasks.length} tasks</strong> across {plans[0].objectiveCount} objectives in one raid.</p><div className="mt-4 flex flex-wrap gap-2">{plans[0].tasks.map(({ task }) => <Badge key={task.id} variant="secondary">{task.name}</Badge>)}</div></> : <p className="text-sm text-muted-foreground">Select your active tasks to calculate the highest-value map.</p>}</CardContent></Card>
      </div>

      <div><div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-semibold">Raid plan</h2><p className="text-sm text-muted-foreground">Maps ranked by unique eligible tasks, then actionable objectives.</p></div><Badge variant="outline">{eligibleSelectedTasks.length} eligible</Badge></div>
        {plans.length ? <div className="space-y-3">{plans.map((plan, planIndex) => { const open = expandedMap === plan.name || (!expandedMap && planIndex === 0); return <Card key={plan.name} className={planIndex === 0 ? "border-emerald-500/40" : ""}><button className="flex w-full items-center gap-4 p-5 text-left" onClick={() => setExpandedMap(open ? "__closed__" : plan.name)}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">{planIndex + 1}</span><span className="min-w-0 flex-1"><span className="block text-lg font-semibold">{plan.name}</span><span className="text-sm text-muted-foreground">{plan.tasks.length} tasks · {plan.objectiveCount} objectives</span></span>{planIndex === 0 && <Badge className="bg-emerald-600">Best value</Badge>}{open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button>{open && <CardContent className="space-y-4 border-t pt-5">{plan.tasks.map(({ task, objectives }) => <div key={task.id} className="rounded-lg border bg-muted/20 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">{task.name}</h3><p className="text-xs text-muted-foreground">{task.trader.name}</p></div>{task.wikiLink && <Button asChild size="sm" variant="ghost"><a href={task.wikiLink} target="_blank" rel="noreferrer">Full guide <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button>}</div><div className="space-y-2">{objectives.map((objective, index) => { const requirements = raidRequirements(objective); return <div key={objective.id || index} className="rounded-md bg-background p-3"><div className="flex gap-3"><button aria-label="Mark objective complete" onClick={() => toggleObjective(task, objective, task.objectives.indexOf(objective))} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-input hover:border-primary"><Check className="h-3 w-3 opacity-0 hover:opacity-50" /></button><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-sm">{objective.description}</p></div>{requirements.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5"><Backpack className="h-3.5 w-3.5 text-amber-500" /><span className="mr-1 text-xs font-medium">Bring:</span>{requirements.map((item) => <Badge key={item.name} variant="outline" className="text-[11px]">{item.shortName || item.name}</Badge>)}</div>}{objective.foundInRaid && <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Must be found in raid</p>}</div></div></div>})}</div></div>)}</CardContent>}</Card>})}</div> : <Card><CardContent className="py-14 text-center"><Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No map objectives yet</p><p className="mt-1 text-sm text-muted-foreground">Select tasks with in-raid objectives to build your plan.</p></CardContent></Card>}
      </div>

      {(selectedTasks.length > 0 || completedTaskIds.length > 0 || failedTaskIds.length > 0) && <div className="flex justify-end"><Button variant="ghost" className="text-muted-foreground" onClick={() => { setSelectedIds([]); setCompletedObjectiveIds([]); setCompletedTaskIds([]); setFailedTaskIds([]) }}><Trash2 className="mr-2 h-4 w-4" />Reset quest progression</Button></div>}
      <p className="text-center text-xs text-muted-foreground">Task data provided by <a className="underline underline-offset-2" href="https://tarkov.dev" target="_blank" rel="noreferrer">tarkov.dev</a>. Verify game details after patches.</p>
    </motion.div>
  )
}
