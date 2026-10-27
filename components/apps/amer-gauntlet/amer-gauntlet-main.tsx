"use client"

import * as React from "react"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  Flame,
  History,
  Lightbulb,
  Share2,
  Timer,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { useAppSettings } from "@/components/apps/settings-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getProfileName } from "@/lib/account/profile"
import {
  checkGuess,
  EMPTY_STATS,
  formatDuration,
  getDailyWord,
  MAX_ATTEMPTS,
  nextStats,
  scoreGame,
  shareText,
  type GameResult,
  type GauntletStats,
  type LetterResult,
} from "@/lib/apps/gauntlet"
import { copyText } from "@/lib/browser"
import { db } from "@/lib/firebase/db"
import { getErrorCode, logUnexpectedError } from "@/lib/firebase/user-facing-errors"
import { utcDateString } from "@/lib/football-deepcuts/static-game"
import { useAsync } from "@/lib/hooks/use-async"
import { useHydrated } from "@/lib/hooks/use-hydrated"
import { useNow } from "@/lib/hooks/use-now"

interface LeaderboardEntry {
  userId: string
  displayName: string
  score: number
  detail?: string
}

interface StoredGame {
  result: GameResult
  guesses: string[]
}

const LEADERBOARD_LIMIT = 100
const HISTORY_LIMIT = 30
const ALREADY_PLAYED = "already-played"

async function loadDailyLeaderboard(date: string): Promise<LeaderboardEntry[]> {
  const ref = collection(db, "amerGauntletDailyLeaderboard")
  let snapshot
  try {
    snapshot = await getDocs(
      query(
        ref,
        where("date", "==", date),
        orderBy("score", "desc"),
        orderBy("time", "asc"),
        limit(LEADERBOARD_LIMIT)
      )
    )
  } catch (error) {
    // Without the composite index, rank on the client instead.
    if (getErrorCode(error) !== "failed-precondition") throw error
    snapshot = await getDocs(query(ref, where("date", "==", date), limit(LEADERBOARD_LIMIT)))
  }
  return snapshot.docs
    .map((entry) => entry.data())
    .sort((a, b) => b.score - a.score || a.time - b.time)
    .map((data) => ({
      userId: data.userId,
      displayName: data.displayName || "Anonymous",
      score: data.score,
      detail: `${data.attempts} attempts • ${formatDuration(data.time)}`,
    }))
}

async function loadAllTimeLeaderboard(): Promise<LeaderboardEntry[]> {
  const snapshot = await getDocs(
    query(
      collection(db, "amerGauntletAllTimeLeaderboard"),
      orderBy("totalScore", "desc"),
      limit(LEADERBOARD_LIMIT)
    )
  )
  return snapshot.docs.map((entry) => {
    const data = entry.data()
    return { userId: data.userId, displayName: data.displayName || "Anonymous", score: data.totalScore }
  })
}

function toResult(data: Record<string, unknown>): GameResult {
  return {
    date: String(data.date),
    word: String(data.word),
    attempts: Number(data.attempts) || 0,
    time: Number(data.time) || 0,
    completed: data.completed === true,
    score: Number(data.score) || 0,
    hintsUsed: Number(data.hintsUsed) || 0,
  }
}

async function loadAccountData(uid: string, date: string) {
  const [today, stats, history] = await Promise.all([
    getDoc(doc(db, "users", uid, "amerGauntletResults", date)),
    getDoc(doc(db, "users", uid, "amerGauntletStats", "default")),
    getDocs(
      query(
        collection(db, "users", uid, "amerGauntletResults"),
        orderBy("date", "desc"),
        limit(HISTORY_LIMIT)
      )
    ),
  ])
  const todayData = today.data()
  const todayGame: StoredGame | null = todayData
    ? { result: toResult(todayData), guesses: Array.isArray(todayData.guesses) ? todayData.guesses : [] }
    : null
  return {
    today: todayGame,
    stats: { ...EMPTY_STATS, ...(stats.data() as Partial<GauntletStats> | undefined) },
    history: history.docs.map((entry) => toResult(entry.data())),
  }
}

/**
 * Records a finished game atomically. Each day can be scored once: a second
 * attempt (another tab or device) is rejected instead of double counting.
 */
