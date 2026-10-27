"use client"

import * as React from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore"
import { motion } from "framer-motion"
import { Calendar, Clock, MapPin, Plus, Search, Trash2, UserMinus, UserPlus, Users, X } from "lucide-react"
import { toast } from "sonner"
import { useAppSettings } from "@/components/apps/settings-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getProfileName, getProfileNames } from "@/lib/account/profile"
import { changeGameMembership } from "@/lib/apps/game-membership"
import { db } from "@/lib/firebase/db"
import { getDataErrorMessage, getErrorCode, logUnexpectedError } from "@/lib/firebase/user-facing-errors"
import { useAsync } from "@/lib/hooks/use-async"

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
}

const UNKNOWN_PLAYER = "Unknown Player"

async function queryGames() {
  const gamesRef = collection(db, "games")
  try {
    return await getDocs(query(gamesRef, orderBy("date", "asc"), orderBy("time", "asc")))
  } catch (error) {
    // Without the composite index, fall back to an unordered read and sort below.
    if (getErrorCode(error) !== "failed-precondition") throw error
    return getDocs(gamesRef)
  }
}

async function loadGames(): Promise<{ games: Game[]; names: Record<string, string> }> {
  const snapshot = await queryGames()
  const games = snapshot.docs
    .map((entry): Game => {
      const data = entry.data()
      return {
        id: entry.id,
        title: data.title || "",
        description: data.description || "",
        date: data.date || "",
        time: data.time || "",
        location: data.location || "",
        maxPlayers: data.maxPlayers || 10,
        players: Array.isArray(data.players) ? data.players.filter(Boolean) : [],
        createdBy: data.createdBy || "",
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  const names = await getProfileNames(
    games.flatMap((game) => [...game.players, game.createdBy].filter(Boolean)),
    UNKNOWN_PLAYER
  )
  return { games, names }
}

const emptyForm = (location: string, maxPlayers: number) => ({
  title: "",
  description: "",
  date: "",
  time: "",
  location,
  maxPlayers,
})

export function PickupSoccerMain() {
  const settings = useAppSettings("pickup-soccer")
  const { account } = useAuth()
  const gamesQuery = useAsync("games", loadGames)
  const games = React.useMemo(() => gamesQuery.data?.games ?? [], [gamesQuery.data])
  const playerNames = gamesQuery.data?.names ?? {}
  const loading = gamesQuery.loading
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterDate, setFilterDate] = React.useState("")
  const [formData, setFormData] = React.useState(() => emptyForm("", 10))

  React.useEffect(() => {
    if (gamesQuery.error) toast.error(getDataErrorMessage(gamesQuery.error, "load games"))
  }, [gamesQuery.error])

  // Organisers and players must be identifiable to each other.
  const ensureProfileName = async (uid: string, action: string) => {
    try {
      if (await getProfileName(uid)) return true
      toast.error(`Please set your display name in Account Settings before ${action} a game`)
    } catch {
      toast.error("Failed to verify user profile")
    }
    return false
  }

  const changeMembership = async (game: Game, join: boolean) => {
    if (!account) {
      setAuthDialogOpen(true)
      return
    }
    if (join && !(await ensureProfileName(account.uid, "joining"))) return
    try {
      // Validate against the latest document so concurrent joins respect capacity.
      const gameRef = doc(db, "games", game.id)
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(gameRef)
        if (!snapshot.exists()) throw new Error("This game no longer exists")
        const current = snapshot.data()
        transaction.update(gameRef, {
          players: changeGameMembership(current.players, account.uid, current.maxPlayers, join),
          updatedAt: serverTimestamp(),
        })
      })
      toast.success(join ? "Joined game successfully!" : "Left game successfully")
      gamesQuery.reload()
    } catch (error) {
      logUnexpectedError("pickup-soccer:membership", error)
      // changeGameMembership throws user-facing messages such as "Game is full".
      toast.error(
        getErrorCode(error) || !(error instanceof Error)
          ? getDataErrorMessage(error, join ? "join the game" : "leave the game")
          : error.message
      )
    }
  }

  const handleCreateGame = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!account) {
      setAuthDialogOpen(true)
      return
    }
    if (!(await ensureProfileName(account.uid, "creating"))) return

    try {
      await addDoc(collection(db, "games"), {
        ...formData,
        players: settings.autoJoin ? [account.uid] : [],
        createdBy: account.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      toast.success("Game created successfully!")
      setCreateDialogOpen(false)
      gamesQuery.reload()
    } catch (error) {
      logUnexpectedError("pickup-soccer:create", error)
      toast.error(
        getErrorCode(error) === "permission-denied"
          ? "Permission denied. Please sign in to create games."
          : "Failed to create game"
      )
    }
  }

  const handleDeleteGame = async (game: Game) => {
    if (!account || game.createdBy !== account.uid) {
      toast.error("You can only delete games you created")
      return
    }
    if (!confirm("Are you sure you want to delete this game? This cannot be undone.")) return
    try {
      await deleteDoc(doc(db, "games", game.id))
      toast.success("Game deleted successfully")
      gamesQuery.reload()
    } catch (error) {
      logUnexpectedError("pickup-soccer:delete", error)
      toast.error("Failed to delete game")
    }
  }

  const uid = account?.uid
  const filteredGames = React.useMemo(() => {
    let filtered = games.filter(
      (game) =>
        !settings.showMyGamesOnly || Boolean(uid && (game.createdBy === uid || game.players.includes(uid)))
    )

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
  }, [games, searchQuery, filterDate, settings.showMyGamesOnly, uid])

  const isGameFull = (game: Game) => {
    return Array.isArray(game.players) && game.players.length >= game.maxPlayers
  }

  const isUserInGame = (game: Game) => Boolean(uid && game.players.includes(uid))
  const canManageGame = (game: Game) => Boolean(uid && game.createdBy === uid)

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
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search games"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              aria-label="Filter games by date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-10 pr-10 w-48 min-w-[192px] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-6 [&::-webkit-calendar-picker-indicator]:h-6 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          {filterDate && (
            <Button variant="ghost" size="icon" onClick={() => setFilterDate("")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            if (open) setFormData(emptyForm(settings.defaultLocation, settings.defaultMaxPlayers))
            setCreateDialogOpen(open)
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => !account && setAuthDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Game
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
              <DialogDescription>Fill in the details to create a new pickup soccer game</DialogDescription>
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
                  onChange={(e) =>
                    setFormData({ ...formData, maxPlayers: parseInt(e.target.value, 10) || 10 })
                  }
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
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
            {!account && <Button onClick={() => setAuthDialogOpen(true)}>Sign In to Create Game</Button>}
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
                      onClick={() => handleDeleteGame(game)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                {game.description && (
                  <CardDescription className="line-clamp-2">{game.description}</CardDescription>
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
                      onClick={() => changeMembership(game, false)}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Leave
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => changeMembership(game, true)}
                      disabled={isGameFull(game) || !account}
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
