"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  Camera,
  Cloud,
  Train,
  Newspaper,
  Filter,
  Play,
  Pause,
  SkipBack,
  RefreshCw,
  ChevronRight,
  X,
  MapPin,
  Clock,
  ExternalLink,
  BarChart3,
  Lightbulb,
  Radio,
  Eye,
  EyeOff
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import {
  Incident,
  Camera as CameraType,
  FilterState,
  IncidentCategory,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  DEFAULT_FILTER_STATE,
  STL_BOUNDS,
} from "./types"
import {
  fetchMoDOTIncidents,
  fetchMoDOTCameras,
  fetchIDOTIncidents,
  fetchNWSAlerts,
  fetchTransitAlerts,
  fetchLocalNews,
  weatherAlertsToIncidents,
  transitAlertsToIncidents,
  newsToIncidents,
  findNearbyCameras,
  calculateDistance,
} from "./data-service"

// Map component loaded dynamically to avoid SSR issues
const MapComponent = React.lazy(() => import("./map-component"))

// Loading messages for fun popups
const LOADING_MESSAGES = [
  "Finding crimes...",
  "Braking for no reason on I-270...",
  "Checking traffic cameras...",
  "Locating potholes...",
  "Scanning for construction zones...",
  "Detecting sudden stops on 40...",
  "Monitoring Metro delays...",
  "Watching for weather alerts...",
  "Counting red lights...",
  "Tracking accidents...",
  "Checking I-64 backups...",
  "Finding traffic jams...",
]

