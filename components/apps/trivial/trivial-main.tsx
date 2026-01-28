"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Brain, 
  Check, 
  Play,
  Settings2,
  Clock,
  Trophy,
  Target,
  Users,
  Copy,
  Share2,
  Crown,
  X,
  Plus,
  Minus
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { db } from "@/lib/firebase/config"
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"

// Trivia categories
export interface TriviaCategory {
  id: string
  name: string
  description: string
  icon?: string
  color: string
}

const TRIVIA_CATEGORIES: TriviaCategory[] = [
  {
    id: "general",
    name: "General Knowledge",
    description: "A mix of various topics",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "science",
    name: "Science",
    description: "Physics, chemistry, biology, and more",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "history",
    name: "History",
    description: "World history and historical events",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "geography",
    name: "Geography",
    description: "Countries, cities, landmarks, and more",
    color: "from-teal-500 to-blue-500",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    description: "Movies, TV shows, music, and celebrities",
    color: "from-pink-500 to-rose-500",
  },
  {
    id: "sports",
    name: "Sports",
    description: "Athletics, teams, and sporting events",
    color: "from-red-500 to-orange-500",
  },
  {
    id: "technology",
    name: "Technology",
    description: "Computers, internet, and tech innovations",
    color: "from-purple-500 to-indigo-500",
  },
  {
    id: "literature",
    name: "Literature",
    description: "Books, authors, and literary works",
    color: "from-violet-500 to-purple-500",
  },
  {
    id: "food",
    name: "Food & Drink",
    description: "Cuisines, recipes, and beverages",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "animals",
    name: "Animals",
    description: "Wildlife, pets, and nature",
    color: "from-yellow-500 to-amber-500",
  },
]

// Scoring methods
export type ScoringMethod = "points" | "time" | "speed" | "accuracy"
export type CategoryMode = "include" | "exclude" | "none"

export interface Participant {
  uid: string
  displayName: string
  joinedAt: Timestamp
}

export interface TrivialRoom {
  id: string
  leaderId: string
  leaderName: string
  participants: Participant[]
  includedCategories: string[]
  excludedCategories: string[]
  scoringMethod: ScoringMethod
  questionsPerRound: number
  timeLimit?: number | null
  status: "lobby" | "playing" | "finished"
  createdAt: Timestamp
  updatedAt: Timestamp
}

