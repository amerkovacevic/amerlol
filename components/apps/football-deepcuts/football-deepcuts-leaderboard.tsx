"use client"

import * as React from "react"
import { Loader2, Medal, Trophy } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { loadDailyLeaderboard, loadStats, type DeepcutsStats, type LeaderboardEntry } from "@/lib/football-deepcuts/firestore"
import { utcDateString } from "@/lib/football-deepcuts/static-game"

export function FootballDeepcutsLeaderboard() {
  const { user, loading: authLoading } = useAuth()
  const [entries, setEntries] = React.useState<LeaderboardEntry[]>([])
  const [stats, setStats] = React.useState<DeepcutsStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([loadDailyLeaderboard(utcDateString()), user && !user.isAnonymous ? loadStats(user.uid) : Promise.resolve(null)])
      .then(([nextEntries, nextStats]) => { if (active) { setEntries(nextEntries); setStats(nextStats); setError("") } })
      .catch(() => { if (active) setError("The leaderboard could not be loaded.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user])

  if (loading || authLoading) return <Card><CardContent className="flex items-center justify-center gap-3 p-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading leaderboard…</CardContent></Card>

  return <div className="space-y-6">
    <div><h2 className="mb-2 text-2xl font-bold">Today&apos;s leaderboard</h2><p className="text-muted-foreground">Players choose whether to publish their score after finishing.</p></div>
    {error && <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card>}
    <Card><CardHeader><CardTitle>Daily standings</CardTitle><CardDescription>{utcDateString()} · {entries.length} published {entries.length === 1 ? "score" : "scores"}</CardDescription></CardHeader><CardContent>
      {entries.length ? <div className="divide-y rounded-lg border">{entries.map((entry, index) => <div key={entry.userId} className="flex items-center gap-4 p-4"><div className="grid h-8 w-8 place-items-center rounded-full bg-secondary font-semibold">{index < 3 ? <Medal className="h-4 w-4 text-primary" /> : index + 1}</div><div className="min-w-0 flex-1"><p className="truncate font-medium">{entry.displayName}</p><p className="text-xs text-muted-foreground">{entry.registered ? "Amer.lol player" : "Guest"}</p></div><Badge variant={index === 0 ? "default" : "secondary"}>{entry.score} / 500</Badge></div>)}</div> : <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No scores have been published yet. Be the first.</div>}
    </CardContent></Card>
    {user && !user.isAnonymous ? <Stats stats={stats} /> : <Card><CardHeader><CardTitle>Your statistics</CardTitle><CardDescription>Sign in with an Amer.lol account to keep lifetime statistics across devices.</CardDescription></CardHeader></Card>}
  </div>
}

function Stats({ stats }: { stats: DeepcutsStats | null }) {
  if (!stats) return <Card><CardHeader><CardTitle>Your statistics</CardTitle><CardDescription>Complete today&apos;s challenge to begin tracking your record.</CardDescription></CardHeader></Card>
  const items = [["Games", stats.gamesPlayed], ["Current streak", stats.currentStreak], ["Longest streak", stats.longestStreak], ["Average", stats.averageScore], ["Best", stats.bestScore], ["Total points", stats.totalPoints], ["100-point answers", stats.hundredPointAnswers], ["Perfect games", stats.perfectGames]]
  return <Card><CardHeader><Trophy className="mb-2 h-6 w-6 text-primary" /><CardTitle>Your statistics</CardTitle><CardDescription>Saved to your Amer.lol account.</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">{items.map(([label, value]) => <div key={label} className="rounded-lg border p-4"><div className="text-2xl font-bold tabular-nums">{value}</div><p className="text-sm text-muted-foreground">{label}</p></div>)}</CardContent></Card>
}