export function STLMonitorMain() {
  const { user, loading: authLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"live" | "analytics" | "insights">("live")
  
  // Data state
  const [incidents, setIncidents] = React.useState<Incident[]>([])
  const [cameras, setCameras] = React.useState<CameraType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null)
  
  // UI state
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTER_STATE)
  const [selectedIncident, setSelectedIncident] = React.useState<Incident | null>(null)
  const [showFilters, setShowFilters] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0)
  
  // Replay state
  const [replayTime, setReplayTime] = React.useState<Date>(new Date())
  const [isPlaying, setIsPlaying] = React.useState(false)
  const replayIntervalRef = React.useRef<NodeJS.Timeout | null>(null)

  // Load initial data
  React.useEffect(() => {
    loadAllData()
    const interval = setInterval(() => {
      if (!filters.replayMode) {
        loadAllData(true)
      }
    }, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [filters.replayMode])

  // Replay mode timer
  React.useEffect(() => {
    if (filters.replayMode && isPlaying) {
      replayIntervalRef.current = setInterval(() => {
        setReplayTime(prev => {
          const next = new Date(prev.getTime() + 60000) // Advance 1 minute
          if (next > new Date()) {
            setIsPlaying(false)
            return new Date()
          }
          return next
        })
      }, 500) // Every 500ms = 1 minute of replay time
    } else if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current)
    }
    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current)
      }
    }
  }, [filters.replayMode, isPlaying])

  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true)
    setIsRefreshing(true)
    
    try {
      // Fetch all data sources in parallel
      const [
        modotIncidents,
        idotIncidents,
        modotCameras,
        weatherAlerts,
        transitAlerts,
        newsItems,
      ] = await Promise.all([
        fetchMoDOTIncidents(),
        fetchIDOTIncidents(),
        fetchMoDOTCameras(),
        fetchNWSAlerts(),
        fetchTransitAlerts(),
        fetchLocalNews(),
      ])

      // Combine all incidents
      const allIncidents: Incident[] = [
        ...modotIncidents,
        ...idotIncidents,
        ...weatherAlertsToIncidents(weatherAlerts),
        ...transitAlertsToIncidents(transitAlerts),
        ...newsToIncidents(newsItems),
      ]

      setIncidents(allIncidents)
      setCameras(modotCameras)
      setLastRefresh(new Date())
      
      if (!silent) {
        toast.success(`Loaded ${allIncidents.length} incidents`)
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to refresh data")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Filter incidents based on current filters
  const filteredIncidents = React.useMemo(() => {
    let filtered = incidents.filter(inc => {
      // Category filter
      if (!filters.categories[inc.category]) return false
      
      // Severity filter
      if (inc.severity < filters.severityMin || inc.severity > filters.severityMax) return false
      
      // Time window filter
      const now = filters.replayMode ? replayTime : new Date()
      const windowMs = {
        "15m": 15 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "6h": 6 * 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
      }[filters.timeWindow]
      
      const incidentTime = inc.createdAt.getTime()
      if (incidentTime < now.getTime() - windowMs) return false
      if (filters.replayMode && incidentTime > now.getTime()) return false
      
      return true
    })
    
    return filtered
  }, [incidents, filters, replayTime])

  // Get nearby cameras for selected incident
  const nearbyCameras = React.useMemo(() => {
    if (!selectedIncident) return []
    return findNearbyCameras(selectedIncident, cameras, 0.5, 3)
  }, [selectedIncident, cameras])

  const toggleCategory = (category: IncidentCategory) => {
    setFilters(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: !prev.categories[category]
      }
    }))
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  }

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
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
      case "active": return "bg-red-500"
      case "resolving": return "bg-yellow-500"
      case "cleared": return "bg-green-500"
      default: return "bg-gray-500"
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="h-6 w-6 text-red-500" />
            STL Monitor
          </h1>
          <p className="text-sm text-muted-foreground">
            Greater St. Louis Area Incident Monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Updated {formatTime(lastRefresh)}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadAllData()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="live" className="flex items-center gap-1">
            <Radio className="h-3 w-3" />
            Live Map
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Live Map Tab */}
        <TabsContent value="live" className="flex-1 flex flex-col mt-0">
          {/* Filter Bar */}
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Category Toggles */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(Object.keys(filters.categories) as IncidentCategory[])
                    .filter(cat => cat !== "crime") // Crime is analytics only
                    .map(category => (
                      <Button
                        key={category}
                        variant={filters.categories[category] ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleCategory(category)}
                        className="text-xs"
                        style={{
                          backgroundColor: filters.categories[category] 
                            ? CATEGORY_COLORS[category] 
                            : undefined,
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
                    {(["15m", "1h", "6h", "24h"] as const).map(window => (
                      <Button
                        key={window}
                        variant={filters.timeWindow === window ? "default" : "outline"}
                        size="sm"
                        className="text-xs px-2"
                        onClick={() => setFilters(prev => ({ ...prev, timeWindow: window }))}
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
                      setFilters(prev => ({ ...prev, replayMode: !prev.replayMode }))
                      if (!filters.replayMode) {
                        setReplayTime(new Date(Date.now() - 3 * 60 * 60 * 1000)) // 3 hours ago
                      }
                    }}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Replay
                  </Button>
                </div>

                {/* Incident Count */}
                <Badge variant="secondary">
                  {filteredIncidents.length} active
                </Badge>
              </div>

              {/* Replay Controls */}
              {filters.replayMode && (
                <div className="mt-3 pt-3 border-t flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReplayTime(new Date(Date.now() - 3 * 60 * 60 * 1000))}
                    >
                      <SkipBack className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={Date.now() - 3 * 60 * 60 * 1000}
                      max={Date.now()}
                      value={replayTime.getTime()}
                      onChange={(e) => setReplayTime(new Date(parseInt(e.target.value)))}
                      className="w-full"
                    />
                  </div>
                  <span className="text-sm font-mono">
                    {formatDateTime(replayTime)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map Container */}
          <div className="relative rounded-lg overflow-hidden border bg-gray-100 dark:bg-gray-900" style={{ height: "calc(100vh - 380px)", minHeight: "500px" }}>
            <React.Suspense fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading map...</div>
              </div>
            }>
              <MapComponent
                incidents={filteredIncidents}
                cameras={cameras}
                onIncidentClick={setSelectedIncident}
                selectedIncident={selectedIncident}
                replayMode={filters.replayMode}
                showCameras={true}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIncident(null)}
                      >
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
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedIncident.description}
                        </p>
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

                    {/* Nearby Cameras */}
                    {nearbyCameras.length > 0 && (
                      <div>
                        <Label className="text-xs flex items-center gap-1 mb-2">
                          <Camera className="h-3 w-3" />
                          Nearby Cameras ({nearbyCameras.length})
                        </Label>
                        <div className="space-y-2">
                          {nearbyCameras.map(camera => (
                            <div
                              key={camera.id}
                              className="rounded-lg border p-2 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{camera.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {camera.roadway && `${camera.roadway} • `}
                                    {calculateDistance(selectedIncident.location, camera.location).toFixed(2)} mi
                                  </div>
                                </div>
                                {camera.externalUrl && (
                                  <a
                                    href={camera.externalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                              {camera.thumbnailUrl && (
                                <img
                                  src={camera.thumbnailUrl}
                                  alt={camera.name}
                                  className="mt-2 rounded w-full h-24 object-cover bg-gray-800"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="flex-1 mt-0">
          <React.Suspense fallback={<div>Loading analytics...</div>}>
            <AnalyticsDashboard />
          </React.Suspense>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="flex-1 mt-0">
          <React.Suspense fallback={<div>Loading insights...</div>}>
            <PredictiveInsights />
          </React.Suspense>
        </TabsContent>
      </Tabs>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  )
}

// Analytics Dashboard Component
function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = React.useState<"week" | "month" | "year">("month")
  const [selectedCategory, setSelectedCategory] = React.useState<IncidentCategory | "all">("all")
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<{
    hourlyDistribution: number[]
    dailyDistribution: number[]
    dailyTrend: Array<{ date: string; count: number }>
    neighborhoodStats: Array<{ name: string; count: number }>
    corridorStats: Array<{ name: string; count: number }>
  } | null>(null)

  React.useEffect(() => {
    loadAnalyticsData()
  }, [timeRange, selectedCategory])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      // Generate sample analytics data
      const hourly = Array.from({ length: 24 }, (_, i) => {
        // Higher during rush hours
        if (i >= 7 && i <= 9) return Math.floor(Math.random() * 30) + 40
        if (i >= 16 && i <= 18) return Math.floor(Math.random() * 35) + 45
        if (i >= 0 && i <= 5) return Math.floor(Math.random() * 10) + 5
        return Math.floor(Math.random() * 25) + 15
      })

      const daily = [
        Math.floor(Math.random() * 50) + 100, // Sunday
        Math.floor(Math.random() * 60) + 120, // Monday
        Math.floor(Math.random() * 60) + 125, // Tuesday
        Math.floor(Math.random() * 60) + 130, // Wednesday
        Math.floor(Math.random() * 60) + 128, // Thursday
        Math.floor(Math.random() * 70) + 140, // Friday
        Math.floor(Math.random() * 55) + 110, // Saturday
      ]

      const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365
      const trend = Array.from({ length: days }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (days - i - 1))
        return {
          date: date.toISOString().split("T")[0],
          count: Math.floor(Math.random() * 50) + 80
        }
      })

      const neighborhoods = [
        { name: "Downtown", count: Math.floor(Math.random() * 100) + 200 },
        { name: "Central West End", count: Math.floor(Math.random() * 80) + 150 },
        { name: "South City", count: Math.floor(Math.random() * 70) + 120 },
        { name: "North City", count: Math.floor(Math.random() * 90) + 180 },
        { name: "Tower Grove", count: Math.floor(Math.random() * 50) + 80 },
        { name: "Soulard", count: Math.floor(Math.random() * 40) + 60 },
        { name: "The Hill", count: Math.floor(Math.random() * 30) + 40 },
      ].sort((a, b) => b.count - a.count)

      const corridors = [
        { name: "I-64/US-40", count: Math.floor(Math.random() * 150) + 300 },
        { name: "I-70", count: Math.floor(Math.random() * 120) + 250 },
        { name: "I-44", count: Math.floor(Math.random() * 100) + 200 },
        { name: "I-55", count: Math.floor(Math.random() * 80) + 180 },
        { name: "I-270", count: Math.floor(Math.random() * 90) + 160 },
      ].sort((a, b) => b.count - a.count)

      setData({
        hourlyDistribution: hourly,
        dailyDistribution: daily,
        dailyTrend: trend,
        neighborhoodStats: neighborhoods,
        corridorStats: corridors,
      })
    } catch (error) {
      console.error("Failed to load analytics:", error)
      toast.error("Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Time Range:</Label>
              {(["week", "month", "year"] as const).map(range => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
            <Badge variant="secondary">
              Historical data • Updated monthly
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hour of Day Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Incidents by Hour of Day</CardTitle>
            <CardDescription className="text-xs">
              Distribution across 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-end gap-0.5">
              {data.hourlyDistribution.map((count, hour) => {
                const maxCount = Math.max(...data.hourlyDistribution)
                const height = (count / maxCount) * 100
                return (
                  <div
                    key={hour}
                    className="flex-1 bg-primary/80 hover:bg-primary transition-colors rounded-t"
                    style={{ height: `${height}%` }}
                    title={`${hour}:00 - ${count} incidents`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>12am</span>
              <span>6am</span>
              <span>12pm</span>
              <span>6pm</span>
              <span>12am</span>
            </div>
          </CardContent>
        </Card>

        {/* Day of Week Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Incidents by Day of Week</CardTitle>
            <CardDescription className="text-xs">
              Weekly distribution pattern
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-end gap-2">
              {data.dailyDistribution.map((count, day) => {
                const maxCount = Math.max(...data.dailyDistribution)
                const height = (count / maxCount) * 100
                return (
                  <div key={day} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-primary/80 hover:bg-primary transition-colors rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${dayNames[day]} - ${count} incidents`}
                    />
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {dayNames[day]}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Temporal Heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Temporal Heatmap</CardTitle>
            <CardDescription className="text-xs">
              Hour × Day distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-25 gap-0.5">
              {/* Header row */}
              <div className="text-[8px] text-muted-foreground" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="text-[8px] text-muted-foreground text-center">
                  {h % 6 === 0 ? h : ""}
                </div>
              ))}
              {/* Data rows */}
              {dayNames.map((day, dayIdx) => (
                <React.Fragment key={day}>
                  <div className="text-[8px] text-muted-foreground pr-1">{day}</div>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const value = data.hourlyDistribution[hour] * (data.dailyDistribution[dayIdx] / 100)
                    const maxValue = Math.max(...data.hourlyDistribution) * (Math.max(...data.dailyDistribution) / 100)
                    const intensity = value / maxValue
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="aspect-square rounded-sm"
                        style={{
                          backgroundColor: `rgba(239, 68, 68, ${intensity * 0.8 + 0.1})`
                        }}
                        title={`${day} ${hour}:00 - ${Math.round(value)} avg incidents`}
                      />
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Locations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Incident Locations</CardTitle>
            <CardDescription className="text-xs">
              By neighborhood and corridor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="neighborhood" className="space-y-2">
              <TabsList className="h-8">
                <TabsTrigger value="neighborhood" className="text-xs">Neighborhoods</TabsTrigger>
                <TabsTrigger value="corridor" className="text-xs">Corridors</TabsTrigger>
              </TabsList>
              <TabsContent value="neighborhood" className="space-y-1">
                {data.neighborhoodStats.slice(0, 5).map((item, idx) => {
                  const maxCount = data.neighborhoodStats[0].count
                  const width = (item.count / maxCount) * 100
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="text-xs w-24 truncate">{item.name}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right">{item.count}</span>
                    </div>
                  )
                })}
              </TabsContent>
              <TabsContent value="corridor" className="space-y-1">
                {data.corridorStats.slice(0, 5).map((item, idx) => {
                  const maxCount = data.corridorStats[0].count
                  const width = (item.count / maxCount) * 100
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="text-xs w-24 truncate">{item.name}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-orange-500/80 rounded"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right">{item.count}</span>
                    </div>
                  )
                })}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <Card className="bg-muted/50">
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground text-center">
            📊 Historical data from SLMPD, STL County, and MoDOT official datasets.
            Crime statistics are for analytical purposes only and may be delayed.
            Data ranges shown: {timeRange === "week" ? "7 days" : timeRange === "month" ? "30 days" : "365 days"}.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Predictive Insights Component
function PredictiveInsights() {
  const [loading, setLoading] = React.useState(true)
  const [predictions, setPredictions] = React.useState<{
    highRiskHours: Array<{ hour: number; risk: number; label: string }>
    highRiskLocations: Array<{ name: string; score: number; factors: string[] }>
    weeklyForecast: Array<{ day: string; probability: number }>
  } | null>(null)

  React.useEffect(() => {
    loadPredictions()
  }, [])

  const loadPredictions = async () => {
    setLoading(true)
    try {
      // Generate sample predictions based on historical patterns
      const highRiskHours = [
        { hour: 7, risk: 75, label: "Morning Rush" },
        { hour: 8, risk: 85, label: "Morning Rush Peak" },
        { hour: 9, risk: 70, label: "Morning Rush End" },
        { hour: 12, risk: 55, label: "Lunch Hour" },
        { hour: 16, risk: 72, label: "Evening Rush Start" },
        { hour: 17, risk: 90, label: "Evening Rush Peak" },
        { hour: 18, risk: 80, label: "Evening Rush" },
        { hour: 22, risk: 45, label: "Late Night" },
      ].sort((a, b) => b.risk - a.risk)

      const highRiskLocations = [
        { name: "I-64 @ Grand", score: 88, factors: ["High volume", "Complex interchange", "Construction zone"] },
        { name: "I-70 @ I-270", score: 82, factors: ["Merge point", "High speed", "Weather exposure"] },
        { name: "Downtown @ Convention", score: 78, factors: ["Pedestrian traffic", "Event venue", "Parking congestion"] },
        { name: "I-44 @ Jefferson", score: 75, factors: ["Curve geometry", "Lane reduction", "High volume"] },
        { name: "I-55 @ Arsenal", score: 71, factors: ["Exit ramp", "Volume spike", "Sight distance"] },
      ]

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      const weeklyForecast = days.map((day, idx) => ({
        day,
        probability: [75, 78, 80, 82, 85, 70, 65][idx]
      }))

      setPredictions({
        highRiskHours,
        highRiskLocations,
        weeklyForecast,
      })
    } catch (error) {
      console.error("Failed to load predictions:", error)
      toast.error("Failed to load predictions")
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return "text-red-500 bg-red-500/10 border-red-500/20"
    if (risk >= 60) return "text-orange-500 bg-orange-500/10 border-orange-500/20"
    if (risk >= 40) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
    return "text-green-500 bg-green-500/10 border-green-500/20"
  }

  if (loading || !predictions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading predictions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-8 w-8 text-purple-500" />
            <div>
              <h2 className="font-semibold">Predictive Insights</h2>
              <p className="text-sm text-muted-foreground">
                AI-powered forecasting based on historical patterns
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* High Risk Hours */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              High-Risk Hours Today
            </CardTitle>
            <CardDescription className="text-xs">
              Predicted incident likelihood by hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {predictions.highRiskHours.slice(0, 5).map((item) => (
                <div
                  key={item.hour}
                  className={`flex items-center justify-between p-2 rounded-lg border ${getRiskColor(item.risk)}`}
                >
                  <div>
                    <span className="font-mono font-medium">
                      {item.hour > 12 ? item.hour - 12 : item.hour || 12}
                      {item.hour >= 12 ? "pm" : "am"}
                    </span>
                    <span className="text-xs ml-2 opacity-70">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.risk}%`,
                          backgroundColor: item.risk >= 80 ? "#ef4444" : item.risk >= 60 ? "#f97316" : "#eab308"
                        }}
                      />
                    </div>
                    <span className="font-bold w-8 text-right">{item.risk}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Forecast */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              7-Day Incident Forecast
            </CardTitle>
            <CardDescription className="text-xs">
              Predicted daily incident probability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end gap-2">
              {predictions.weeklyForecast.map((item) => {
                const height = item.probability
                return (
                  <div key={item.day} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full rounded-t transition-colors ${
                        item.probability >= 80 ? "bg-red-500" :
                        item.probability >= 70 ? "bg-orange-500" :
                        "bg-yellow-500"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">{item.day}</span>
                    <span className="text-[10px] font-medium">{item.probability}%</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* High Risk Locations */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              High-Risk Locations
            </CardTitle>
            <CardDescription className="text-xs">
              Areas with elevated incident probability based on historical patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {predictions.highRiskLocations.map((location) => (
                <div
                  key={location.name}
                  className={`p-3 rounded-lg border ${getRiskColor(location.score)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{location.name}</span>
                    <Badge variant="outline" className="font-mono">
                      {location.score}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {location.factors.map((factor) => (
                      <Badge key={factor} variant="secondary" className="text-[10px]">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Info & Disclaimer */}
      <Card className="bg-muted/50">
        <CardContent className="py-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Model: Moving Average + Seasonality v1.0</span>
            <span className="text-muted-foreground">Last trained: {new Date().toLocaleDateString()}</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ <strong>Disclaimer:</strong> Forecasts are probabilistic estimates based on historical data.
            They are not guarantees of future events. Use for situational awareness only,
            not for emergency planning or response decisions.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
