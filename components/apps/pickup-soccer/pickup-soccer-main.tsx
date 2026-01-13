"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  X,
  Edit,
  Trash2,
  Search,
  Filter,
  UserPlus,
  UserMinus
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { db } from "@/lib/firebase/config"
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Game {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  maxPlayers: number
  players: string[]
  createdBy: string
  createdByName: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface PlayerInfo {
  uid: string
  name: string
}

export function PickupSoccerMain() {
  const { user } = useAuth()
  const [games, setGames] = React.useState<Game[]>([])
  const [loading, setLoading] = React.useState(true)
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterDate, setFilterDate] = React.useState("")
  const [playerNames, setPlayerNames] = React.useState<Record<string, string>>({})

  // Form state
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    maxPlayers: 10,
  })

  // Load games from Firestore
  React.useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    try {
      setLoading(true)
      const gamesRef = collection(db, "games")
      
      // Try compound query first, fallback to simple query if index doesn't exist
      let snapshot
      try {
        const q = query(gamesRef, orderBy("date", "asc"), orderBy("time", "asc"))
        snapshot = await getDocs(q)
      } catch (indexError: any) {
        // If compound index doesn't exist, try single orderBy
        if (indexError?.code === "failed-precondition") {
          console.warn("Compound index not found, using single orderBy")
          const q = query(gamesRef, orderBy("date", "asc"))
          snapshot = await getDocs(q)
        } else {
          // If that fails, just get all games without ordering
          snapshot = await getDocs(gamesRef)
        }
      }
      
      const gamesData: Game[] = []
      const playerUids = new Set<string>()

      snapshot.forEach((doc) => {
        const data = doc.data()
        gamesData.push({
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          date: data.date || "",
          time: data.time || "",
          location: data.location || "",
          maxPlayers: data.maxPlayers || 10,
          players: Array.isArray(data.players) ? data.players : [],
          createdBy: data.createdBy || "",
          createdByName: data.createdByName || "",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Game)

        // Collect all player UIDs to fetch names
        if (Array.isArray(data.players)) {
          data.players.forEach((uid: string) => {
            if (uid) playerUids.add(uid)
          })
        }
        if (data.createdBy) {
          playerUids.add(data.createdBy)
        }
      })

      // Sort games by date and time client-side if query didn't order them
      gamesData.sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date)
        }
        return a.time.localeCompare(b.time)
      })

      setGames(gamesData)

      // Load player names
      if (playerUids.size > 0) {
        await loadPlayerNames(Array.from(playerUids))
      }
    } catch (error: any) {
      console.error("Failed to load games:", error)
      if (error?.code === "permission-denied") {
        toast.error("Permission denied. Please check Firestore rules.")
      } else {
        toast.error("Failed to load games. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const loadPlayerNames = async (uids: string[]) => {
    const names: Record<string, string> = {}
    
    await Promise.all(
      uids.map(async (uid) => {
        try {
          const userDocRef = doc(db, "users", uid)
          const userDoc = await getDoc(userDocRef)
          if (userDoc.exists()) {
            const userData = userDoc.data()
            names[uid] = userData.displayName || userData.username || "Unknown Player"
          } else {
            names[uid] = "Unknown Player"
          }
        } catch (error) {
          console.error(`Failed to load name for ${uid}:`, error)
          names[uid] = "Unknown Player"
        }
      })
    )

    setPlayerNames(names)
  }

  const getUserDisplayName = async (uid: string): Promise<string> => {
    if (playerNames[uid]) {
      return playerNames[uid]
    }

    try {
      const userDocRef = doc(db, "users", uid)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const name = userData.displayName || userData.username || "Unknown Player"
        setPlayerNames((prev) => ({ ...prev, [uid]: name }))
        return name
      }
    } catch (error) {
      console.error(`Failed to load name for ${uid}:`, error)
    }

    return "Unknown Player"
  }

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    // Check if user has display name set
    try {
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      if (!userDoc.exists()) {
        toast.error("Please set your display name in Account Settings before creating a game")
        return
      }
      const userData = userDoc.data()
      if (!userData.displayName && !userData.username) {
        toast.error("Please set your display name in Account Settings before creating a game")
        return
      }
    } catch (error) {
      toast.error("Failed to verify user profile")
      return
    }

    try {
      const gameData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        maxPlayers: formData.maxPlayers,
        players: [],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await addDoc(collection(db, "games"), gameData)
      
      toast.success("Game created successfully!")
      setCreateDialogOpen(false)
      setFormData({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
        maxPlayers: 10,
      })
      
      loadGames()
    } catch (error: any) {
      console.error("Failed to create game:", error)
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Please sign in to create games.")
      } else {
        toast.error("Failed to create game")
      }
    }
  }

  const handleJoinGame = async (gameId: string) => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    // Check if user has display name
    try {
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      if (!userDoc.exists()) {
        toast.error("Please set your display name in Account Settings before joining a game")
        return
      }
      const userData = userDoc.data()
      if (!userData.displayName && !userData.username) {
        toast.error("Please set your display name in Account Settings before joining a game")
        return
      }
    } catch (error) {
      toast.error("Failed to verify user profile")
      return
    }

    try {
      const game = games.find((g) => g.id === gameId)
      if (!game) return

      if (game.players.includes(user.uid)) {
        toast.error("You're already in this game")
        return
      }

      if (game.players.length >= game.maxPlayers) {
        toast.error("Game is full")
        return
      }

      const gameRef = doc(db, "games", gameId)
      await updateDoc(gameRef, {
        players: [...game.players, user.uid],
        updatedAt: serverTimestamp(),
      })

      toast.success("Joined game successfully!")
      loadGames()
    } catch (error: any) {
      console.error("Failed to join game:", error)
      if (error.code === "permission-denied") {
        toast.error("Permission denied")
      } else {
        toast.error("Failed to join game")
      }
    }
  }

  const handleLeaveGame = async (gameId: string) => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    try {
      const game = games.find((g) => g.id === gameId)
      if (!game) return

      if (!game.players.includes(user.uid)) {
        toast.error("You're not in this game")
        return
      }

      const gameRef = doc(db, "games", gameId)
      await updateDoc(gameRef, {
        players: game.players.filter((uid) => uid !== user.uid),
        updatedAt: serverTimestamp(),
      })

      toast.success("Left game successfully")
      loadGames()
    } catch (error: any) {
      console.error("Failed to leave game:", error)
      toast.error("Failed to leave game")
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    if (!user) return

    const game = games.find((g) => g.id === gameId)
    if (!game || game.createdBy !== user.uid) {
      toast.error("You can only delete games you created")
      return
    }

    if (!confirm("Are you sure you want to delete this game? This cannot be undone.")) {
      return
    }

    try {
      await deleteDoc(doc(db, "games", gameId))
      toast.success("Game deleted successfully")
      loadGames()
    } catch (error: any) {
      console.error("Failed to delete game:", error)
      toast.error("Failed to delete game")
    }
  }

  const filteredGames = React.useMemo(() => {
    let filtered = games

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (game) =>
          game.title.toLowerCase().includes(query) ||
          game.description.toLowerCase().includes(query) ||
          game.location.toLowerCase().includes(query)
      )
    }

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter((game) => game.date === filterDate)
    }

    return filtered
  }, [games, searchQuery, filterDate])

  const isGameFull = (game: Game) => {
    return Array.isArray(game.players) && game.players.length >= game.maxPlayers
  }

  const isUserInGame = (game: Game) => {
    return user && Array.isArray(game.players) && game.players.includes(user.uid)
  }

  const canManageGame = (game: Game) => {
    return user && game.createdBy && game.createdBy === user.uid
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Date TBD"
    try {
      const date = new Date(dateString + "T00:00:00")
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return "Time TBD"
    try {
      const [hours, minutes] = timeString.split(":")
      const hour = parseInt(hours)
      if (isNaN(hour)) return timeString
      const ampm = hour >= 12 ? "PM" : "AM"
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes || "00"} ${ampm}`
    } catch {
      return timeString
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">Pickup Soccer</h2>
        <p className="text-muted-foreground">
          Schedule, join, create, and manage pickup soccer games
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-10 pr-10 w-48 min-w-[192px] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-6 [&::-webkit-calendar-picker-indicator]:h-6 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          {filterDate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFilterDate("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => !user && setAuthDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Game
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new pickup soccer game
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGame} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Game Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Weekend Pickup Game"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add any additional details..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Central Park Field 1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPlayers">Max Players *</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  min="2"
                  max="22"
                  value={formData.maxPlayers}
                  onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) || 10 })}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Game</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Games List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading games...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterDate
                ? "No games match your filters"
                : "No games scheduled yet. Create the first one!"}
            </p>
            {!user && (
              <Button onClick={() => setAuthDialogOpen(true)}>
                Sign In to Create Game
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map((game) => (
            <Card key={game.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg flex-1">{game.title}</CardTitle>
                  {canManageGame(game) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteGame(game.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                {game.description && (
                  <CardDescription className="line-clamp-2">
                    {game.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(game.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(game.time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{game.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {game.players.length} / {game.maxPlayers} players
                    </span>
                    {isGameFull(game) && (
                      <Badge variant="secondary" className="ml-2">
                        Full
                      </Badge>
                    )}
                  </div>
                  {game.createdBy && (
                    <div className="text-xs text-muted-foreground">
                      Created by {playerNames[game.createdBy] || "Unknown"}
                    </div>
                  )}
                </div>

                {/* Players List */}
                {Array.isArray(game.players) && game.players.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium mb-2">Players:</p>
                    <div className="flex flex-wrap gap-1">
                      {game.players.map((playerId) => (
                        <Badge key={playerId} variant="outline" className="text-xs">
                          {playerNames[playerId] || "Loading..."}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {isUserInGame(game) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleLeaveGame(game.id)}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Leave
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleJoinGame(game.id)}
                      disabled={isGameFull(game) || !user}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {isGameFull(game) ? "Full" : "Join"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </motion.div>
  )
}
