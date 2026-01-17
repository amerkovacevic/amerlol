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
  Plane,
  MapPin,
  Globe,
  Activity,
  BarChart3,
  Filter,
  RefreshCw,
  Clock,
  Gauge,
  TrendingUp,
  Users,
  AlertTriangle,
  Radar,
  Eye,
  X,
  ExternalLink,
  Navigation,
  Compass,
  Route,
  Info,
  Flag,
} from "lucide-react"
import { toast } from "sonner"
import type { MilitaryFlight, FilterState, MilitaryAircraftType, Country, ActivityType } from "./types"
import { DEFAULT_FILTER_STATE, COUNTRY_COLORS, AIRCRAFT_TYPE_ICONS } from "./types"
import { fetchLiveMilitaryFlights } from "./data-service"
import { MilitaryTrackerMap } from "./map-component"

const REFRESH_INTERVAL = 30000 // 30 seconds

export function MilitaryTrackerMain() {
  const [flights, setFlights] = React.useState<MilitaryFlight[]>([])
  const [loading, setLoading] = React.useState(true)
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"map" | "analytics" | "activity">("map")
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTER_STATE)
  const [selectedFlight, setSelectedFlight] = React.useState<MilitaryFlight | null>(null)
  const [showFilters, setShowFilters] = React.useState(false)

  // Load flights on mount and set up auto-refresh
  React.useEffect(() => {
    loadFlights()
    const interval = setInterval(() => {
      loadFlights(true)
    }, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const loadFlights = async (silent = false) => {
    if (!silent) setLoading(true)
    setIsRefreshing(true)
    
    try {
      const data = await fetchLiveMilitaryFlights()
      setFlights(data)
      setLastRefresh(new Date())
      if (!silent) {
        toast.success(`Tracked ${data.length} military aircraft`)
      }
    } catch (error) {
      console.error("Failed to load flights:", error)
      if (!silent) {
        toast.error("Failed to refresh flight data")
      }
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Filter flights
  const filteredFlights = React.useMemo(() => {
    return flights.filter(flight => {
      if (!filters.countries[flight.country]) return false
      if (!filters.aircraftTypes[flight.aircraftType]) return false
      if (!filters.activities[flight.activity]) return false
      if (!filters.visibility[flight.visibility]) return false
      
      const altitude = flight.position.altitude || 0
      if (altitude < filters.altitudeRange[0] || altitude > filters.altitudeRange[1]) return false
      
      const speed = flight.position.speed || 0
      if (speed < filters.speedRange[0] || speed > filters.speedRange[1]) return false
      
      if (!filters.showInactive && flight.status !== "en-route") return false
      
      return true
    })
  }, [flights, filters])

  // Analytics calculations
  const analytics = React.useMemo(() => {
    const byCountry: Record<Country, number> = {
      USA: 0, Russia: 0, China: 0, UK: 0, France: 0, Germany: 0, Japan: 0, Israel: 0, Other: 0,
    }
    const byType: Record<MilitaryAircraftType, number> = {
      Fighter: 0, Bomber: 0, Transport: 0, Tanker: 0, Reconnaissance: 0, Helicopter: 0, UAV: 0, Unknown: 0,
    }
    const byActivity: Record<ActivityType, number> = {
      Training: 0, Patrol: 0, Transport: 0, Reconnaissance: 0, Exercise: 0, Unknown: 0,
    }
    
    filteredFlights.forEach(flight => {
      byCountry[flight.country]++
      byType[flight.aircraftType]++
      byActivity[flight.activity]++
    })
    
    const totalAircraft = filteredFlights.length
    const totalAltitude = filteredFlights.reduce((sum, f) => sum + (f.position.altitude || 0), 0)
    const avgAltitude = totalAircraft > 0 ? totalAltitude / totalAircraft : 0
    
    return { byCountry, byType, byActivity, totalAircraft, avgAltitude }
  }, [filteredFlights])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  if (loading && flights.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="space-y-4">
            <Radar className="h-12 w-12 mx-auto text-primary animate-spin" />
            <p className="text-muted-foreground">Initializing radar systems...</p>
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
            <Radar className="h-6 w-6 text-red-500" />
            Airwatch
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time tracking of military aircraft worldwide
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
            onClick={() => loadFlights()}
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
          <TabsTrigger value="map" className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Live Map
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Live Map Tab */}
        <TabsContent value="map" className="flex-1 flex flex-col mt-0">
          {/* Filter Bar */}
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-3 w-3 mr-1" />
                    Filters
                  </Button>
                  <Badge variant="secondary">
                    {filteredFlights.length} active
                  </Badge>
                </div>
              </div>

              {/* Expanded Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Country Filter */}
                  <div>
                    <Label className="text-xs mb-2 block">Countries</Label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(filters.countries) as Country[]).map(country => (
                        <Button
                          key={country}
                          variant={filters.countries[country] ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilters(prev => ({
                            ...prev,
                            countries: { ...prev.countries, [country]: !prev.countries[country] }
                          }))}
                          style={{
                            backgroundColor: filters.countries[country] ? COUNTRY_COLORS[country] : undefined,
                          }}
                        >
                          {country}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Aircraft Type Filter */}
                  <div>
                    <Label className="text-xs mb-2 block">Aircraft Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(filters.aircraftTypes) as MilitaryAircraftType[]).map(type => (
                        <Button
                          key={type}
                          variant={filters.aircraftTypes[type] ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilters(prev => ({
                            ...prev,
                            aircraftTypes: { ...prev.aircraftTypes, [type]: !prev.aircraftTypes[type] }
                          }))}
                        >
                          <span className="mr-1">{AIRCRAFT_TYPE_ICONS[type]}</span>
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map Container */}
          <div className="relative rounded-lg overflow-hidden border bg-gray-100 dark:bg-gray-900" style={{ height: "calc(100vh - 380px)", minHeight: "500px" }}>
            <MilitaryTrackerMap
              flights={filteredFlights}
              onFlightClick={setSelectedFlight}
              selectedFlight={selectedFlight}
            />

            {/* Flight Details Drawer */}
            <AnimatePresence>
              {selectedFlight && (
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25 }}
                  className="absolute top-0 right-0 bottom-0 w-96 bg-background/95 backdrop-blur border-l shadow-xl overflow-y-auto z-[200]"
                >
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{AIRCRAFT_TYPE_ICONS[selectedFlight.aircraftType]}</span>
                          <Badge style={{ backgroundColor: COUNTRY_COLORS[selectedFlight.country] }}>
                            <Flag className="h-2.5 w-2.5 mr-1" />
                            {selectedFlight.country}
                          </Badge>
                          <Badge variant="outline">{selectedFlight.aircraftType}</Badge>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">
                          {selectedFlight.callsign || selectedFlight.flightNumber || "Unknown"}
                        </h3>
                        {selectedFlight.aircraftModel && (
                          <p className="text-sm text-muted-foreground font-medium">{selectedFlight.aircraftModel}</p>
                        )}
                        {selectedFlight.registration && (
                          <p className="text-xs text-muted-foreground mt-1">Reg: {selectedFlight.registration}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFlight(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="border-t pt-4 space-y-4">
                      {/* Current Status */}
                      <div>
                        <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                          <Plane className="h-3 w-3" />
                          Current Status
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg p-3 bg-muted">
                            <div className="text-xs opacity-70 mb-1">Altitude</div>
                            <div className="text-xl font-bold">
                              {selectedFlight.position.altitude ? `${selectedFlight.position.altitude.toLocaleString()} ft` : "N/A"}
                            </div>
                            {selectedFlight.position.altitude && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {selectedFlight.position.altitude > 40000 ? "High altitude" : 
                                 selectedFlight.position.altitude > 20000 ? "Cruising" : "Low altitude"}
                              </div>
                            )}
                          </div>
                          <div className="rounded-lg p-3 bg-muted">
                            <div className="text-xs opacity-70 mb-1">Speed</div>
                            <div className="text-xl font-bold">
                              {selectedFlight.position.speed ? `${selectedFlight.position.speed} kts` : "N/A"}
                            </div>
                            {selectedFlight.position.speed && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {selectedFlight.position.speed > 400 ? "Supersonic range" : 
                                 selectedFlight.position.speed > 300 ? "High speed" : "Normal speed"}
                              </div>
                            )}
                          </div>
                        </div>
                        {(selectedFlight.position.heading !== null || selectedFlight.position.speed) && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {selectedFlight.position.heading !== null && (
                              <div className="rounded-lg p-2 bg-muted flex items-center gap-2">
                                <Compass className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="text-xs opacity-70">Heading</div>
                                  <div className="text-sm font-semibold">{selectedFlight.position.heading}°</div>
                                </div>
                              </div>
                            )}
                            <div className="rounded-lg p-2 bg-muted flex items-center gap-2">
                              <Navigation className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-xs opacity-70">Status</div>
                                <div className="text-sm font-semibold capitalize">{selectedFlight.status}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Flight Information */}
                      <div>
                        <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                          <Route className="h-3 w-3" />
                          Flight Information
                        </Label>
                        {(selectedFlight.origin || selectedFlight.destination) ? (
                          <div className="space-y-2">
                            {selectedFlight.origin && (
                              <div className="rounded-lg p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                  <span className="text-xs font-semibold text-green-700 dark:text-green-300">Origin</span>
                                </div>
                                <div className="text-sm font-medium">
                                  {selectedFlight.origin.name || selectedFlight.origin.city || "Unknown Airport"}
                                </div>
                                {selectedFlight.origin.code && (
                                  <div className="text-xs text-muted-foreground mt-1">ICAO/IATA: {selectedFlight.origin.code}</div>
                                )}
                                {selectedFlight.origin.city && selectedFlight.origin.country && (
                                  <div className="text-xs text-muted-foreground">{selectedFlight.origin.city}, {selectedFlight.origin.country}</div>
                                )}
                              </div>
                            )}
                            {selectedFlight.destination && (
                              <div className="rounded-lg p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">Destination</span>
                                </div>
                                <div className="text-sm font-medium">
                                  {selectedFlight.destination.name || selectedFlight.destination.city || "Unknown Airport"}
                                </div>
                                {selectedFlight.destination.code && (
                                  <div className="text-xs text-muted-foreground mt-1">ICAO/IATA: {selectedFlight.destination.code}</div>
                                )}
                                {selectedFlight.destination.city && selectedFlight.destination.country && (
                                  <div className="text-xs text-muted-foreground">{selectedFlight.destination.city}, {selectedFlight.destination.country}</div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-lg p-3 bg-muted border border-dashed">
                            <div className="text-sm text-muted-foreground text-center">
                              Route information not available
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mission Context */}
                      <div>
                        <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                          <Activity className="h-3 w-3" />
                          Mission Context
                        </Label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                            <span className="text-xs text-muted-foreground">Activity Type</span>
                            <Badge variant="outline" className="font-medium">{selectedFlight.activity}</Badge>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">About this {selectedFlight.aircraftType}</div>
                            <div className="text-xs text-muted-foreground leading-relaxed">
                              {selectedFlight.aircraftType === "Fighter" && "Combat aircraft designed for air-to-air combat and ground attack missions."}
                              {selectedFlight.aircraftType === "Bomber" && "Strategic aircraft designed for long-range bombing missions."}
                              {selectedFlight.aircraftType === "Transport" && "Cargo aircraft used for transporting personnel, equipment, and supplies."}
                              {selectedFlight.aircraftType === "Tanker" && "Aerial refueling aircraft providing fuel to other military aircraft in flight."}
                              {selectedFlight.aircraftType === "Reconnaissance" && "Intelligence-gathering aircraft equipped with surveillance and monitoring systems."}
                              {selectedFlight.aircraftType === "Helicopter" && "Rotorcraft used for transport, search and rescue, and close air support."}
                              {selectedFlight.aircraftType === "UAV" && "Unmanned aerial vehicle used for reconnaissance, surveillance, and combat operations."}
                              {selectedFlight.aircraftType === "Unknown" && "Military aircraft type not yet classified."}
                            </div>
                          </div>
                          {selectedFlight.activity !== "Unknown" && (
                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Current Activity</div>
                              <div className="text-xs text-muted-foreground">
                                {selectedFlight.activity === "Training" && "Participating in training exercises or drills."}
                                {selectedFlight.activity === "Patrol" && "Conducting routine patrol or surveillance operations."}
                                {selectedFlight.activity === "Transport" && "Transporting personnel or cargo between locations."}
                                {selectedFlight.activity === "Reconnaissance" && "Gathering intelligence and surveillance data."}
                                {selectedFlight.activity === "Exercise" && "Participating in a military exercise or war games."}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Technical Details */}
                      <div>
                        <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                          <Info className="h-3 w-3" />
                          Technical Details
                        </Label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                            <span className="text-xs text-muted-foreground">Tracking Quality</span>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <Badge variant={selectedFlight.visibility === "high" ? "default" : "secondary"} className="text-xs">
                                {selectedFlight.visibility.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                            <span className="text-xs text-muted-foreground">Data Source</span>
                            <Badge variant="outline" className="text-xs">{selectedFlight.dataSource.toUpperCase()}</Badge>
                          </div>
                          {selectedFlight.registration && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                              <span className="text-xs text-muted-foreground">Registration</span>
                              <span className="text-xs font-mono font-medium">{selectedFlight.registration}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="border-t pt-3">
                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span>Last updated</span>
                            <span className="font-medium">{selectedFlight.lastUpdate.toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>First detected</span>
                            <span className="font-medium">{selectedFlight.firstSeen.toLocaleTimeString()}</span>
                          </div>
                          {selectedFlight.firstSeen && selectedFlight.lastUpdate && (
                            <div className="flex items-center justify-between pt-1 border-t">
                              <span>Time tracked</span>
                              <span className="font-medium">
                                {Math.round((selectedFlight.lastUpdate.getTime() - selectedFlight.firstSeen.getTime()) / 60000)} min
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="flex-1 mt-0">
          <AnalyticsDashboard analytics={analytics} flights={filteredFlights} />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="flex-1 mt-0">
          <ActivityDashboard flights={filteredFlights} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Analytics Dashboard Component
function AnalyticsDashboard({ analytics, flights }: { analytics: any; flights: MilitaryFlight[] }) {
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Aircraft</p>
                <p className="text-2xl font-bold">{analytics.totalAircraft}</p>
              </div>
              <Plane className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Altitude</p>
                <p className="text-2xl font-bold">{Math.round(analytics.avgAltitude).toLocaleString()} ft</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Countries</p>
                <p className="text-2xl font-bold">
                  {Object.values(analytics.byCountry).filter((count: any) => count > 0).length}
                </p>
              </div>
              <Globe className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Aircraft Types</p>
                <p className="text-2xl font-bold">
                  {Object.values(analytics.byType).filter((count: any) => count > 0).length}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* By Country */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Country</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(Object.entries(analytics.byCountry) as [Country, number][])
                .filter(([_, count]) => count > 0)
                .sort(([_, a], [__, b]) => b - a)
                .map(([country, count]) => {
                  const maxCount = Math.max(...Object.values(analytics.byCountry) as number[])
                  const width = (count / maxCount) * 100
                  return (
                    <div key={country} className="flex items-center gap-2">
                      <span className="text-xs w-16 truncate">{country}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{ 
                            width: `${width}%`,
                            backgroundColor: COUNTRY_COLORS[country]
                          }}
                        />
                      </div>
                      <span className="text-xs w-8 text-right">{count}</span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* By Aircraft Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Aircraft Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(Object.entries(analytics.byType) as [MilitaryAircraftType, number][])
                .filter(([_, count]) => count > 0)
                .sort(([_, a], [__, b]) => b - a)
                .map(([type, count]) => {
                  const maxCount = Math.max(...Object.values(analytics.byType) as number[])
                  const width = (count / maxCount) * 100
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <span className="text-xs mr-1">{AIRCRAFT_TYPE_ICONS[type]}</span>
                      <span className="text-xs w-24 truncate">{type}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-primary rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="text-xs w-8 text-right">{count}</span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* By Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(Object.entries(analytics.byActivity) as [ActivityType, number][])
                .filter(([_, count]) => count > 0)
                .sort(([_, a], [__, b]) => b - a)
                .map(([activity, count]) => {
                  const maxCount = Math.max(...Object.values(analytics.byActivity) as number[])
                  const width = (count / maxCount) * 100
                  return (
                    <div key={activity} className="flex items-center gap-2">
                      <span className="text-xs w-28 truncate">{activity}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-orange-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="text-xs w-8 text-right">{count}</span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Activity Dashboard Component
function ActivityDashboard({ flights }: { flights: MilitaryFlight[] }) {
  // Group flights by activity
  const activityGroups = React.useMemo(() => {
    const groups: Record<ActivityType, MilitaryFlight[]> = {
      Training: [], Patrol: [], Transport: [], Reconnaissance: [], Exercise: [], Unknown: [],
    }
    flights.forEach(flight => {
      groups[flight.activity].push(flight)
    })
    return groups
  }, [flights])

  return (
    <div className="space-y-4">
      {(Object.entries(activityGroups) as [ActivityType, MilitaryFlight[]][])
        .filter(([_, flights]) => flights.length > 0)
        .map(([activity, activityFlights]) => (
          <Card key={activity}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {activity} ({activityFlights.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activityFlights.slice(0, 10).map(flight => (
                  <div
                    key={flight.id}
                    className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{AIRCRAFT_TYPE_ICONS[flight.aircraftType]}</span>
                      <div>
                        <div className="font-medium text-sm">
                          {flight.callsign || flight.flightNumber || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {flight.aircraftModel} • {flight.country}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium">
                        {flight.position.altitude ? `${flight.position.altitude.toLocaleString()} ft` : "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {flight.position.speed ? `${flight.position.speed} kts` : "N/A"}
                      </div>
                    </div>
                  </div>
                ))}
                {activityFlights.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{activityFlights.length - 10} more flights
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
