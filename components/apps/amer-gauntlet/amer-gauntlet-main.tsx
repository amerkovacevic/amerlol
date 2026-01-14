"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Trophy,
  Clock,
  Target,
  Zap,
  Share2,
  History,
  Lightbulb,
  Timer,
  Flame,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Minus,
  RefreshCw,
  Award,
  Star
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { db } from "@/lib/firebase/config"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Word list for daily puzzles (deterministic based on date)
const WORD_LIST = [
  "GAUNT", "SHIELD", "SWORD", "QUEST", "KNIGHT", "DRAGON", "CASTLE", "HERO",
  "MAGIC", "POWER", "BRAVE", "HONOR", "GLORY", "VICTOR", "CHAMP", "LEGEND",
  "MIGHT", "FORCE", "STORM", "FLAME", "THUNDER", "LIGHT", "DARK", "SHADOW",
  "GUARD", "DEFEND", "ATTACK", "STRIKE", "BLADE", "ARMOR", "BATTLE", "WAR",
  "PEACE", "HOPE", "FAITH", "TRUTH", "WISDOM", "COURAGE", "STRENGTH", "SPIRIT"
]

// Generate daily word based on date (deterministic)
function getDailyWord(date: Date): string {
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  const seed = dateStr.split('-').join('')
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash = hash & hash
  }
  const index = Math.abs(hash) % WORD_LIST.length
  return WORD_LIST[index]
}