async function recordGame(uid: string, { result, guesses }: StoredGame) {
  const displayName = (await getProfileName(uid).catch(() => null)) || "Anonymous"
  const resultRef = doc(db, "users", uid, "amerGauntletResults", result.date)
  const statsRef = doc(db, "users", uid, "amerGauntletStats", "default")
  const allTimeRef = doc(db, "amerGauntletAllTimeLeaderboard", uid)
  const dailyRef = doc(db, "amerGauntletDailyLeaderboard", `${result.date}_${uid}`)

  await runTransaction(db, async (transaction) => {
    const [existing, stats, allTime] = await Promise.all([
      transaction.get(resultRef),
      transaction.get(statsRef),
      transaction.get(allTimeRef),
    ])
    if (existing.exists()) throw new Error(ALREADY_PLAYED)

    // Per-letter results are derived from the guesses: Firestore cannot store nested arrays.
    transaction.set(resultRef, { ...result, guesses, createdAt: serverTimestamp() })
    transaction.set(statsRef, {
      ...nextStats(stats.data() as GauntletStats | undefined, result),
      updatedAt: serverTimestamp(),
      ...(stats.exists() ? {} : { createdAt: serverTimestamp() }),
    })
    transaction.set(dailyRef, {
      userId: uid,
      displayName,
      date: result.date,
      score: result.score,
      attempts: result.attempts,
      time: result.time,
      word: result.word,
      createdAt: serverTimestamp(),
    })
    transaction.set(allTimeRef, {
      userId: uid,
      displayName,
      totalScore: (allTime.data()?.totalScore || 0) + result.score,
      updatedAt: serverTimestamp(),
      createdAt: allTime.data()?.createdAt ?? serverTimestamp(),
    })
  })
}

type Tab = "play" | "leaderboard" | "stats"

