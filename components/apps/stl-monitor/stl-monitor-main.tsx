"use client"

import * as React from "react"
import { useAppSettings } from "@/components/apps/settings-provider"

import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Play, Pause, SkipBack, RefreshCw, X, Clock, ExternalLink, Radio } from "lucide-react"
import { toast } from "sonner"
import { logUnexpectedError } from "@/lib/firebase/user-facing-errors"
import { useNow } from "@/lib/hooks/use-now"
import { useResettableState } from "@/lib/hooks/use-resettable-state"
import {
  Incident,
  FilterState,
  IncidentCategory,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  DEFAULT_FILTER_STATE,
} from "./types"
import {
  fetchMoDOTIncidents,
  fetchNWSAlerts,
  fetchLocalNews,
  weatherAlertsToIncidents,
  newsToIncidents,
} from "./data-service"

// Map component loaded dynamically to avoid SSR issues
const MapComponent = React.lazy(() => import("./map-component"))

// Loading messages for fun popups
const LOADING_MESSAGES = [
  "Finding crimes...",
  "Braking for no reason on I-270...",
  "Locating potholes...",
  "Scanning for construction zones...",
  "Detecting sudden stops on 40...",
  "Watching for weather alerts...",
  "Counting red lights...",
  "Tracking accidents...",
  "Checking I-64 backups...",
  "Finding traffic jams...",
]

const REPLAY_SPAN_MS = 3 * 60 * 60 * 1000
const REPLAY_STEP_MS = 60_000
const REPLAY_TICK_MS = 500
const TIME_WINDOW_MS: Record<FilterState["timeWindow"], number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
}

const SOURCES = [
  { name: "MoDOT traffic", load: fetchMoDOTIncidents },
  { name: "NWS weather alerts", load: async () => weatherAlertsToIncidents(await fetchNWSAlerts()) },
  { name: "local news", load: async () => newsToIncidents(await fetchLocalNews()) },
]

// Only categories with a connected live source get a toggle.
const LIVE_CATEGORIES: IncidentCategory[] = ["traffic", "weather", "news"]

interface FeedResult {
  incidents: Incident[]
  /** Sources that failed this time; their incidents are missing rather than invented. */
  unavailable: string[]
}

async function fetchAllIncidents(): Promise<FeedResult> {
  const results = await Promise.allSettled(SOURCES.map(({ load }) => load()))
  const unavailable = SOURCES.filter((_, index) => results[index].status === "rejected").map(
    ({ name }) => name
  )
  if (unavailable.length === SOURCES.length) throw new Error("Every incident source failed")
  return {
    incidents: results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
    unavailable,
  }
}

interface ReplayState {
  /** The replayable span is fixed when replay starts so the slider doesn't drift. */
  start: number
  end: number
  time: number
  playing: boolean
}

type ReplayAction =
  | { type: "start"; now: number }
  | { type: "seek"; time: number }
  | { type: "toggle" }
  | { type: "rewind" }
  | { type: "tick" }

function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case "start":
      return {
        start: action.now - REPLAY_SPAN_MS,
        end: action.now,
        time: action.now - REPLAY_SPAN_MS,
        playing: false,
      }
    case "seek":
      return { ...state, time: Math.min(state.end, Math.max(state.start, action.time)) }
    case "toggle":
      return { ...state, playing: !state.playing }
    case "rewind":
      return { ...state, time: state.start }
    case "tick": {
      const time = Math.min(state.end, state.time + REPLAY_STEP_MS)
      return { ...state, time, playing: time < state.end }
    }
  }
}

