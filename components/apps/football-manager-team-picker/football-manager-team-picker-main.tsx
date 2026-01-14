"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Dice6,
  Filter,
  X,
  RotateCcw,
  Heart,
  History,
  Users,
  Search,
  Globe,
  Trophy,
  Star,
  RefreshCw
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
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Team {
  id: string
  name: string
  city: string
  stadium?: string
  capacity?: number
  established?: number
  rivalry?: string[]
}

interface League {
  id: string
  name: string
  tier: number
  teams: Team[]
}

interface Country {
  id: string
  name: string
  flag: string
  leagues: League[]
}

interface FootballManagerData {
  countries: Country[]
}

interface PickedTeam extends Team {
  countryId: string
  leagueId: string
  countryName: string
  leagueName: string
  pickedAt: Date
}

interface Settings {
  defaultPickMode: "single" | "multiple"
  defaultNumPicks: number
  defaultMinTier: number
  defaultSameCountry: boolean
  defaultSameLeague: boolean
  autoAddToHistory: boolean
  showFavoritesOnly: boolean
}

export function FootballManagerTeamPickerMain() {
  const { user, loading: authLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [data, setData] = React.useState<FootballManagerData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [settingsLoading, setSettingsLoading] = React.useState(true)
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>([])
  const [selectedLeagues, setSelectedLeagues] = React.useState<string[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [pickedTeams, setPickedTeams] = React.useState<PickedTeam[]>([])
  const [favorites, setFavorites] = React.useState<string[]>([])
  const [history, setHistory] = React.useState<PickedTeam[]>([])
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [pickMode, setPickMode] = React.useState<"single" | "multiple">("single")
  const [numPicks, setNumPicks] = React.useState(4)
  const [sameCountry, setSameCountry] = React.useState(false)
  const [sameLeague, setSameLeague] = React.useState(false)
  const [minTier, setMinTier] = React.useState(1)

  // Load data from JSON file and user data
  React.useEffect(() => {
    loadData()
  }, [])

  // Load settings when user is available
  React.useEffect(() => {
    if (user && !authLoading) {
      loadSettings()
      loadFavorites()
      loadHistory()
    } else if (!authLoading && !user) {
      setSettingsLoading(false)
    }
  }, [user, authLoading])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/data/football-manager-teams.json")
      if (!response.ok) {
        throw new Error("Failed to load teams data")
      }
      const jsonData = await response.json()
      setData(jsonData)
    } catch (error) {
      console.error("Failed to load teams data:", error)
      toast.error("Failed to load teams data. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    if (!user) return

    try {
      setSettingsLoading(true)
      const settingsRef = doc(db, "users", user.uid, "footballManagerTeamPickerSettings", "default")
      const settingsDoc = await getDoc(settingsRef)

      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        const loadedSettings: Settings = {
          defaultPickMode: data.defaultPickMode || "single",
          defaultNumPicks: data.defaultNumPicks || 4,
          defaultMinTier: data.defaultMinTier || 1,
          defaultSameCountry: data.defaultSameCountry || false,
          defaultSameLeague: data.defaultSameLeague || false,
          autoAddToHistory: data.autoAddToHistory !== false, // Default true
          showFavoritesOnly: data.showFavoritesOnly || false,
        }
        setSettings(loadedSettings)

        // Apply settings to picker state
        setPickMode(loadedSettings.defaultPickMode)
        setNumPicks(loadedSettings.defaultNumPicks)
        setMinTier(loadedSettings.defaultMinTier)
        setSameCountry(loadedSettings.defaultSameCountry)
        setSameLeague(loadedSettings.defaultSameLeague)
      } else {
        // Default settings
        const defaultSettings: Settings = {
          defaultPickMode: "single",
          defaultNumPicks: 4,
          defaultMinTier: 1,
          defaultSameCountry: false,
          defaultSameLeague: false,
          autoAddToHistory: true,
          showFavoritesOnly: false,
        }
        setSettings(defaultSettings)
      }
    } catch (error: any) {
      console.error("Failed to load settings:", error)
      if (error.code !== "permission-denied") {
        toast.error("Failed to load settings")
      }
    } finally {
      setSettingsLoading(false)
    }
  }

  const loadFavorites = async () => {
    if (!user) {
      setFavorites([])
      return
    }

    try {
      const favoritesRef = collection(db, "users", user.uid, "footballManagerTeamPickerFavorites")
      const snapshot = await getDocs(favoritesRef)

      const favoriteIds: string[] = []
      snapshot.forEach((doc) => {
        favoriteIds.push(doc.id)
      })

      setFavorites(favoriteIds)
    } catch (error: any) {
      console.error("Failed to load favorites:", error)
      if (error.code !== "permission-denied") {
        toast.error("Failed to load favorites")
      }
    }
  }

  const loadHistory = async () => {
    if (!user) {
      setHistory([])
      return
    }

    try {
      const historyRef = collection(db, "users", user.uid, "footballManagerTeamPickerHistory")
      const historyQuery = query(historyRef, orderBy("pickedAt", "desc"), limit(50))
      const snapshot = await getDocs(historyQuery)

      const historyData: PickedTeam[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        historyData.push({
          id: data.teamId,
          name: data.name,
          city: data.city,
          stadium: data.stadium,
          capacity: data.capacity,
          established: data.established,
          rivalry: data.rivalry,
          countryId: data.countryId,
          leagueId: data.leagueId,
          countryName: data.countryName,
          leagueName: data.leagueName,
          pickedAt: data.pickedAt.toDate(),
        })
      })

      setHistory(historyData)
    } catch (error: any) {
      console.error("Failed to load history:", error)
      if (error.code !== "permission-denied") {
        toast.error("Failed to load history")
      }
    }
  }

  const toggleFavorite = async (teamId: string) => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    try {
      const favoriteRef = doc(db, "users", user.uid, "footballManagerTeamPickerFavorites", teamId)
      const favoriteDoc = await getDoc(favoriteRef)

      if (favoriteDoc.exists()) {
        // Remove from favorites
        await deleteDoc(favoriteRef)
        setFavorites((prev) => prev.filter((id) => id !== teamId))
        toast.success("Removed from favorites")
      } else {
        // Add to favorites - need team data
        const allTeams = getAllTeams()
        const team = allTeams.find((t) => t.id === teamId)
        if (team) {
          await setDoc(favoriteRef, {
            teamId: team.id,
            name: team.name,
            city: team.city,
            stadium: team.stadium,
            capacity: team.capacity,
            established: team.established,
            rivalry: team.rivalry || [],
            countryId: team.countryId,
            leagueId: team.leagueId,
            countryName: team.countryName,
            leagueName: team.leagueName,
            addedAt: serverTimestamp(),
          })
          setFavorites((prev) => [...prev, teamId])
          toast.success("Added to favorites")
        }
      }
    } catch (error: any) {
      console.error("Failed to toggle favorite:", error)
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Please sign in.")
      } else {
        toast.error("Failed to update favorites")
      }
    }
  }

  const saveToHistory = async (teams: PickedTeam[]) => {
    if (!user || !settings?.autoAddToHistory) return

    try {
      const historyRef = collection(db, "users", user.uid, "footballManagerTeamPickerHistory")

      // Add each team to history
      await Promise.all(
        teams.map((team) =>
          addDoc(historyRef, {
            teamId: team.id,
            name: team.name,
            city: team.city,
            stadium: team.stadium,
            capacity: team.capacity,
            established: team.established,
            rivalry: team.rivalry || [],
            countryId: team.countryId,
            leagueId: team.leagueId,
            countryName: team.countryName,
            leagueName: team.leagueName,
            pickedAt: serverTimestamp(),
          })
        )
      )

      // Reload history to get updated list
      await loadHistory()
    } catch (error: any) {
      console.error("Failed to save to history:", error)
      // Don't show error toast for history - it's not critical
    }
  }

  const getAllTeams = (): Array<Team & { countryId: string; leagueId: string; countryName: string; leagueName: string }> => {
    if (!data) return []

    const teams: Array<Team & { countryId: string; leagueId: string; countryName: string; leagueName: string }> = []
    
    data.countries.forEach((country) => {
      country.leagues.forEach((league) => {
        if (league.tier >= minTier) {
          league.teams.forEach((team) => {
            teams.push({
              ...team,
              countryId: country.id,
              leagueId: league.id,
              countryName: country.name,
              leagueName: league.name,
            })
          })
        }
      })
    })

    return teams
  }

  const getFilteredTeams = () => {
    let teams = getAllTeams()

    // Filter by favorites only if enabled
    if (settings?.showFavoritesOnly && favorites.length > 0) {
      teams = teams.filter((team) => favorites.includes(team.id))
    }

    // Filter by country
    if (selectedCountries.length > 0) {
      teams = teams.filter((team) => selectedCountries.includes(team.countryId))
    }

    // Filter by league
    if (selectedLeagues.length > 0) {
      teams = teams.filter((team) => selectedLeagues.includes(team.leagueId))
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      teams = teams.filter(
        (team) =>
          team.name.toLowerCase().includes(query) ||
          team.city.toLowerCase().includes(query) ||
          team.countryName.toLowerCase().includes(query) ||
          team.leagueName.toLowerCase().includes(query)
      )
    }

    // Exclude already picked teams in single mode
    if (pickMode === "single" && pickedTeams.length > 0) {
      teams = teams.filter((team) => !pickedTeams.some((picked) => picked.id === team.id))
    }

    return teams
  }

  const pickRandomTeam = async () => {
    const availableTeams = getFilteredTeams()
    
    if (availableTeams.length === 0) {
      toast.error("No teams available with current filters. Try adjusting your filters.")
      return
    }

    if (pickMode === "single") {
      const randomIndex = Math.floor(Math.random() * availableTeams.length)
      const pickedTeam: PickedTeam = {
        ...availableTeams[randomIndex],
        pickedAt: new Date(),
      }
      setPickedTeams([pickedTeam])
      
      // Add to history if enabled
      await saveToHistory([pickedTeam])
      
      toast.success(`Picked: ${pickedTeam.name}`)
    } else {
      const num = Math.min(numPicks, availableTeams.length)
      let teamsToPick = [...availableTeams]
      const picked: PickedTeam[] = []

      for (let i = 0; i < num; i++) {
        if (teamsToPick.length === 0) break

        let pool = teamsToPick

        // Apply same country constraint
        if (sameCountry && picked.length > 0) {
          const firstCountryId = picked[0].countryId
          pool = pool.filter((team) => team.countryId === firstCountryId)
          if (pool.length === 0) {
            toast.warning("Not enough teams in the same country. Picking from all available.")
            pool = teamsToPick
          }
        }

        // Apply same league constraint
        if (sameLeague && picked.length > 0) {
          const firstLeagueId = picked[0].leagueId
          pool = pool.filter((team) => team.leagueId === firstLeagueId)
          if (pool.length === 0) {
            toast.warning("Not enough teams in the same league. Picking from all available.")
            pool = teamsToPick
          }
        }

        const randomIndex = Math.floor(Math.random() * pool.length)
        const pickedTeam: PickedTeam = {
          ...pool[randomIndex],
          pickedAt: new Date(),
        }
        picked.push(pickedTeam)

        // Remove picked team from available pool
        teamsToPick = teamsToPick.filter((team) => team.id !== pickedTeam.id)
      }

      setPickedTeams(picked)
      
      // Add to history if enabled
      await saveToHistory(picked)
      
      toast.success(`Picked ${picked.length} team${picked.length !== 1 ? "s" : ""}`)
    }
  }

  const clearPicks = () => {
    setPickedTeams([])
    toast.info("Cleared picks")
  }

  const resetFilters = () => {
    setSelectedCountries([])
    setSelectedLeagues([])
    setSearchQuery("")
    setSameCountry(false)
    setSameLeague(false)
    setMinTier(1)
    toast.info("Filters reset")
  }

  const getTeamDisplay = (team: PickedTeam) => {
    return (
      <Card key={team.id} className="relative">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{team.name}</CardTitle>
              <CardDescription>
                {team.city}, {team.countryName}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleFavorite(team.id)}
            >
              <Heart
                className={`h-4 w-4 ${
                  favorites.includes(team.id)
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground"
                }`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>{team.leagueName}</span>
          </div>
          {team.stadium && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>🏟️</span>
              <span>{team.stadium}</span>
              {team.capacity && (
                <span className="text-xs">({team.capacity.toLocaleString()} capacity)</span>
              )}
            </div>
          )}
          {team.established && (
            <div className="text-xs text-muted-foreground">
              Established: {team.established}
            </div>
          )}
          {team.rivalry && team.rivalry.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              <span className="text-xs text-muted-foreground">Rivalries:</span>
              {team.rivalry.map((rival) => (
                <Badge key={rival} variant="outline" className="text-xs">
                  {rival}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading teams data...</p>
        </div>
      </motion.div>
    )
  }

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Failed to load teams data. Please refresh the page.
            </p>
            <Button onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const availableTeams = getFilteredTeams()
  const allCountries = data.countries
  const allLeagues = data.countries.flatMap((country) =>
    country.leagues.map((league) => ({ ...league, countryId: country.id, countryName: country.name }))
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">Football Manager Team Picker</h2>
        <p className="text-muted-foreground">
          Pick a random Football Manager team or multiple teams for you and your friends
        </p>
      </div>

      <Tabs defaultValue="picker" className="space-y-4">
        <TabsList>
          <TabsTrigger value="picker">Team Picker</TabsTrigger>
          <TabsTrigger value="history">
            History
            {history.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {history.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="favorites">
            Favorites
            {favorites.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {favorites.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="picker" className="space-y-4">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Picker Controls</CardTitle>
              <CardDescription>Configure your team selection options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pick Mode</Label>
                  <Select
                    value={pickMode}
                    onValueChange={(value: "single" | "multiple") => {
                      setPickMode(value)
                      if (value === "single") {
                        setPickedTeams([])
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Team</SelectItem>
                      <SelectItem value="multiple">Multiple Teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pickMode === "multiple" && (
                  <div className="space-y-2">
                    <Label>Number of Teams</Label>
                    <Input
                      type="number"
                      min="2"
                      max="20"
                      value={numPicks}
                      onChange={(e) => setNumPicks(Math.max(2, Math.min(20, parseInt(e.target.value) || 4)))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Minimum League Tier</Label>
                  <Select
                    value={minTier.toString()}
                    onValueChange={(value) => setMinTier(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Tier 1 (Top Leagues)</SelectItem>
                      <SelectItem value="2">Tier 2+</SelectItem>
                      <SelectItem value="3">Tier 3+</SelectItem>
                      <SelectItem value="0">All Tiers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {pickMode === "multiple" && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Same Country Only</Label>
                      <p className="text-xs text-muted-foreground">
                        All picked teams will be from the same country
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameCountry}
                        onChange={(e) => {
                          setSameCountry(e.target.checked)
                          if (e.target.checked) setSameLeague(false)
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Same League Only</Label>
                      <p className="text-xs text-muted-foreground">
                        All picked teams will be from the same league
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameLeague}
                        onChange={(e) => {
                          setSameLeague(e.target.checked)
                          if (e.target.checked) setSameCountry(false)
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={pickRandomTeam} className="flex-1" size="lg">
                  <Dice6 className="h-5 w-5 mr-2" />
                  {pickMode === "single" ? "Pick Random Team" : `Pick ${numPicks} Teams`}
                </Button>
                {pickedTeams.length > 0 && (
                  <Button variant="outline" onClick={clearPicks}>
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Narrow down your team selection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search teams, cities, countries, or leagues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Countries</Label>
                  <Select
                    value={selectedCountries.length > 0 ? selectedCountries[0] : "all"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedCountries([])
                      } else {
                        setSelectedCountries([value])
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {allCountries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.flag} {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Leagues</Label>
                  <Select
                    value={selectedLeagues.length > 0 ? selectedLeagues[0] : "all"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedLeagues([])
                      } else {
                        setSelectedLeagues([value])
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Leagues" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leagues</SelectItem>
                      {allLeagues.map((league) => (
                        <SelectItem key={league.id} value={league.id}>
                          {league.countryName} - {league.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetFilters} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                {availableTeams.length} team{availableTeams.length !== 1 ? "s" : ""} available
              </div>
            </CardContent>
          </Card>

          {/* Picked Teams */}
          {pickedTeams.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {pickMode === "single" ? "Picked Team" : `Picked Teams (${pickedTeams.length})`}
                </h3>
                {pickMode === "multiple" && pickedTeams.length > 1 && (
                  <Badge variant="secondary">
                    {new Set(pickedTeams.map((t) => t.countryId)).size} countr
                    {new Set(pickedTeams.map((t) => t.countryId)).size !== 1 ? "ies" : "y"}
                    {" • "}
                    {new Set(pickedTeams.map((t) => t.leagueId)).size} league
                    {new Set(pickedTeams.map((t) => t.leagueId)).size !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pickedTeams.map((team) => getTeamDisplay(team))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {!user ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <History className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Please sign in to view your pick history</p>
                <Button onClick={() => setAuthDialogOpen(true)}>Sign In</Button>
              </CardContent>
            </Card>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pick history yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pick History</h3>
                {user && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!user) {
                        setAuthDialogOpen(true)
                        return
                      }

                      try {
                        const historyRef = collection(db, "users", user.uid, "footballManagerTeamPickerHistory")
                        const snapshot = await getDocs(historyRef)
                        await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)))
                        setHistory([])
                        toast.success("History cleared")
                      } catch (error: any) {
                        console.error("Failed to clear history:", error)
                        toast.error("Failed to clear history")
                      }
                    }}
                  >
                    Clear History
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.slice(0, 12).map((team) => getTeamDisplay(team))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          {!user ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Please sign in to use favorites</p>
                <Button onClick={() => setAuthDialogOpen(true)}>Sign In</Button>
              </CardContent>
            </Card>
          ) : favorites.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No favorites yet</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Click the heart icon on any team to add it to favorites
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Favorite Teams</h3>
                {user && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!user) {
                        setAuthDialogOpen(true)
                        return
                      }

                      try {
                        const favoritesRef = collection(db, "users", user.uid, "footballManagerTeamPickerFavorites")
                        const snapshot = await getDocs(favoritesRef)
                        await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)))
                        setFavorites([])
                        toast.success("Favorites cleared")
                      } catch (error: any) {
                        console.error("Failed to clear favorites:", error)
                        toast.error("Failed to clear favorites")
                      }
                    }}
                  >
                    Clear Favorites
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites
                  .map((teamId) => {
                    const team = getAllTeams().find((t) => t.id === teamId)
                    if (!team) return null
                    return {
                      ...team,
                      pickedAt: new Date(),
                    } as PickedTeam
                  })
                  .filter((team): team is PickedTeam => team !== null)
                  .map((team) => getTeamDisplay(team))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </motion.div>
  )
}
