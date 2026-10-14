"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronRight, Copy, Loader2, Search, ShieldAlert, Trophy, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { challengeNumber, selectStaticDailyQuestions, utcDateString, type StaticAnswer, type StaticQuestion } from "@/lib/football-deepcuts/static-game"
import { normalizeSearchText } from "@/lib/football-deepcuts/normalize"
import { loadStoredGame, publishLeaderboardEntry, saveCompletedGame } from "@/lib/football-deepcuts/firestore"

interface StaticPlayer { id: string; name: string; aliases: string[]; nationalities: string[]; birthYear?: number }
interface StaticClub { id: string; name: string; country: string }
interface StaticDatabase { meta: { generatedAt: string; provisional: boolean; eligibility: string }; clubs: StaticClub[]; players: StaticPlayer[]; questions: StaticQuestion[] }
interface SubmittedAnswer { questionId: string; playerId: string; playerName: string; correct: boolean; points: number; appearances?: number[] }

function storageKey(date: string) { return `deepcuts-static-${date}` }

export function FootballDeepcutsMain() {
  const { user, loading: authLoading, ensurePlayerIdentity } = useAuth()
  const date = utcDateString()
  const [database, setDatabase] = React.useState<StaticDatabase | null>(null)
  const [loadError, setLoadError] = React.useState("")
  const [answers, setAnswers] = React.useState<SubmittedAnswer[]>([])
  const [query, setQuery] = React.useState("")
  const [selectedPlayer, setSelectedPlayer] = React.useState<StaticPlayer | null>(null)
  const [revealed, setRevealed] = React.useState(false)
  const [activeSuggestion, setActiveSuggestion] = React.useState(0)
  const [leaderboardOpen, setLeaderboardOpen] = React.useState(false)
  const [leaderboardName, setLeaderboardName] = React.useState("")
  const [publishing, setPublishing] = React.useState(false)
  const [identityReady, setIdentityReady] = React.useState(false)
  const completionHandled = React.useRef(false)

  React.useEffect(() => {
    fetch("/data/deepcuts/database.json")
      .then((response) => { if (!response.ok) throw new Error("Database could not be loaded"); return response.json() })
      .then((data: StaticDatabase) => setDatabase(data))
      .catch((error: Error) => setLoadError(error.message))
    try { setAnswers(JSON.parse(localStorage.getItem(storageKey(date)) ?? "[]")) } catch { setAnswers([]) }
  }, [date])

  React.useEffect(() => {
    if (authLoading) return
    let active = true
    setIdentityReady(false)
    const prepareIdentity = async () => {
      try {
        const identity = user ?? await ensurePlayerIdentity()
        const stored = await loadStoredGame(identity.uid, date)
        if (active && stored?.answers?.length === 5) {
          setAnswers(stored.answers)
          localStorage.setItem(storageKey(date), JSON.stringify(stored.answers))
        }
      } catch (error) {
        console.warn("Deepcuts guest identity could not be initialized", error)
      } finally { if (active) setIdentityReady(true) }
    }
    prepareIdentity()
    return () => { active = false }
  }, [authLoading, date, ensurePlayerIdentity, user])

  const questions = React.useMemo(() => database ? selectStaticDailyQuestions(database.questions, date) : [], [database, date])
  const playerIndex = React.useMemo(() => database?.players.map((player) => ({ player, search: [player.name, ...player.aliases].map(normalizeSearchText) })) ?? [], [database])
  const normalizedQuery = normalizeSearchText(query)
  const suggestions = React.useMemo(() => {
    if (normalizedQuery.length < 2 || selectedPlayer) return []
    return playerIndex
      .filter(({ search }) => search.some((name) => name.includes(normalizedQuery)))
      .sort((a, b) => Number(!a.search.some((name) => name.startsWith(normalizedQuery))) - Number(!b.search.some((name) => name.startsWith(normalizedQuery))) || a.player.name.localeCompare(b.player.name))
      .slice(0, 8)
      .map(({ player }) => player)
  }, [normalizedQuery, playerIndex, selectedPlayer])

  const currentIndex = Math.min(revealed ? answers.length - 1 : answers.length, 4)
  const currentQuestion = questions[currentIndex]
  const currentResult = answers[currentIndex]
  const complete = answers.length === 5 && !revealed
  const totalScore = answers.reduce((total, answer) => total + answer.points, 0)
  const clubs = React.useMemo(() => new Map(database?.clubs.map((club) => [club.id, club])), [database])

  React.useEffect(() => {
    if (!complete || completionHandled.current) return
    completionHandled.current = true
    const finish = async () => {
      try {
        const identity = user ?? await ensurePlayerIdentity()
        await saveCompletedGame(identity, { date, score: totalScore, answers })
        const choice = localStorage.getItem(`deepcuts-leaderboard-choice-${date}`)
        if (!choice) {
          setLeaderboardName(identity.isAnonymous ? "" : identity.displayName ?? "")
          setLeaderboardOpen(true)
        }
      } catch (error) {
        console.error("Could not save Deepcuts completion", error)
        toast.error("Your result is saved locally, but Firestore could not be reached")
        const choice = localStorage.getItem(`deepcuts-leaderboard-choice-${date}`)
        if (!choice) setLeaderboardOpen(true)
      }
    }
    finish()
  }, [answers, complete, date, ensurePlayerIdentity, totalScore, user])

  const choosePlayer = (player: StaticPlayer) => { setSelectedPlayer(player); setQuery(player.name); setActiveSuggestion(0) }
  const submit = () => {
    if (!currentQuestion || !selectedPlayer || revealed || complete) return
    const match = currentQuestion.answers.find((answer) => answer.playerId === selectedPlayer.id)
    const result: SubmittedAnswer = { questionId: currentQuestion.id, playerId: selectedPlayer.id, playerName: selectedPlayer.name, correct: Boolean(match), points: match?.points ?? 0, ...(match ? { appearances: match.appearances } : {}) }
    const next = [...answers, result]
    setAnswers(next); localStorage.setItem(storageKey(date), JSON.stringify(next)); setRevealed(true)
  }
  const advance = () => { setQuery(""); setSelectedPlayer(null); setRevealed(false); setActiveSuggestion(0) }
  const share = async () => {
    const text = [`Deepcuts #${challengeNumber(date)}`, "", ...answers.map((answer, index) => `Q${index + 1}: +${answer.points}`), "", `Total: ${totalScore}/500`].join("\n")
    await navigator.clipboard.writeText(text); toast.success("Results copied")
  }
  const declineLeaderboard = () => { localStorage.setItem(`deepcuts-leaderboard-choice-${date}`, "declined"); setLeaderboardOpen(false) }
  const publishScore = async () => {
    setPublishing(true)
    try {
      const identity = user ?? await ensurePlayerIdentity()
      const game = { date, score: totalScore, answers }
      await saveCompletedGame(identity, game)
      await publishLeaderboardEntry(identity, leaderboardName, game)
      localStorage.setItem(`deepcuts-leaderboard-choice-${date}`, "published")
      setLeaderboardOpen(false)
      toast.success("Your score is on today’s leaderboard")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Score could not be published")
    } finally { setPublishing(false) }
  }

  if (loadError) return <Card><CardHeader><CardTitle>Couldn&apos;t load Deepcuts</CardTitle><CardDescription>{loadError}</CardDescription></CardHeader></Card>
  if (!database || !currentQuestion || !identityReady) return <Card><CardContent className="flex items-center justify-center gap-3 p-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading today&apos;s challenge…</CardContent></Card>
  if (complete) return <><Results answers={answers} totalScore={totalScore} date={date} onShare={share} /><Dialog open={leaderboardOpen} onOpenChange={(open) => { if (!open) declineLeaderboard() }}><DialogContent><DialogHeader><DialogTitle>Join today&apos;s leaderboard?</DialogTitle><DialogDescription>Publishing is optional. Enter the name you want other players to see.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="leaderboard-name">Leaderboard name</Label><Input id="leaderboard-name" value={leaderboardName} onChange={(event) => setLeaderboardName(event.target.value)} maxLength={24} placeholder="Your name" /></div><DialogFooter><Button variant="outline" onClick={declineLeaderboard} disabled={publishing}>No thanks</Button><Button onClick={publishScore} disabled={publishing || leaderboardName.trim().length < 2}>{publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Publish score</Button></DialogFooter></DialogContent></Dialog></>

  const clubNames = currentQuestion.clubIds.map((id) => clubs.get(id)?.name ?? id)
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="mb-2 text-2xl font-bold">Today&apos;s five deep cuts</h2><p className="text-muted-foreground">Every correct answer is scored by its rarest verified club spell.</p></div>
        <Badge variant="secondary">Challenge #{challengeNumber(date)}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Question" value={`${currentIndex + 1} of 5`} />
        <Stat label="Current score" value={`${totalScore} / 500`} />
        <Card className="col-span-2 sm:col-span-1"><CardContent className="p-6"><ShieldAlert className="mb-3 h-5 w-5 text-muted-foreground" /><div className="text-lg font-bold">Daily attempt</div><p className="text-sm text-muted-foreground">One completion per UTC day</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>{questionLabel(currentQuestion.type)}</CardTitle><CardDescription>{currentQuestion.answerCount} sourced answers in the database</CardDescription></div><Badge variant="outline">Q{currentIndex + 1}</Badge></div></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-3">{clubNames.map((name) => <div key={name} className="rounded-lg border bg-secondary px-4 py-3 text-center font-semibold">{name}</div>)}</div>
          <p className="mx-auto max-w-2xl text-center text-xl font-semibold leading-relaxed">{currentQuestion.prompt}</p>

          {!revealed ? <div className="relative mx-auto max-w-xl">
            <Label htmlFor="deepcuts-player">Player</Label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="deepcuts-player" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedPlayer(null); setActiveSuggestion(0) }} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setActiveSuggestion((value) => Math.min(value + 1, suggestions.length - 1)) } else if (event.key === "ArrowUp") { event.preventDefault(); setActiveSuggestion((value) => Math.max(value - 1, 0)) } else if (event.key === "Enter" && suggestions[activeSuggestion]) { event.preventDefault(); choosePlayer(suggestions[activeSuggestion]) } }} placeholder="Search all players…" autoComplete="off" className="pl-9" /></div>
              <Button onClick={submit} disabled={!selectedPlayer}>Submit answer</Button>
            </div>
            {suggestions.length > 0 && <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-md border bg-popover shadow-md sm:right-[141px]">{suggestions.map((player, index) => <button type="button" key={player.id} onMouseDown={() => choosePlayer(player)} className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent ${index === activeSuggestion ? "bg-accent" : ""}`}><span className="font-medium">{player.name}</span><span className="text-xs text-muted-foreground">{[player.nationalities[0], player.birthYear].filter(Boolean).join(" · ")}</span></button>)}</div>}
            <p className="mt-2 text-sm text-muted-foreground">Choose carefully—each question accepts one final answer.</p>
          </div> : <Reveal result={currentResult} clubNames={clubNames} onContinue={advance} />}

          <div className="flex gap-2">{Array.from({ length: 5 }).map((_, index) => <span key={index} className={`h-2 flex-1 rounded-full ${index < answers.length ? "bg-primary" : "bg-secondary"}`} />)}</div>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>Question mix</CardTitle><CardDescription>Daily challenges combine clubs, nationalities, eras, and career paths.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{["Two clubs", "Club + nationality", "Club + era", "Three-club path"].map((label) => <Badge key={label} variant="outline">{label}</Badge>)}</CardContent></Card>
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-6"><Trophy className="mb-3 h-5 w-5 text-muted-foreground" /><div className="text-2xl font-bold tabular-nums">{value}</div><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card> }
function questionLabel(type: StaticQuestion["type"]) { return ({ club_pair: "Two-club connection", club_nationality: "Club and nationality", club_era: "Club era", three_clubs: "Career path" })[type] }
function Reveal({ result, clubNames, onContinue }: { result: SubmittedAnswer; clubNames: string[]; onContinue: () => void }) {
  return <AnimatePresence mode="wait"><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl rounded-lg border bg-secondary/50 p-5"><div className="flex items-start gap-3">{result.correct ? <Check className="mt-1 h-5 w-5 text-primary" /> : <X className="mt-1 h-5 w-5 text-destructive" />}<div className="flex-1"><h3 className="font-semibold">{result.correct ? `${result.playerName} scores +${result.points}` : `${result.playerName} is not a sourced answer`}</h3>{result.correct && result.appearances && <p className="mt-1 text-sm text-muted-foreground">{result.appearances.map((count, index) => `${clubNames[index]}: ${count} appearances`).join(" · ")}</p>}</div><Button onClick={onContinue}>{result.questionId ? "Continue" : "Finish"}<ChevronRight className="ml-2 h-4 w-4" /></Button></div></motion.div></AnimatePresence>
}
function Results({ answers, totalScore, date, onShare }: { answers: SubmittedAnswer[]; totalScore: number; date: string; onShare: () => void }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6"><Card><CardHeader><Trophy className="mb-2 h-8 w-8 text-primary" /><CardTitle>Challenge complete</CardTitle><CardDescription>Deepcuts #{challengeNumber(date)} · {date}</CardDescription></CardHeader><CardContent><div className="mb-6 text-4xl font-bold tabular-nums">{totalScore} <span className="text-lg font-normal text-muted-foreground">/ 500</span></div><div className="mb-6 space-y-2">{answers.map((answer, index) => <div key={answer.questionId} className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm">Q{index + 1} · {answer.playerName}</span><Badge variant={answer.correct ? "default" : "secondary"}>+{answer.points}</Badge></div>)}</div><Button onClick={onShare}><Copy className="mr-2 h-4 w-4" />Share results</Button></CardContent></Card><Card><CardHeader><CardTitle>Come back tomorrow</CardTitle><CardDescription>Today&apos;s challenge is locked after one completion. Registered players can view lifetime statistics in the Leaderboard tab.</CardDescription></CardHeader></Card></motion.div>
}