export function AmerGauntletMain() {
  const settings = useAppSettings("amer-gauntlet")
  const { account, loading: authLoading } = useAuth()
  const hydrated = useHydrated()
  // Fixed for the session so a game in progress keeps its word across UTC midnight.
  const [today] = React.useState(utcDateString)
  const word = getDailyWord(today)
  const uid = account?.uid ?? null

  const dailyLeaderboard = useAsync(today, () => loadDailyLeaderboard(today))
  const allTimeLeaderboard = useAsync("all-time", loadAllTimeLeaderboard)
  const accountData = useAsync(uid && `${uid}:${today}`, () => loadAccountData(uid!, today))

  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<Tab>("play")
  const [startedAt, setStartedAt] = React.useState<number | null>(null)
  const [guesses, setGuesses] = React.useState<string[]>([])
  const [currentGuess, setCurrentGuess] = React.useState("")
  const [hintsUsed, setHintsUsed] = React.useState(0)
  const [finished, setFinished] = React.useState<StoredGame | null>(null)

  // Today's game, whether it finished in this session or was loaded from the account.
  const todayGame = finished ?? accountData.data?.today ?? null
  const playing = startedAt !== null && !todayGame
  const now = useNow(1000, playing)
  const elapsed = startedAt && now ? Math.max(0, Math.floor((now.getTime() - startedAt) / 1000)) : 0
  const shownGuesses = todayGame?.guesses ?? guesses
  const rows = shownGuesses.map((guess) => checkGuess(guess, word))
  const stats = accountData.data?.stats
  const history = accountData.data?.history ?? []

  const startGame = () => {
    if (!account) {
      setAuthDialogOpen(true)
      return
    }
    setStartedAt(Date.now())
    setGuesses([])
    setCurrentGuess("")
    setHintsUsed(0)
  }

  const finishGame = async (finalGuesses: string[], won: boolean) => {
    if (!account || startedAt === null) return
    const time = Math.floor((Date.now() - startedAt) / 1000)
    const attempts = finalGuesses.length
    const game: StoredGame = {
      guesses: finalGuesses,
      result: {
        date: today,
        word,
        attempts,
        time,
        completed: won,
        hintsUsed,
        score: scoreGame({ won, seconds: time, attempts, hintsUsed }),
      },
    }
    setFinished(game)
    if (won)
      toast.success(`Congratulations! You solved it in ${attempts} attempt${attempts === 1 ? "" : "s"}!`)
    else toast.error(`The word was: ${word}`)

    try {
      await recordGame(account.uid, game)
      accountData.reload()
      dailyLeaderboard.reload()
      allTimeLeaderboard.reload()
    } catch (error) {
      if (error instanceof Error && error.message === ALREADY_PLAYED) {
        toast.error("You already played today's challenge, so this attempt wasn't scored.")
        setFinished(null)
        accountData.reload()
        return
      }
      logUnexpectedError("gauntlet:save", error)
      toast.error("Failed to save result")
    }
  }

  const submitGuess = () => {
    if (!playing || currentGuess.length !== word.length) {
      toast.error(`Guess must be ${word.length} letters`)
      return
    }
    const next = [...guesses, currentGuess]
    setGuesses(next)
    setCurrentGuess("")
    if (currentGuess === word) void finishGame(next, true)
    else if (next.length >= MAX_ATTEMPTS) void finishGame(next, false)
  }

  const revealHint = () => {
    if (!playing || hintsUsed) return
    setHintsUsed(1)
    toast.info("Hint revealed! Check the hint below.")
  }

  if (!hydrated || authLoading || (uid && accountData.loading)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Today’s challenge</h2>
          <p className="text-muted-foreground">Daily puzzle challenge - {today}</p>
        </div>
        {stats && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1" aria-label="Current streak">
              <Flame className="h-3 w-3" />
              {stats.currentStreak}
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1"
              aria-label="Wins out of games played"
            >
              <Trophy className="h-3 w-3" />
              {stats.wins}/{stats.totalGames}
            </Badge>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="play">Play</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="play" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Challenge</CardTitle>
              <CardDescription>
                Guess the {word.length}-letter word. You have {MAX_ATTEMPTS} attempts!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!playing && !todayGame && (
                <div className="space-y-4 text-center">
                  <p className="text-muted-foreground">Ready to take on today's challenge?</p>
                  <Button onClick={startGame} size="lg">
                    Start Challenge
                  </Button>
                </div>
              )}

              {playing && (
                <>
                  <div className="mb-4 flex items-center justify-center gap-4">
                    {settings.showTimer && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {formatDuration(elapsed)}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      Attempts: {guesses.length}/{MAX_ATTEMPTS}
                    </Badge>
                    {settings.showHints && !hintsUsed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={revealHint}
                        className="flex items-center gap-1"
                      >
                        <Lightbulb className="h-3 w-3" />
                        Use Hint (-100 pts)
                      </Button>
                    )}
                  </div>

                  {hintsUsed > 0 && (
                    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
                      <CardContent className="pt-4">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <Lightbulb className="h-4 w-4" />
                          The word starts with "{word[0]}"
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <Board
                    word={word}
                    rows={rows}
                    guesses={guesses}
                    currentGuess={currentGuess}
                    animate={settings.animations}
                  />

                  <div className="flex gap-2">
                    <Input
                      aria-label="Your guess"
                      value={currentGuess}
                      onChange={(event) =>
                        setCurrentGuess(
                          event.target.value
                            .toUpperCase()
                            .replace(/[^A-Z]/g, "")
                            .slice(0, word.length)
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          settings.autoSubmit &&
                          currentGuess.length === word.length
                        ) {
                          submitGuess()
                        }
                      }}
                      placeholder={`Enter ${word.length} letters`}
                      maxLength={word.length}
                      className="text-center font-mono text-lg"
                      autoFocus
                    />
                    <Button onClick={submitGuess} disabled={currentGuess.length !== word.length}>
                      Submit
                    </Button>
                  </div>
                </>
              )}

              {todayGame && (
                <div className="space-y-4 text-center">
                  <div className="space-y-2">
                    {todayGame.result.completed ? (
                      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-6 w-6" />
                        <h3 className="text-2xl font-bold">Victory!</h3>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
                        <XCircle className="h-6 w-6" />
                        <h3 className="text-2xl font-bold">Challenge Failed</h3>
                      </div>
                    )}
                    <p className="text-muted-foreground">
                      The word was: <strong>{word}</strong>
                    </p>
                  </div>

                  {rows.length > 0 && (
                    <Board word={word} rows={rows} guesses={shownGuesses} animate={false} />
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <StatTile label="Attempts" value={todayGame.result.attempts} />
                    <StatTile label="Time" value={formatDuration(todayGame.result.time)} />
                    <StatTile label="Score" value={todayGame.result.score} />
                  </div>

                  {rows.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        copyText(shareText(todayGame.result, rows), "Result copied to clipboard!")
                      }
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Result
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground">A new word arrives at midnight UTC.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="alltime">All-Time</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              <LeaderboardCard
                icon={<Trophy className="h-5 w-5" />}
                title="Daily Leaderboard"
                description={today}
                entries={dailyLeaderboard.data ?? []}
                currentUserId={uid}
              />
            </TabsContent>
            <TabsContent value="alltime">
              <LeaderboardCard
                icon={<TrendingUp className="h-5 w-5" />}
                title="All-Time Leaderboard"
                description="Top players by total score"
                entries={allTimeLeaderboard.data ?? []}
                currentUserId={uid}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {!stats ? (
            <Card>
              <CardContent className="space-y-4 py-12 text-center">
                <p className="text-muted-foreground">Sign in to view your statistics</p>
                <Button onClick={() => setAuthDialogOpen(true)}>Sign In</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatTile label="Games Played" value={stats.totalGames} />
                <StatTile label="Wins" value={stats.wins} />
                <StatTile label="Current Streak" value={stats.currentStreak} />
                <StatTile label="Best Streak" value={stats.bestStreak} />
                <StatTile label="Avg Score" value={stats.averageScore} />
                <StatTile label="Total Score" value={stats.totalScore} />
                <StatTile
                  label="Fastest Time"
                  value={stats.fastestTime > 0 ? formatDuration(stats.fastestTime) : "N/A"}
                />
                <StatTile label="Perfect Games" value={stats.perfectGames} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">No history yet</p>
                  ) : (
                    <div className="space-y-2">
                      {history.map((result) => (
                        <div
                          key={result.date}
                          className="flex items-center justify-between rounded-lg border bg-muted/50 p-3"
                        >
                          <div>
                            <div className="font-medium">{result.date}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.completed ? "Completed" : "Failed"} • {result.attempts} attempts •{" "}
                              {formatDuration(result.time)}
                            </div>
                          </div>
                          <Badge variant="outline" className="font-bold">
                            {result.score}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </motion.div>
  )
}

const TILE_STYLES: Record<LetterResult | "typed" | "empty", string> = {
  correct: "border-green-600 bg-green-500 text-white",
  present: "border-yellow-600 bg-yellow-500 text-white",
  absent: "border-gray-600 bg-gray-500 text-white",
  typed: "border-gray-400 bg-white dark:border-gray-600 dark:bg-gray-800",
  empty: "border-gray-300 dark:border-gray-700",
}

function Board({
  word,
  rows,
  guesses,
  currentGuess = "",
  animate,
}: {
  word: string
  rows: LetterResult[][]
  guesses: string[]
  currentGuess?: string
  animate: boolean
}) {
  return (
    <div className="space-y-2" role="grid" aria-label="Guesses">
      {Array.from({ length: MAX_ATTEMPTS }, (_, rowIndex) => {
        const guess = rowIndex === guesses.length ? currentGuess : (guesses[rowIndex] ?? "")
        return (
          <div key={rowIndex} className="flex justify-center gap-2" role="row">
            {Array.from({ length: word.length }, (_, column) => {
              const letter = guess[column] ?? ""
              const state = rows[rowIndex]?.[column]
              const className = `flex h-12 w-12 items-center justify-center rounded-md border-2 text-xl font-bold ${
                TILE_STYLES[state ?? (letter ? "typed" : "empty")]
              }`
              return animate ? (
                <motion.div
                  key={column}
                  role="gridcell"
                  initial={false}
                  animate={{ scale: letter ? [1, 1.1, 1] : 1, rotate: state ? [0, 5, -5, 0] : 0 }}
                  transition={{ duration: 0.3 }}
                  className={className}
                >
                  {letter}
                </motion.div>
              ) : (
                <div key={column} role="gridcell" className={className}>
                  {letter}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

const MEDALS = ["🥇", "🥈", "🥉"]

function LeaderboardCard({
  icon,
  title,
  description,
  entries,
  currentUserId,
}: {
  icon: React.ReactNode
  title: string
  description: string
  entries: LeaderboardEntry[]
  currentUserId: string | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No entries yet</p>
        ) : (
          <ol className="space-y-2">
            {entries.map((entry, index) => {
              const isYou = entry.userId === currentUserId
              return (
                <li
                  key={entry.userId}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isYou ? "border-primary bg-primary/10" : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center font-bold">{MEDALS[index] ?? `#${index + 1}`}</div>
                    <div>
                      <div className="font-medium">
                        {entry.displayName}
                        {isYou && " (You)"}
                      </div>
                      {entry.detail && <div className="text-xs text-muted-foreground">{entry.detail}</div>}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-bold">
                    {entry.score}
                  </Badge>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
