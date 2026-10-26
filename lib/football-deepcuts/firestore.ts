import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore"
import type { User } from "firebase/auth"
import { db } from "@/lib/firebase/config"

export interface LeaderboardEntry {
  userId: string
  displayName: string
  date: string
  score: number
  questionScores: number[]
  registered: boolean
  createdAt?: unknown
}
export interface DeepcutsStats {
  gamesPlayed: number
  currentStreak: number
  longestStreak: number
  averageScore: number
  bestScore: number
  totalPoints: number
  hundredPointAnswers: number
  perfectGames: number
  lastPlayedDate: string
}
export interface StoredGame {
  date: string
  score: number
  answers: Array<{
    questionId: string
    playerId: string
    playerName: string
    correct: boolean
    points: number
    appearances?: number[]
  }>
}

export async function loadDailyLeaderboard(date: string): Promise<LeaderboardEntry[]> {
  const snapshot = await getDocs(
    query(collection(db, "deepcutsDailyLeaderboard"), where("date", "==", date), limit(500))
  )
  return snapshot.docs
    .map((entry) => entry.data() as LeaderboardEntry)
    .sort((a, b) => b.score - a.score || String(a.createdAt).localeCompare(String(b.createdAt)))
}

export async function loadStoredGame(uid: string, date: string): Promise<StoredGame | null> {
  const snapshot = await getDoc(doc(db, "users", uid, "deepcutsResults", date))
  return snapshot.exists() ? (snapshot.data() as StoredGame) : null
}

export async function saveCompletedGame(user: User, game: StoredGame): Promise<void> {
  const resultRef = doc(db, "users", user.uid, "deepcutsResults", game.date)
  const statsRef = doc(db, "users", user.uid, "deepcutsStats", "summary")
  await runTransaction(db, async (transaction) => {
    const result = await transaction.get(resultRef)
    if (result.exists()) return
    if (user.isAnonymous) {
      transaction.set(resultRef, { ...game, createdAt: serverTimestamp() })
      return
    }
    const statsDocument = await transaction.get(statsRef)
    const previous = statsDocument.exists() ? (statsDocument.data() as DeepcutsStats) : undefined
    const gamesPlayed = (previous?.gamesPlayed ?? 0) + 1
    const totalPoints = (previous?.totalPoints ?? 0) + game.score
    const yesterday = new Date(`${game.date}T00:00:00Z`)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const currentStreak =
      previous?.lastPlayedDate === yesterday.toISOString().slice(0, 10) ? previous.currentStreak + 1 : 1
    const stats: DeepcutsStats = {
      gamesPlayed,
      currentStreak,
      longestStreak: Math.max(previous?.longestStreak ?? 0, currentStreak),
      averageScore: Math.round(totalPoints / gamesPlayed),
      bestScore: Math.max(previous?.bestScore ?? 0, game.score),
      totalPoints,
      hundredPointAnswers:
        (previous?.hundredPointAnswers ?? 0) + game.answers.filter((answer) => answer.points === 100).length,
      perfectGames: (previous?.perfectGames ?? 0) + (game.score === 500 ? 1 : 0),
      lastPlayedDate: game.date,
    }
    transaction.set(resultRef, { ...game, createdAt: serverTimestamp() })
    transaction.set(statsRef, { ...stats, updatedAt: serverTimestamp() })
  })
}

export async function publishLeaderboardEntry(
  user: User,
  displayName: string,
  game: StoredGame
): Promise<void> {
  const cleanName = displayName.trim().replace(/\s+/g, " ")
  if (cleanName.length < 2 || cleanName.length > 24)
    throw new Error("Name must be between 2 and 24 characters")
  const entryRef = doc(db, "deepcutsDailyLeaderboard", `${game.date}_${user.uid}`)
  await setDoc(entryRef, {
    userId: user.uid,
    displayName: cleanName,
    date: game.date,
    score: game.score,
    questionScores: game.answers.map(({ points }) => points),
    registered: !user.isAnonymous,
    createdAt: serverTimestamp(),
  })
}

export async function loadStats(uid: string): Promise<DeepcutsStats | null> {
  const snapshot = await getDoc(doc(db, "users", uid, "deepcutsStats", "summary"))
  return snapshot.exists() ? (snapshot.data() as DeepcutsStats) : null
}