export function STLMonitorMain() {
  const settings = useAppSettings("stl-monitor")

  // Data state
  const [incidents, setIncidents] = React.useState<Incident[]>([])
  const [unavailable, setUnavailable] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Filters follow the saved defaults until the user changes them.
  const defaultFilters: FilterState = {
    ...DEFAULT_FILTER_STATE,
    categories: settings.defaultCategories,
    severityMin: settings.defaultSeverityRange[0],
    severityMax: settings.defaultSeverityRange[1],
    timeWindow: settings.defaultTimeWindow,
  }
  const [filters, setFilters] = useResettableState(defaultFilters, JSON.stringify(defaultFilters))
  const [selectedIncident, setSelectedIncident] = React.useState<Incident | null>(null)
  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0)
  const [replay, dispatchReplay] = React.useReducer(replayReducer, {
    start: 0,
    end: 0,
    time: 0,
    playing: false,
  })
  // Re-evaluates the live time window as incidents age out.
  const now = useNow(30_000, !filters.replayMode)

  const applyIncidents = React.useCallback((next: FeedResult) => {
    setIncidents(next.incidents)
    setUnavailable(next.unavailable)
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  // Initial load.
  React.useEffect(() => {
    let active = true
    fetchAllIncidents()
      .then((next) => {
        if (!active) return
        applyIncidents(next)
        toast.success(`Loaded ${next.incidents.length} incidents`)
      })
      .catch((error: unknown) => {
        if (!active) return
        logUnexpectedError("stl-monitor:load", error)
        setLoading(false)
        toast.error("Failed to refresh data")
      })
    return () => {
      active = false
    }
  }, [applyIncidents])

  // Silent background refresh while viewing live data.
  React.useEffect(() => {
    if (!settings.autoRefresh || filters.replayMode) return
    const timer = setInterval(() => {
      fetchAllIncidents()
        .then(applyIncidents)
        .catch((error: unknown) => logUnexpectedError("stl-monitor:auto-refresh", error))
    }, settings.refreshInterval * 1000)
    return () => clearInterval(timer)
  }, [applyIncidents, filters.replayMode, settings.autoRefresh, settings.refreshInterval])

  React.useEffect(() => {
    if (!filters.replayMode || !replay.playing) return
    const timer = setInterval(() => dispatchReplay({ type: "tick" }), REPLAY_TICK_MS)
    return () => clearInterval(timer)
  }, [filters.replayMode, replay.playing])

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      const next = await fetchAllIncidents()
      applyIncidents(next)
      toast.success(`Loaded ${next.incidents.length} incidents`)
    } catch (error) {
      logUnexpectedError("stl-monitor:refresh", error)
      toast.error("Failed to refresh data")
    } finally {
      setIsRefreshing(false)
    }
  }

  const filteredIncidents = React.useMemo(() => {
    const reference = filters.replayMode ? replay.time : now?.getTime()
    return incidents.filter((incident) => {
      if (!filters.categories[incident.category]) return false
      if (incident.severity < filters.severityMin || incident.severity > filters.severityMax) return false
      if (reference === undefined) return true
      const time = incident.createdAt.getTime()
      if (time < reference - TIME_WINDOW_MS[filters.timeWindow]) return false
      return !filters.replayMode || time <= reference
    })
  }, [incidents, filters, replay.time, now])

  const toggleCategory = (category: IncidentCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: !prev.categories[category],
      },
    }))
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getSeverityColor = (severity: number) => {
    if (severity >= 80) return "text-red-500 bg-red-500/10"
    if (severity >= 60) return "text-orange-500 bg-orange-500/10"
    if (severity >= 40) return "text-yellow-500 bg-yellow-500/10"
    return "text-green-500 bg-green-500/10"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-red-500"
      case "resolving":
        return "bg-yellow-500"
      case "cleared":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  // Cycle through loading messages
  React.useEffect(() => {
    if (loading && incidents.length === 0) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
      }, 1500) // Change message every 1.5 seconds
      return () => clearInterval(interval)
    }
  }, [loading, incidents.length])

  if (loading && incidents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="space-y-6">
            <Radio className="h-12 w-12 mx-auto text-primary animate-spin" />
            <div className="h-8 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentMessageIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-muted-foreground text-lg"
                >
                  {LOADING_MESSAGES[currentMessageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="h-6 w-6 text-red-500" />
            Live incidents
          </h2>
          <p className="text-sm text-muted-foreground">Greater St. Louis Area Incident Monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">Updated {formatTime(lastRefresh)}</span>
          )}
          <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {/* Filter Bar */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Category Toggles */}
              <div className="flex items-center gap-2 flex-wrap">
                {LIVE_CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    variant={filters.categories[category] ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCategory(category)}
                    className="text-xs"
                    style={{
                      backgroundColor: filters.categories[category] ? CATEGORY_COLORS[category] : undefined,
                      borderColor: CATEGORY_COLORS[category],
                    }}
                  >
                    <span className="mr-1">{CATEGORY_ICONS[category]}</span>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
              </div>

              {/* Time Window */}
              <div className="flex items-center gap-2">
                <Label className="text-xs">Window:</Label>
                <div className="flex gap-1">
                  {(["15m", "1h", "6h", "24h"] as const).map((window) => (
                    <Button
                      key={window}
                      variant={filters.timeWindow === window ? "default" : "outline"}
                      size="sm"
                      className="text-xs px-2"
                      onClick={() => setFilters({ ...filters, timeWindow: window })}
                    >
                      {window}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Replay Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={filters.replayMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!filters.replayMode) dispatchReplay({ type: "start", now: Date.now() })
                    setFilters({ ...filters, replayMode: !filters.replayMode })
                  }}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Replay
                </Button>
              </div>

              {/* Incident Count */}
              <Badge variant="secondary">{filteredIncidents.length} active</Badge>
            </div>

            {unavailable.length > 0 && (
              <p role="status" className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500" aria-hidden="true" />
                Couldn&apos;t reach {unavailable.join(" and ")} just now, so those incidents are missing.
                Refresh to try again.
              </p>
            )}

            {/* Replay Controls */}
            {filters.replayMode && (
              <div className="mt-3 pt-3 border-t flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dispatchReplay({ type: "rewind" })}
                    aria-label="Rewind to start"
                  >
                    <SkipBack className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dispatchReplay({ type: "toggle" })}
                    aria-label={replay.playing ? "Pause replay" : "Play replay"}
                  >
                    {replay.playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                </div>
                <div className="flex-1">
                  <input
                    type="range"
                    aria-label="Replay time"
                    min={replay.start}
                    max={replay.end}
                    step={REPLAY_STEP_MS}
                    value={replay.time}
                    onChange={(event) => dispatchReplay({ type: "seek", time: Number(event.target.value) })}
                    className="w-full"
                  />
                </div>
                <span className="text-sm font-mono">{formatDateTime(new Date(replay.time))}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map Container */}
        <div
          className="relative rounded-lg overflow-hidden border bg-gray-100 dark:bg-muted"
          style={{ height: "calc(100vh - 380px)", minHeight: "500px" }}
        >
          <React.Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading map...</div>
              </div>
            }
          >
            <MapComponent
              mapStyle={settings.mapStyle}
              incidents={filteredIncidents}
              onIncidentClick={setSelectedIncident}
              selectedIncident={selectedIncident}
              replayMode={filters.replayMode}
            />
          </React.Suspense>

          {/* Incident Drawer */}
          <AnimatePresence>
            {selectedIncident && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25 }}
                className="absolute top-0 right-0 bottom-0 w-80 bg-background/95 backdrop-blur border-l shadow-xl overflow-y-auto z-[200]"
              >
                <div className="p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{CATEGORY_ICONS[selectedIncident.category]}</span>
                        <Badge
                          variant="outline"
                          style={{ borderColor: CATEGORY_COLORS[selectedIncident.category] }}
                        >
                          {selectedIncident.category}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedIncident.status)}`} />
                      </div>
                      <h3 className="font-semibold">{selectedIncident.title}</h3>
                      {selectedIncident.subtype && (
                        <span className="text-xs text-muted-foreground">{selectedIncident.subtype}</span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIncident(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Severity & Confidence */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-lg p-2 ${getSeverityColor(selectedIncident.severity)}`}>
                      <div className="text-xs opacity-70">Severity</div>
                      <div className="text-lg font-bold">{selectedIncident.severity}</div>
                    </div>
                    <div className="rounded-lg p-2 bg-muted">
                      <div className="text-xs opacity-70">Confidence</div>
                      <div className="text-lg font-bold capitalize">{selectedIncident.confidence}</div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedIncident.description && (
                    <div>
                      <Label className="text-xs">Description</Label>
                      <p className="text-sm text-muted-foreground mt-1">{selectedIncident.description}</p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reported:</span>
                      <span>{formatDateTime(selectedIncident.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated:</span>
                      <span>{formatDateTime(selectedIncident.updatedAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className="capitalize">
                        {selectedIncident.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Source */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Source:</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary">{selectedIncident.source}</Badge>
                      {selectedIncident.sourceUrl && (
                        <a
                          href={selectedIncident.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend */}
        <Card className="mt-4">
          <CardContent className="py-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">Status:</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Active</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Resolving</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Cleared</span>
                </div>
              </div>
              <div className="text-muted-foreground">
                Situational awareness only • Not for emergency response
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