export function TrivialMain() {
  const { user } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [roomId, setRoomId] = React.useState<string | null>(null)
  const [room, setRoom] = React.useState<TrivialRoom | null>(null)
  const [isLeader, setIsLeader] = React.useState(false)
  const [includedCategories, setIncludedCategories] = React.useState<string[]>([])
  const [excludedCategories, setExcludedCategories] = React.useState<string[]>([])
  const [scoringMethod, setScoringMethod] = React.useState<ScoringMethod>("points")
  const [questionsPerRound, setQuestionsPerRound] = React.useState(10)
  const [timeLimit, setTimeLimit] = React.useState<number | undefined>(undefined)
  const [displayName, setDisplayName] = React.useState("")

  // Check URL for room ID
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const roomParam = params.get("room")
      if (roomParam) {
        setRoomId(roomParam)
        joinRoom(roomParam)
      }
    }
  }, [])

  // Load user display name
  React.useEffect(() => {
    if (user) {
      loadUserDisplayName()
    }
  }, [user])

  // Subscribe to room updates
  React.useEffect(() => {
    if (!roomId) return

    const roomRef = doc(db, "trivialRooms", roomId)
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomData = { id: snapshot.id, ...snapshot.data() } as TrivialRoom
        setRoom(roomData)
        setIsLeader(user?.uid === roomData.leaderId)
        
        if (isLeader) {
          setIncludedCategories(roomData.includedCategories || [])
          setExcludedCategories(roomData.excludedCategories || [])
          setScoringMethod(roomData.scoringMethod || "points")
          setQuestionsPerRound(roomData.questionsPerRound || 10)
          setTimeLimit(roomData.timeLimit ?? undefined)
        }
      } else {
        toast.error("Room not found")
        setRoomId(null)
        setRoom(null)
      }
    }, (error) => {
      console.error("Room subscription error:", error)
      toast.error("Failed to connect to room")
    })

    return () => unsubscribe()
  }, [roomId, user, isLeader])

  const loadUserDisplayName = async () => {
    if (!user) return

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setDisplayName(userData.displayName || userData.username || user.email?.split("@")[0] || "Anonymous")
      }
    } catch (error) {
      console.error("Failed to load display name:", error)
    }
  }

  const createRoom = async () => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    // Ensure display name is loaded
    if (!displayName) {
      await loadUserDisplayName()
    }

    try {
      const currentDisplayName = displayName || user.email?.split("@")[0] || "Anonymous"
      const newRoomRef = doc(collection(db, "trivialRooms"))
      const roomData: Omit<TrivialRoom, "id"> = {
        leaderId: user.uid,
        leaderName: currentDisplayName,
        participants: [{
          uid: user.uid,
          displayName: currentDisplayName,
          joinedAt: Timestamp.now(),
        }],
        includedCategories: [],
        excludedCategories: [],
        scoringMethod: "points",
        questionsPerRound: 10,
        timeLimit: null,
        status: "lobby",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      await setDoc(newRoomRef, roomData)

      const newRoomId = newRoomRef.id
      setRoomId(newRoomId)
      setIsLeader(true)
      
      // Update URL
      const newUrl = `${window.location.pathname}?room=${newRoomId}`
      window.history.pushState({}, "", newUrl)
      
      toast.success("Room created! Share the link to invite others.")
    } catch (error: any) {
      console.error("Failed to create room:", error)
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Please sign in.")
      } else {
        toast.error("Failed to create room")
      }
    }
  }

  const joinRoom = async (roomIdToJoin: string) => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    // Ensure display name is loaded
    if (!displayName) {
      await loadUserDisplayName()
    }

    try {
      const roomRef = doc(db, "trivialRooms", roomIdToJoin)
      const roomDoc = await getDoc(roomRef)

      if (!roomDoc.exists()) {
        toast.error("Room not found")
        return
      }

      const roomData = roomDoc.data() as TrivialRoom

      if (roomData.status !== "lobby") {
        toast.error("Game has already started")
        return
      }

      // Check if user is already in the room
      const isAlreadyParticipant = roomData.participants.some(p => p.uid === user.uid)
      
      if (!isAlreadyParticipant) {
        const currentDisplayName = displayName || user.email?.split("@")[0] || "Anonymous"
        const newParticipant: Participant = {
          uid: user.uid,
          displayName: currentDisplayName,
          joinedAt: Timestamp.now(),
        }

        await updateDoc(roomRef, {
          participants: [...roomData.participants, newParticipant],
          updatedAt: serverTimestamp(),
        })
      }

      setRoomId(roomIdToJoin)
      setIsLeader(user.uid === roomData.leaderId)
      
      toast.success("Joined room!")
    } catch (error: any) {
      console.error("Failed to join room:", error)
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Please sign in.")
      } else {
        toast.error("Failed to join room")
      }
    }
  }

  const leaveRoom = async () => {
    if (!user || !roomId || !room) return

    try {
      const roomRef = doc(db, "trivialRooms", roomId)
      
      if (isLeader) {
        // If leader leaves, delete the room
        await updateDoc(roomRef, {
          status: "finished",
          updatedAt: serverTimestamp(),
        })
        toast.info("Room closed")
      } else {
        // Remove participant
        const updatedParticipants = room.participants.filter(p => p.uid !== user.uid)
        await updateDoc(roomRef, {
          participants: updatedParticipants,
          updatedAt: serverTimestamp(),
        })
        toast.success("Left room")
      }

      setRoomId(null)
      setRoom(null)
      setIsLeader(false)
      window.history.pushState({}, "", window.location.pathname)
    } catch (error: any) {
      console.error("Failed to leave room:", error)
      toast.error("Failed to leave room")
    }
  }

  const updateRoomSettings = async () => {
    if (!roomId || !isLeader) return

    try {
      const roomRef = doc(db, "trivialRooms", roomId)
      await updateDoc(roomRef, {
        includedCategories,
        excludedCategories,
        scoringMethod,
        questionsPerRound,
        timeLimit: timeLimit || null,
        updatedAt: serverTimestamp(),
      })
      toast.success("Settings updated!")
    } catch (error: any) {
      console.error("Failed to update settings:", error)
      toast.error("Failed to update settings")
    }
  }

  const startGame = async () => {
    if (!roomId || !isLeader || !room) return

    if (includedCategories.length === 0 && excludedCategories.length === 0) {
      toast.error("Please configure categories first")
      return
    }

    if (room.participants.length < 1) {
      toast.error("Need at least one participant")
      return
    }

    try {
      const roomRef = doc(db, "trivialRooms", roomId)
      await updateDoc(roomRef, {
        status: "playing",
        updatedAt: serverTimestamp(),
      })
      toast.success("Game started!")
      // TODO: Implement game logic
    } catch (error: any) {
      console.error("Failed to start game:", error)
      toast.error("Failed to start game")
    }
  }

  const copyRoomLink = () => {
    if (!roomId) return

    const roomLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`
    navigator.clipboard.writeText(roomLink)
    toast.success("Room link copied!")
  }

  const shareRoomLink = async () => {
    if (!roomId) return

    const roomLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my Trivial game!",
          text: "Join my trivia game",
          url: roomLink,
        })
      } catch (error) {
        // User cancelled
      }
    } else {
      copyRoomLink()
    }
  }

  const toggleCategory = (categoryId: string, mode: CategoryMode) => {
    if (!isLeader) return

    if (mode === "include") {
      setIncludedCategories((prev) =>
        prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId]
      )
      // Remove from excluded if present
      setExcludedCategories((prev) => prev.filter((id) => id !== categoryId))
    } else if (mode === "exclude") {
      setExcludedCategories((prev) =>
        prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId]
      )
      // Remove from included if present
      setIncludedCategories((prev) => prev.filter((id) => id !== categoryId))
    }
  }

  const getCategoryMode = (categoryId: string): CategoryMode => {
    if (includedCategories.includes(categoryId)) return "include"
    if (excludedCategories.includes(categoryId)) return "exclude"
    return "none"
  }

  // Lobby view for participants
  if (room && !isLeader) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Trivial - Waiting in Lobby
          </h2>
          <p className="text-muted-foreground">
            Waiting for {room.leaderName} to configure the game...
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants ({room.participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {room.participants.map((participant) => (
                <div
                  key={participant.uid}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted"
                >
                  {participant.uid === room.leaderId && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="font-medium">{participant.displayName}</span>
                  {participant.uid === room.leaderId && (
                    <Badge variant="secondary" className="text-xs">Leader</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {room.status === "lobby" && (
          <Card>
            <CardHeader>
              <CardTitle>Game Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {room.includedCategories.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Included Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {room.includedCategories.map((catId) => {
                      const category = TRIVIA_CATEGORIES.find((c) => c.id === catId)
                      return category ? (
                        <Badge key={catId} variant="default" className="bg-green-500">
                          {category.name}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
              {room.excludedCategories.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Excluded Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {room.excludedCategories.map((catId) => {
                      const category = TRIVIA_CATEGORIES.find((c) => c.id === catId)
                      return category ? (
                        <Badge key={catId} variant="default" className="bg-red-500">
                          {category.name}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium">Scoring Method: <Badge>{room.scoringMethod}</Badge></p>
                <p className="text-sm font-medium mt-2">Questions Per Round: {room.questionsPerRound}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {room.status === "playing" && (
          <Card>
            <CardHeader>
              <CardTitle>Game In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Game logic will be implemented here</p>
            </CardContent>
          </Card>
        )}

        <Button onClick={leaveRoom} variant="outline" className="w-full">
          Leave Room
        </Button>
      </motion.div>
    )
  }

  // Leader configuration view
  if (room && isLeader) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Trivial - Room Leader
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyRoomLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" size="sm" onClick={shareRoomLink}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            Configure your trivia game. Changes are saved automatically.
          </p>
        </div>

        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants ({room.participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {room.participants.map((participant) => (
                <div
                  key={participant.uid}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted"
                >
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{participant.displayName}</span>
                  <Badge variant="secondary" className="text-xs">Leader</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Selection with Include/Exclude */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Category Selection</CardTitle>
                <CardDescription>
                  Include categories you want, exclude ones you don't
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIncludedCategories(TRIVIA_CATEGORIES.map((c) => c.id))
                    setExcludedCategories([])
                    updateRoomSettings()
                  }}
                >
                  Include All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIncludedCategories([])
                    setExcludedCategories([])
                    updateRoomSettings()
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TRIVIA_CATEGORIES.map((category) => {
                const mode = getCategoryMode(category.id)
                return (
                  <motion.div
                    key={category.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all ${
                        mode === "include"
                          ? "ring-2 ring-green-500 border-green-500"
                          : mode === "exclude"
                          ? "ring-2 ring-red-500 border-red-500"
                          : "hover:border-primary/50"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm mb-1">
                              {category.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {category.description}
                            </p>
                          </div>
                          {mode !== "none" && (
                            <div className="flex-shrink-0 ml-2">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  mode === "include"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              >
                                {mode === "include" ? (
                                  <Plus className="h-3 w-3 text-white" />
                                ) : (
                                  <Minus className="h-3 w-3 text-white" />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant={mode === "include" ? "default" : "outline"}
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => {
                              toggleCategory(category.id, "include")
                              updateRoomSettings()
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Include
                          </Button>
                          <Button
                            variant={mode === "exclude" ? "default" : "outline"}
                            size="sm"
                            className="flex-1 text-xs bg-red-500 hover:bg-red-600"
                            onClick={() => {
                              toggleCategory(category.id, "exclude")
                              updateRoomSettings()
                            }}
                          >
                            <Minus className="h-3 w-3 mr-1" />
                            Exclude
                          </Button>
                        </div>
                        {mode !== "none" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-2 pt-2 border-t"
                          >
                            <div
                              className={`h-1 rounded-full bg-gradient-to-r ${
                                mode === "include"
                                  ? category.color
                                  : "from-red-500 to-red-600"
                              }`}
                            />
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
            {(includedCategories.length > 0 || excludedCategories.length > 0) && (
              <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                {includedCategories.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-green-600">{includedCategories.length}</span> categor
                    {includedCategories.length === 1 ? "y" : "ies"} included
                  </p>
                )}
                {excludedCategories.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-red-600">{excludedCategories.length}</span> categor
                    {excludedCategories.length === 1 ? "y" : "ies"} excluded
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scoring Method Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Scoring Method
            </CardTitle>
            <CardDescription>
              Choose how points are calculated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["points", "time", "speed", "accuracy"] as ScoringMethod[]).map((method) => (
                <Card
                  key={method}
                  className={`cursor-pointer transition-all ${
                    scoringMethod === method
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => {
                    setScoringMethod(method)
                    updateRoomSettings()
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {method === "points" && <Target className="h-5 w-5 text-primary" />}
                      {method === "time" && <Clock className="h-5 w-5 text-primary" />}
                      {method === "speed" && <Settings2 className="h-5 w-5 text-primary" />}
                      {method === "accuracy" && <Trophy className="h-5 w-5 text-primary" />}
                      <div>
                        <h3 className="font-semibold capitalize">{method}</h3>
                        <p className="text-xs text-muted-foreground">
                          {method === "points" && "Earn points for correct answers"}
                          {method === "time" && "Faster answers earn more points"}
                          {method === "speed" && "Points based on response speed"}
                          {method === "accuracy" && "Focus on getting answers right"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Game Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Game Settings</CardTitle>
            <CardDescription>
              Configure your game parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Questions Per Round: {questionsPerRound}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={questionsPerRound}
                onChange={(e) => {
                  setQuestionsPerRound(parseInt(e.target.value))
                  updateRoomSettings()
                }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5</span>
                <span>50</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Time Limit (seconds): {timeLimit || "None"}
              </label>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={timeLimit || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  setTimeLimit(value === 0 ? undefined : value)
                  updateRoomSettings()
                }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>None</span>
                <span>300s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Game Button */}
        <div className="flex justify-between gap-3">
          <Button onClick={leaveRoom} variant="outline">
            Close Room
          </Button>
          <Button
            onClick={startGame}
            disabled={
              (includedCategories.length === 0 && excludedCategories.length === 0) ||
              room.participants.length < 1 ||
              room.status === "playing"
            }
            size="lg"
            className="min-w-[200px]"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Game
          </Button>
        </div>
      </motion.div>
    )
  }

  // Initial view - create or join room
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Brain className="h-6 w-6" />
          Trivial
        </h2>
        <p className="text-muted-foreground">
          Create a room to start a multiplayer trivia game, or join an existing room
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Room</CardTitle>
            <CardDescription>
              Start a new trivia game and invite friends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={createRoom} className="w-full" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create New Room
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join Room</CardTitle>
            <CardDescription>
              Enter a room code to join an existing game
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter room code"
                value={roomId || ""}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && roomId) {
                    joinRoom(roomId)
                  }
                }}
              />
            </div>
            <Button
              onClick={() => roomId && joinRoom(roomId)}
              className="w-full"
              size="lg"
              disabled={!roomId}
            >
              Join Room
            </Button>
          </CardContent>
        </Card>
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </motion.div>
  )
}