// Check guess against word
function checkGuess(guess: string, word: string): Array<'correct' | 'present' | 'absent'> {
  const result: Array<'correct' | 'present' | 'absent'> = []
  const wordArray = word.split('')
  const guessArray = guess.split('')
  const used = new Array(word.length).fill(false)

  // First pass: mark correct positions
  for (let i = 0; i < guessArray.length; i++) {
    if (guessArray[i] === wordArray[i]) {
      result[i] = 'correct'
      used[i] = true
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < guessArray.length; i++) {
    if (result[i] === 'correct') continue
    const letter = guessArray[i]
    const index = wordArray.findIndex((w, idx) => w === letter && !used[idx])
    if (index !== -1) {
      result[i] = 'present'
      used[index] = true
    } else {
      result[i] = 'absent'
    }
  }

  return result
}

interface GameResult {
  date: string
  word: string
  attempts: number
  time: number
  completed: boolean
  score: number
  hintsUsed: number
}

interface LeaderboardEntry {
  userId: string
  displayName: string
  score: number
  attempts: number
  time: number
  date: string
  rank?: number
}

interface UserStats {
  totalGames: number
  wins: number
  currentStreak: number
  bestStreak: number
  averageScore: number
  totalScore: number
  fastestTime: number
  perfectGames: number
}

export function AmerGauntletMain() {
  const { user, loading: authLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<"play" | "leaderboard" | "stats">("play")
  
  // Game state
  const [dailyWord, setDailyWord] = React.useState("")
  const [currentGuess, setCurrentGuess] = React.useState("")
  const [guesses, setGuesses] = React.useState<string[]>([])
  const [results, setResults] = React.useState<Array<Array<'correct' | 'present' | 'absent'>>>([])
  const [gameStarted, setGameStarted] = React.useState(false)
  const [gameCompleted, setGameCompleted] = React.useState(false)
  const [startTime, setStartTime] = React.useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = React.useState(0)
  const [hintsUsed, setHintsUsed] = React.useState(0)
  const [hintRevealed, setHintRevealed] = React.useState(false)
  const [showHint, setShowHint] = React.useState(false)
  const [todayResult, setTodayResult] = React.useState<GameResult | null>(null)
  
  // Leaderboard state
  const [dailyLeaderboard, setDailyLeaderboard] = React.useState<LeaderboardEntry[]>([])
  const [allTimeLeaderboard, setAllTimeLeaderboard] = React.useState<LeaderboardEntry[]>([])
  const [userStats, setUserStats] = React.useState<UserStats | null>(null)
  const [history, setHistory] = React.useState<GameResult[]>([])
  const [settings, setSettings] = React.useState({
    showTimer: true,
    showHints: true,
    soundEffects: false,
    animations: true,
    difficulty: "normal" as "easy" | "normal" | "hard",
    autoSubmit: false,
  })

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Load settings
  React.useEffect(() => {
    if (!user) {
      setSettings({
        showTimer: true,
        showHints: true,
        soundEffects: false,
        animations: true,
        difficulty: "normal",
        autoSubmit: false,
      })
      return
    }

    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, "users", user.uid, "amerGauntletSettings", "default")
        const settingsDoc = await getDoc(settingsRef)
        if (settingsDoc.exists()) {
          const data = settingsDoc.data()
          setSettings({
            showTimer: data.showTimer ?? true,
            showHints: data.showHints ?? true,
            soundEffects: data.soundEffects ?? false,
            animations: data.animations ?? true,
            difficulty: data.difficulty ?? "normal",
            autoSubmit: data.autoSubmit ?? false,
          })
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }

    loadSettings()
  }, [user])

  // Initialize game
  React.useEffect(() => {
    const word = getDailyWord(today)
    setDailyWord(word)
    loadTodayResult()
    loadLeaderboards()
    if (user) {
      loadUserStats()
      loadHistory()
    }
    setLoading(false)
  }, [user, todayStr])

  // Timer
  React.useEffect(() => {
    if (gameStarted && !gameCompleted && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [gameStarted, gameCompleted, startTime])

  const loadTodayResult = async () => {
    if (!user) return

    try {
      const resultRef = doc(db, "users", user.uid, "amerGauntletResults", todayStr)
      const resultDoc = await getDoc(resultRef)
      if (resultDoc.exists()) {
        const data = resultDoc.data()
        setTodayResult({
          date: data.date,
          word: data.word,
          attempts: data.attempts,
          time: data.time,
          completed: data.completed,
          score: data.score,
          hintsUsed: data.hintsUsed || 0,
        })
        setGameCompleted(data.completed)
        if (data.completed) {
          setGuesses(data.guesses || [])
          setResults(data.results || [])
        }
      }
    } catch (error) {
      console.error("Failed to load today's result:", error)
    }
  }

  const loadLeaderboards = async () => {
    try {
      // Daily leaderboard
      const dailyRef = collection(db, "amerGauntletDailyLeaderboard")
      try {
        const dailyQuery = query(
          dailyRef,
          where("date", "==", todayStr),
          orderBy("score", "desc"),
          orderBy("time", "asc"),
          limit(100)
        )
        const dailySnapshot = await getDocs(dailyQuery)
        const dailyEntries: LeaderboardEntry[] = []
        dailySnapshot.forEach((doc) => {
          const data = doc.data()
          dailyEntries.push({
            userId: data.userId,
            displayName: data.displayName || "Anonymous",
            score: data.score,
            attempts: data.attempts,
            time: data.time,
            date: data.date,
          })
        })
        setDailyLeaderboard(dailyEntries.map((entry, idx) => ({ ...entry, rank: idx + 1 })))
      } catch (dailyError: any) {
        // If composite index doesn't exist, try simpler query
        if (dailyError.code === 'failed-precondition') {
          console.warn("Composite index may be missing. Loading without time ordering.")
          const simpleQuery = query(
            dailyRef,
            where("date", "==", todayStr),
            orderBy("score", "desc"),
            limit(100)
          )
          const dailySnapshot = await getDocs(simpleQuery)
          const dailyEntries: LeaderboardEntry[] = []
          dailySnapshot.forEach((doc) => {
            const data = doc.data()
            dailyEntries.push({
              userId: data.userId,
              displayName: data.displayName || "Anonymous",
              score: data.score,
              attempts: data.attempts,
              time: data.time,
              date: data.date,
            })
          })
          // Sort by time manually as fallback
          dailyEntries.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score
            return a.time - b.time
          })
          setDailyLeaderboard(dailyEntries.map((entry, idx) => ({ ...entry, rank: idx + 1 })))
        } else {
          throw dailyError
        }
      }

      // All-time leaderboard
      try {
        const allTimeRef = collection(db, "amerGauntletAllTimeLeaderboard")
        const allTimeQuery = query(allTimeRef, orderBy("totalScore", "desc"), limit(100))
        const allTimeSnapshot = await getDocs(allTimeQuery)
        const allTimeEntries: LeaderboardEntry[] = []
        allTimeSnapshot.forEach((doc) => {
          const data = doc.data()
          allTimeEntries.push({
            userId: data.userId,
            displayName: data.displayName || "Anonymous",
            score: data.totalScore,
            attempts: 0,
            time: 0,
            date: "",
          })
        })
        setAllTimeLeaderboard(allTimeEntries.map((entry, idx) => ({ ...entry, rank: idx + 1 })))
      } catch (allTimeError: any) {
        console.error("Failed to load all-time leaderboard:", allTimeError)
        // Set empty array on error
        setAllTimeLeaderboard([])
      }
    } catch (error) {
      console.error("Failed to load leaderboards:", error)
      // Set empty arrays on error
      setDailyLeaderboard([])
      setAllTimeLeaderboard([])
    }
  }

  const loadUserStats = async () => {
    if (!user) return

    try {
      const statsRef = doc(db, "users", user.uid, "amerGauntletStats", "default")
      const statsDoc = await getDoc(statsRef)
      if (statsDoc.exists()) {
        const data = statsDoc.data()
        setUserStats({
          totalGames: data.totalGames || 0,
          wins: data.wins || 0,
          currentStreak: data.currentStreak || 0,
          bestStreak: data.bestStreak || 0,
          averageScore: data.averageScore || 0,
          totalScore: data.totalScore || 0,
          fastestTime: data.fastestTime || 0,
          perfectGames: data.perfectGames || 0,
        })
      } else {
        setUserStats({
          totalGames: 0,
          wins: 0,
          currentStreak: 0,
          bestStreak: 0,
          averageScore: 0,
          totalScore: 0,
          fastestTime: 0,
          perfectGames: 0,
        })
      }
    } catch (error) {
      console.error("Failed to load user stats:", error)
    }
  }

  const loadHistory = async () => {
    if (!user) return

    try {
      const historyRef = collection(db, "users", user.uid, "amerGauntletResults")
      const historyQuery = query(historyRef, orderBy("date", "desc"), limit(30))
      const snapshot = await getDocs(historyQuery)
      const historyData: GameResult[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        historyData.push({
          date: data.date,
          word: data.word,
          attempts: data.attempts,
          time: data.time,
          completed: data.completed,
          score: data.score,
          hintsUsed: data.hintsUsed || 0,
        })
      })
      setHistory(historyData)
    } catch (error) {
      console.error("Failed to load history:", error)
    }
  }

  const startGame = () => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }
    setGameStarted(true)
    setStartTime(Date.now())
    setElapsedTime(0)
    setGuesses([])
    setResults([])
    setCurrentGuess("")
    setGameCompleted(false)
    setHintsUsed(0)
    setHintRevealed(false)
    setShowHint(false)
  }

  const submitGuess = () => {
    if (!gameStarted || gameCompleted) return
    if (currentGuess.length !== dailyWord.length) {
      toast.error(`Guess must be ${dailyWord.length} letters`)
      return
    }
    if (currentGuess.length > 0) {
      // Convert to uppercase for consistency
      const guess = currentGuess.toUpperCase()
      const result = checkGuess(guess, dailyWord)
      
      const newGuesses = [...guesses, guess]
      const newResults = [...results, result]
      
      setGuesses(newGuesses)
      setResults(newResults)
      setCurrentGuess("")

      const newAttempts = newGuesses.length
      if (guess === dailyWord) {
        completeGame(newAttempts, true, newGuesses, newResults)
      } else if (newAttempts >= 6) {
        // Max attempts reached
        completeGame(newAttempts, false, newGuesses, newResults)
      }
    }
  }

  const completeGame = async (
    attempts: number,
    won: boolean = true,
    finalGuesses: string[] = guesses,
    finalResults: Array<Array<'correct' | 'present' | 'absent'>> = results
  ) => {
    if (!user) return

    const finalTime = elapsedTime
    setGameCompleted(true)
    setGameStarted(false)

    // Calculate score: base score - time penalty - attempt penalty - hint penalty
    const baseScore = won ? 1000 : 0
    const timePenalty = Math.floor(finalTime / 10) // 1 point per 10 seconds
    const attemptPenalty = (attempts - 1) * 50 // 50 points per attempt
    const hintPenalty = hintsUsed * 100 // 100 points per hint
    const score = Math.max(0, baseScore - timePenalty - attemptPenalty - hintPenalty)

    const result: GameResult = {
      date: todayStr,
      word: dailyWord,
      attempts,
      time: finalTime,
      completed: won,
      score,
      hintsUsed,
    }

    setTodayResult(result)

    try {
      // Save result
      const resultRef = doc(db, "users", user.uid, "amerGauntletResults", todayStr)
      await setDoc(resultRef, {
        ...result,
        guesses: finalGuesses,
        results: finalResults,
        createdAt: serverTimestamp(),
      })

      // Update daily leaderboard
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const displayName = userDoc.data()?.displayName || "Anonymous"
      
      const dailyLeaderboardRef = doc(db, "amerGauntletDailyLeaderboard", `${todayStr}_${user.uid}`)
      await setDoc(dailyLeaderboardRef, {
        userId: user.uid,
        displayName,
        date: todayStr,
        score,
        attempts,
        time: finalTime,
        word: dailyWord,
        createdAt: serverTimestamp(),
      })

      // Update all-time leaderboard
      const allTimeRef = doc(db, "amerGauntletAllTimeLeaderboard", user.uid)
      const allTimeDoc = await getDoc(allTimeRef)
      if (allTimeDoc.exists()) {
        const currentTotal = allTimeDoc.data().totalScore || 0
        await updateDoc(allTimeRef, {
          totalScore: currentTotal + score,
          displayName,
          updatedAt: serverTimestamp(),
        })
      } else {
        await setDoc(allTimeRef, {
          userId: user.uid,
          displayName,
          totalScore: score,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      // Update user stats
      const statsRef = doc(db, "users", user.uid, "amerGauntletStats", "default")
      const statsDoc = await getDoc(statsRef)
      if (statsDoc.exists()) {
        const stats = statsDoc.data()
        const newTotalGames = (stats.totalGames || 0) + 1
        const newWins = won ? (stats.wins || 0) + 1 : (stats.wins || 0)
        const lastDate = stats.lastPlayedDate || ""
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        const newStreak = lastDate === yesterdayStr ? (stats.currentStreak || 0) + 1 : (won ? 1 : 0)
        const newBestStreak = Math.max(newStreak, stats.bestStreak || 0)
        const newTotalScore = (stats.totalScore || 0) + score
        const newAverageScore = Math.floor(newTotalScore / newTotalGames)
        const newFastestTime = stats.fastestTime && stats.fastestTime > 0 
          ? Math.min(stats.fastestTime, finalTime) 
          : finalTime
        const newPerfectGames = attempts === 1 ? (stats.perfectGames || 0) + 1 : (stats.perfectGames || 0)

        await updateDoc(statsRef, {
          totalGames: newTotalGames,
          wins: newWins,
          currentStreak: newStreak,
          bestStreak: newBestStreak,
          averageScore: newAverageScore,
          totalScore: newTotalScore,
          fastestTime: newFastestTime,
          perfectGames: newPerfectGames,
          lastPlayedDate: todayStr,
          updatedAt: serverTimestamp(),
        })
      } else {
        await setDoc(statsRef, {
          totalGames: 1,
          wins: won ? 1 : 0,
          currentStreak: won ? 1 : 0,
          bestStreak: won ? 1 : 0,
          averageScore: score,
          totalScore: score,
          fastestTime: finalTime,
          perfectGames: attempts === 1 ? 1 : 0,
          lastPlayedDate: todayStr,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      loadUserStats()
      loadLeaderboards()
      loadHistory()

      if (won) {
        toast.success(`Congratulations! You solved it in ${attempts} attempt${attempts !== 1 ? 's' : ''}!`)
      } else {
        toast.error(`The word was: ${dailyWord}`)
      }
    } catch (error) {
      console.error("Failed to save result:", error)
      toast.error("Failed to save result")
    }
  }

  const useHint = () => {
    if (!gameStarted || gameCompleted || hintRevealed) return
    if (!user) {
      setAuthDialogOpen(true)
      return
    }
    setHintsUsed(hintsUsed + 1)
    setHintRevealed(true)
    setShowHint(true)
    toast.info("Hint revealed! Check the hint below.")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const shareResult = () => {
    if (!todayResult || !todayResult.completed) {
      toast.error("No completed game to share")
      return
    }
    
    // Use saved results from state, or fallback to empty array
    const resultsToShare = results.length > 0 ? results : []
    
    if (resultsToShare.length === 0) {
      toast.error("Unable to share: results not available")
      return
    }
    
    const emojiMap: Record<'correct' | 'present' | 'absent', string> = {
      correct: '🟩',
      present: '🟨',
      absent: '⬛',
    }
    
    let shareText = `Amer Gauntlet ${todayStr}\n`
    shareText += `Attempts: ${todayResult.attempts}/6\n`
    shareText += `Time: ${formatTime(todayResult.time)}\n`
    shareText += `Score: ${todayResult.score}\n\n`
    
    resultsToShare.forEach((result) => {
      shareText += result.map(r => emojiMap[r]).join('') + '\n'
    })
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(() => {
        toast.success("Result copied to clipboard!")
      }).catch(() => {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement("textarea")
        textArea.value = shareText
        textArea.style.position = "fixed"
        textArea.style.opacity = "0"
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          toast.success("Result copied to clipboard!")
        } catch (err) {
          toast.error("Failed to copy to clipboard")
        }
        document.body.removeChild(textArea)
      })
    } else {
      toast.error("Clipboard not supported in this browser")
    }
  }

  const getHint = () => {
    if (!hintRevealed) return null
    // Reveal first letter
    return `The word starts with "${dailyWord[0]}"`
  }

  if (loading || authLoading) {
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
          <h1 className="text-3xl font-bold">Amer Gauntlet</h1>
          <p className="text-muted-foreground">Daily puzzle challenge - {todayStr}</p>
        </div>
        {user && userStats && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Flame className="h-3 w-3" />
              {userStats.currentStreak}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              {userStats.wins}/{userStats.totalGames}
            </Badge>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
                Guess the {dailyWord.length}-letter word. You have 6 attempts!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!gameStarted && !gameCompleted && (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Ready to take on today's challenge?
                  </p>
                  <Button onClick={startGame} size="lg">
                    Start Challenge
                  </Button>
                </div>
              )}

              {gameStarted && !gameCompleted && (
                <>
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {settings.showTimer && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {formatTime(elapsedTime)}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      Attempts: {guesses.length}/6
                    </Badge>
                    {settings.showHints && !hintRevealed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={useHint}
                        className="flex items-center gap-1"
                      >
                        <Lightbulb className="h-3 w-3" />
                        Use Hint (-100 pts)
                      </Button>
                    )}
                  </div>

                  {showHint && getHint() && (
                    <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          {getHint()}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, rowIdx) => {
                      const guess = guesses[rowIdx] || ""
                      const result = results[rowIdx] || []
                      const isCurrentRow = rowIdx === guesses.length

                      return (
                        <div
                          key={rowIdx}
                          className="flex gap-2 justify-center"
                        >
                          {Array.from({ length: dailyWord.length }).map((_, colIdx) => {
                            const letter = isCurrentRow && colIdx < currentGuess.length
                              ? currentGuess[colIdx]
                              : guess[colIdx] || ""
                            const state = result[colIdx]

                            const className = `
                              w-12 h-12 border-2 rounded-md flex items-center justify-center text-xl font-bold
                              ${!letter
                                ? "border-gray-300 dark:border-gray-700"
                                : state === 'correct'
                                ? "bg-green-500 border-green-600 text-white"
                                : state === 'present'
                                ? "bg-yellow-500 border-yellow-600 text-white"
                                : state === 'absent'
                                ? "bg-gray-500 border-gray-600 text-white"
                                : "border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800"
                              }
                            `

                            return settings.animations ? (
                              <motion.div
                                key={colIdx}
                                initial={false}
                                animate={{
                                  scale: letter ? [1, 1.1, 1] : 1,
                                  rotate: state ? [0, 5, -5, 0] : 0,
                                }}
                                transition={{ duration: 0.3 }}
                                className={className}
                              >
                                {letter.toUpperCase()}
                              </motion.div>
                            ) : (
                              <div key={colIdx} className={className}>
                                {letter.toUpperCase()}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={currentGuess}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
                        if (val.length <= dailyWord.length) {
                          setCurrentGuess(val)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (settings.autoSubmit && currentGuess.length === dailyWord.length) {
                            submitGuess()
                          } else if (!settings.autoSubmit) {
                            submitGuess()
                          }
                        }
                      }}
                      placeholder={`Enter ${dailyWord.length} letters`}
                      maxLength={dailyWord.length}
                      className="text-center text-lg font-mono"
                      autoFocus
                    />
                    <Button onClick={submitGuess} disabled={currentGuess.length !== dailyWord.length}>
                      Submit
                    </Button>
                  </div>
                </>
              )}

              {gameCompleted && todayResult && (
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    {todayResult.completed ? (
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
                    <p className="text-muted-foreground">The word was: <strong>{dailyWord}</strong></p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{todayResult.attempts}</div>
                        <div className="text-xs text-muted-foreground">Attempts</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{formatTime(todayResult.time)}</div>
                        <div className="text-xs text-muted-foreground">Time</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{todayResult.score}</div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={shareResult}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Result
                    </Button>
                    <Button onClick={() => {
                      setGameCompleted(false)
                      setGameStarted(false)
                      setGuesses([])
                      setResults([])
                      setCurrentGuess("")
                      setTodayResult(null)
                    }}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Play Again
                    </Button>
                  </div>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Daily Leaderboard
                  </CardTitle>
                  <CardDescription>{todayStr}</CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyLeaderboard.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No entries yet</p>
                  ) : (
                    <div className="space-y-2">
                      {dailyLeaderboard.map((entry, idx) => (
                        <div
                          key={entry.userId}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            user && entry.userId === user.uid
                              ? "bg-primary/10 border-primary"
                              : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 text-center font-bold">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${entry.rank}`}
                            </div>
                            <div>
                              <div className="font-medium">
                                {entry.displayName}
                                {user && entry.userId === user.uid && " (You)"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {entry.attempts} attempts • {formatTime(entry.time)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="font-bold">
                            {entry.score}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alltime">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    All-Time Leaderboard
                  </CardTitle>
                  <CardDescription>Top players by total score</CardDescription>
                </CardHeader>
                <CardContent>
                  {allTimeLeaderboard.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No entries yet</p>
                  ) : (
                    <div className="space-y-2">
                      {allTimeLeaderboard.map((entry, idx) => (
                        <div
                          key={entry.userId}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            user && entry.userId === user.uid
                              ? "bg-primary/10 border-primary"
                              : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 text-center font-bold">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${entry.rank}`}
                            </div>
                            <div className="font-medium">
                              {entry.displayName}
                              {user && entry.userId === user.uid && " (You)"}
                            </div>
                          </div>
                          <Badge variant="outline" className="font-bold">
                            {entry.score}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {!user ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <p className="text-muted-foreground">Sign in to view your statistics</p>
                <Button onClick={() => setAuthDialogOpen(true)}>Sign In</Button>
              </CardContent>
            </Card>
          ) : userStats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{userStats.totalGames}</div>
                    <div className="text-xs text-muted-foreground">Games Played</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{userStats.wins}</div>
                    <div className="text-xs text-muted-foreground">Wins</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold flex items-center gap-1">
                      <Flame className="h-5 w-5" />
                      {userStats.currentStreak}
                    </div>
                    <div className="text-xs text-muted-foreground">Current Streak</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{userStats.bestStreak}</div>
                    <div className="text-xs text-muted-foreground">Best Streak</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{userStats.averageScore}</div>
                    <div className="text-xs text-muted-foreground">Avg Score</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{userStats.totalScore}</div>
                    <div className="text-xs text-muted-foreground">Total Score</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">
                      {userStats.fastestTime > 0 ? formatTime(userStats.fastestTime) : "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground">Fastest Time</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{userStats.perfectGames}</div>
                    <div className="text-xs text-muted-foreground">Perfect Games</div>
                  </CardContent>
                </Card>
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
                    <p className="text-center text-muted-foreground py-8">No history yet</p>
                  ) : (
                    <div className="space-y-2">
                      {history.map((result) => (
                        <div
                          key={result.date}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                        >
                          <div>
                            <div className="font-medium">{result.date}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.completed ? "Completed" : "Failed"} • {result.attempts} attempts • {formatTime(result.time)}
                            </div>
                          </div>
                          <Badge variant={result.completed ? "default" : "destructive"}>
                            {result.score} pts
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading statistics...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </motion.div>
  )
}
