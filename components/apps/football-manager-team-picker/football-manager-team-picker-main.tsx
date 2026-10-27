"use client"

import * as React from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"
import { Dice6, Heart, History, RefreshCw, RotateCcw, Search, Trophy, X } from "lucide-react"
import { toast } from "sonner"
import { useAppSettings } from "@/components/apps/settings-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { flattenTeams, pickTeams, type Country, type LocatedTeam } from "@/lib/apps/team-picker"
import { db } from "@/lib/firebase/db"
import { getErrorCode, logUnexpectedError } from "@/lib/firebase/user-facing-errors"
import { useAsync } from "@/lib/hooks/use-async"
import { useResettableState } from "@/lib/hooks/use-resettable-state"

type PickMode = "single" | "multiple"

interface PickerOptions {
  pickMode: PickMode
  numPicks: number
  minTier: number
  sameCountry: boolean
  sameLeague: boolean
}

interface HistoryEntry {
  /** Firestore document id; the same team can appear in history many times. */
  entryId: string
  team: LocatedTeam
}

const HISTORY_LIMIT = 50
const HISTORY_SHOWN = 12
const ALL = "all"

const favoritesPath = (uid: string) => collection(db, "users", uid, "footballManagerTeamPickerFavorites")
const historyPath = (uid: string) => collection(db, "users", uid, "footballManagerTeamPickerHistory")

// The stored shape is unchanged from earlier versions of the app.
function teamDocument(team: LocatedTeam) {
  return {
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
  }
}

async function loadTeams(): Promise<{ countries: Country[]; teams: LocatedTeam[] }> {
  const response = await fetch("/data/football-manager-teams.json")
  if (!response.ok) throw new Error("Failed to load teams data")
  const { countries } = (await response.json()) as { countries: Country[] }
  return { countries, teams: flattenTeams(countries) }
}

async function loadAccountData(uid: string) {
  const [favorites, history] = await Promise.all([
    getDocs(favoritesPath(uid)),
    getDocs(query(historyPath(uid), orderBy("pickedAt", "desc"), limit(HISTORY_LIMIT))),
  ])
  return {
    favorites: favorites.docs.map((favorite) => favorite.id),
    history: history.docs.map((entry): HistoryEntry => {
      const data = entry.data()
      return {
        entryId: entry.id,
        team: {
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
          tier: 0,
        },
      }
    }),
  }
}

