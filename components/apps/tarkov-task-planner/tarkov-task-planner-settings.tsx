"use client"

import { Database, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTarkovTaskPlanner } from "./tarkov-task-planner-provider"

export function TarkovTaskPlannerSettings() {
  const { cloudReady, clearProgress } = useTarkovTaskPlanner()

  async function clearData() {
    try {
      await clearProgress()
      toast.success("Tarkov planner data cleared from this browser and your account")
    } catch (error) {
      console.error("Tarkov planner clear failed:", error)
      toast.error("Could not clear cloud planner data")
    }
  }

  return <div className="space-y-4"><Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Cloud sync</CardTitle><CardDescription>Your PMC profile, exact tarkov.dev task IDs, objective IDs, trader IDs, and progression statuses are stored in your private account document.</CardDescription></div><Badge variant={cloudReady ? "secondary" : "outline"}>{cloudReady ? "Synced" : "Connecting…"}</Badge></div></CardHeader><CardContent><p className="text-sm text-muted-foreground">Firestore path: <code className="rounded bg-muted px-1.5 py-0.5">users/&lt;uid&gt;/tarkovPlanner/default</code></p></CardContent></Card><Card><CardHeader><CardTitle>Reset planner</CardTitle><CardDescription>Clears the local browser copy and replaces the signed-in cloud document with clean defaults.</CardDescription></CardHeader><CardContent><Button variant="destructive" onClick={clearData}><Trash2 className="mr-2 h-4 w-4" />Clear local and cloud data</Button></CardContent></Card></div>
}