export function FootballManagerTeamPickerMain() {
  const settings = useAppSettings("football-manager-team-picker")
  const { account } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const catalog = useAsync("teams", loadTeams)
  const uid = account?.uid ?? null
  const accountData = useAsync(uid, () => loadAccountData(uid!))
  const [favoriteOverrides, setFavoriteOverrides] = React.useState<Record<string, boolean>>({})
  const [countryFilter, setCountryFilter] = React.useState(ALL)
  const [leagueFilter, setLeagueFilter] = React.useState(ALL)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [pickedTeams, setPickedTeams] = React.useState<LocatedTeam[]>([])

  // Controls follow the saved defaults until the user changes them.
  const defaults: PickerOptions = {
    pickMode: settings.defaultPickMode,
    numPicks: settings.defaultNumPicks,
    minTier: settings.defaultMinTier,
    sameCountry: settings.defaultSameCountry,
    sameLeague: settings.defaultSameLeague,
  }
  const [options, setOptions] = useResettableState(defaults, JSON.stringify(defaults))
  const setOption = (patch: Partial<PickerOptions>) => setOptions({ ...options, ...patch })

  const allTeams = React.useMemo(() => catalog.data?.teams ?? [], [catalog.data])
  const favorites = React.useMemo(() => {
    const ids = new Set(accountData.data?.favorites)
    for (const [id, favorite] of Object.entries(favoriteOverrides)) {
      if (favorite) ids.add(id)
      else ids.delete(id)
    }
    return ids
  }, [accountData.data, favoriteOverrides])
  const history = accountData.data?.history ?? []

  React.useEffect(() => {
    if (accountData.error && getErrorCode(accountData.error) !== "permission-denied") {
      toast.error("Failed to load your favorites and history")
    }
  }, [accountData.error])

  const availableTeams = React.useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    const lastPick = options.pickMode === "single" ? pickedTeams[0]?.id : undefined
    return allTeams.filter(
      (team) =>
        team.tier >= options.minTier &&
        (!settings.showFavoritesOnly || favorites.has(team.id)) &&
        (countryFilter === ALL || team.countryId === countryFilter) &&
        (leagueFilter === ALL || team.leagueId === leagueFilter) &&
        // Single picks avoid repeating the team that was just picked.
        team.id !== lastPick &&
        (!needle ||
          [team.name, team.city, team.countryName, team.leagueName].some((text) =>
            text.toLowerCase().includes(needle)
          ))
    )
  }, [
    allTeams,
    countryFilter,
    favorites,
    leagueFilter,
    options,
    pickedTeams,
    searchQuery,
    settings.showFavoritesOnly,
  ])

  const saveToHistory = async (picked: LocatedTeam[]) => {
    if (!account || !settings.autoAddToHistory) return
    try {
      await Promise.all(
        picked.map((team) =>
          addDoc(historyPath(account.uid), { ...teamDocument(team), pickedAt: serverTimestamp() })
        )
      )
      accountData.reload()
    } catch (error) {
      // History is a convenience; a failed write should not interrupt picking.
      logUnexpectedError("team-picker:history", error)
    }
  }

  const pick = () => {
    if (!availableTeams.length) {
      toast.error("No teams available with current filters. Try adjusting your filters.")
      return
    }
    const single = options.pickMode === "single"
    const { picked, relaxed } = pickTeams(availableTeams, {
      count: single ? 1 : options.numPicks,
      sameCountry: !single && options.sameCountry,
      sameLeague: !single && options.sameLeague,
    })
    if (relaxed) toast.warning(`Not enough teams in the same ${relaxed}. Picked from all available teams.`)
    setPickedTeams(picked)
    toast.success(
      single ? `Picked: ${picked[0].name}` : `Picked ${picked.length} team${picked.length === 1 ? "" : "s"}`
    )
    void saveToHistory(picked)
  }

  const toggleFavorite = async (team: LocatedTeam) => {
    if (!account) {
      setAuthDialogOpen(true)
      return
    }
    const favorite = !favorites.has(team.id)
    const favoriteRef = doc(favoritesPath(account.uid), team.id)
    try {
      if (favorite) await setDoc(favoriteRef, { ...teamDocument(team), addedAt: serverTimestamp() })
      else await deleteDoc(favoriteRef)
      setFavoriteOverrides((current) => ({ ...current, [team.id]: favorite }))
      toast.success(favorite ? "Added to favorites" : "Removed from favorites")
    } catch (error) {
      logUnexpectedError("team-picker:favorite", error)
      toast.error(
        getErrorCode(error) === "permission-denied"
          ? "Permission denied. Please sign in."
          : "Failed to update favorites"
      )
    }
  }

  const clearCollection = async (kind: "history" | "favorites") => {
    if (!account) return
    try {
      const snapshot = await getDocs(
        kind === "history" ? historyPath(account.uid) : favoritesPath(account.uid)
      )
      await Promise.all(snapshot.docs.map((entry) => deleteDoc(entry.ref)))
      setFavoriteOverrides({})
      accountData.reload()
      toast.success(kind === "history" ? "History cleared" : "Favorites cleared")
    } catch (error) {
      logUnexpectedError(`team-picker:clear-${kind}`, error)
      toast.error(`Failed to clear ${kind}`)
    }
  }

  const resetFilters = () => {
    setCountryFilter(ALL)
    setLeagueFilter(ALL)
    setSearchQuery("")
    setOption({ sameCountry: false, sameLeague: false, minTier: 1 })
    toast.info("Filters reset")
  }

  if (catalog.loading) {
    return <p className="py-12 text-center text-muted-foreground">Loading teams data...</p>
  }

  if (!catalog.data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="mb-4 text-muted-foreground">Failed to load teams data. Please refresh the page.</p>
          <Button onClick={catalog.reload}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const countries = catalog.data.countries
  const leagues = countries.flatMap((country) =>
    country.leagues.map((league) => ({ id: league.id, label: `${country.name} - ${league.name}` }))
  )
  const favoriteTeams = allTeams.filter((team) => favorites.has(team.id))
  const teamCard = (team: LocatedTeam, key: string) => (
    <TeamCard
      key={key}
      team={team}
      favorite={favorites.has(team.id)}
      onToggleFavorite={() => toggleFavorite(team)}
    />
  )
  const signInPrompt = (icon: React.ReactNode, message: string) => (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        {icon}
        <p className="text-muted-foreground">{message}</p>
        <Button onClick={() => setAuthDialogOpen(true)}>Sign In</Button>
      </CardContent>
    </Card>
  )
  const countriesPicked = new Set(pickedTeams.map((team) => team.countryId)).size
  const leaguesPicked = new Set(pickedTeams.map((team) => team.leagueId)).size

  return (
    <div className="space-y-6">
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
            {favorites.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {favorites.size}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="picker" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Picker Controls</CardTitle>
              <CardDescription>Configure your team selection options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pick-mode">Pick Mode</Label>
                  <Select
                    value={options.pickMode}
                    onValueChange={(value: PickMode) => {
                      setOption({ pickMode: value })
                      if (value === "single") setPickedTeams([])
                    }}
                  >
                    <SelectTrigger id="pick-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Team</SelectItem>
                      <SelectItem value="multiple">Multiple Teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {options.pickMode === "multiple" && (
                  <div className="space-y-2">
                    <Label htmlFor="pick-count">Number of Teams</Label>
                    <Input
                      id="pick-count"
                      type="number"
                      min={2}
                      max={20}
                      value={options.numPicks}
                      onChange={(event) =>
                        setOption({
                          numPicks: Math.max(2, Math.min(20, parseInt(event.target.value, 10) || 4)),
                        })
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="min-tier">Minimum League Tier</Label>
                  <Select
                    value={String(options.minTier)}
                    onValueChange={(value) => setOption({ minTier: parseInt(value, 10) })}
                  >
                    <SelectTrigger id="min-tier">
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

              {options.pickMode === "multiple" && (
                <div className="space-y-3 border-t pt-2">
                  <Toggle
                    id="same-country"
                    label="Same Country Only"
                    description="All picked teams will be from the same country"
                    checked={options.sameCountry}
                    onChange={(checked) =>
                      setOption({ sameCountry: checked, sameLeague: checked ? false : options.sameLeague })
                    }
                  />
                  <Toggle
                    id="same-league"
                    label="Same League Only"
                    description="All picked teams will be from the same league"
                    checked={options.sameLeague}
                    onChange={(checked) =>
                      setOption({ sameLeague: checked, sameCountry: checked ? false : options.sameCountry })
                    }
                  />
                </div>
              )}

              <div className="flex gap-2 border-t pt-4">
                <Button onClick={pick} className="flex-1" size="lg">
                  <Dice6 className="mr-2 h-5 w-5" />
                  {options.pickMode === "single" ? "Pick Random Team" : `Pick ${options.numPicks} Teams`}
                </Button>
                {pickedTeams.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPickedTeams([])
                      toast.info("Cleared picks")
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Narrow down your team selection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="team-search"
                    placeholder="Search teams, cities, countries, or leagues..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country-filter">Countries</Label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger id="country-filter">
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Countries</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.flag} {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="league-filter">Leagues</Label>
                  <Select value={leagueFilter} onValueChange={setLeagueFilter}>
                    <SelectTrigger id="league-filter">
                      <SelectValue placeholder="All Leagues" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Leagues</SelectItem>
                      {leagues.map((league) => (
                        <SelectItem key={league.id} value={league.id}>
                          {league.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button variant="outline" onClick={resetFilters} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>

              <p className="border-t pt-2 text-xs text-muted-foreground">
                {availableTeams.length} team{availableTeams.length === 1 ? "" : "s"} available
              </p>
            </CardContent>
          </Card>

          {pickedTeams.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {options.pickMode === "single" ? "Picked Team" : `Picked Teams (${pickedTeams.length})`}
                </h3>
                {options.pickMode === "multiple" && pickedTeams.length > 1 && (
                  <Badge variant="secondary">
                    {countriesPicked} {countriesPicked === 1 ? "country" : "countries"} • {leaguesPicked}{" "}
                    {leaguesPicked === 1 ? "league" : "leagues"}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pickedTeams.map((team) => teamCard(team, team.id))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {!account ? (
            signInPrompt(
              <History className="h-12 w-12 text-muted-foreground" />,
              "Please sign in to view your pick history"
            )
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No pick history yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pick History</h3>
                <Button variant="outline" size="sm" onClick={() => clearCollection("history")}>
                  Clear History
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {history.slice(0, HISTORY_SHOWN).map(({ entryId, team }) => teamCard(team, entryId))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          {!account ? (
            signInPrompt(
              <Heart className="h-12 w-12 text-muted-foreground" />,
              "Please sign in to use favorites"
            )
          ) : favorites.size === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No favorites yet</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Click the heart icon on any team to add it to favorites
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Favorite Teams</h3>
                <Button variant="outline" size="sm" onClick={() => clearCollection("favorites")}>
                  Clear Favorites
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {favoriteTeams.map((team) => teamCard(team, team.id))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  )
}

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-input after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20" />
      </label>
    </div>
  )
}

function TeamCard({
  team,
  favorite,
  onToggleFavorite,
}: {
  team: LocatedTeam
  favorite: boolean
  onToggleFavorite: () => void
}) {
  return (
    <Card>
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
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? `Remove ${team.name} from favorites` : `Add ${team.name} to favorites`}
          >
            <Heart
              className={`h-4 w-4 ${favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
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
            <span aria-hidden="true">🏟️</span>
            <span>{team.stadium}</span>
            {team.capacity && <span className="text-xs">({team.capacity.toLocaleString()} capacity)</span>}
          </div>
        )}
        {team.established && (
          <div className="text-xs text-muted-foreground">Established: {team.established}</div>
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
