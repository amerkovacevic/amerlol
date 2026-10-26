"use client"

import * as React from "react"
import { Calendar, Clock, Copy, Moon, Plus, Search, Sun, X } from "lucide-react"
import { toast } from "sonner"
import { useAppSettings } from "@/components/apps/settings-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatZoneTime, timezoneOffset } from "@/lib/apps/timezone"
import { copyText } from "@/lib/browser"
import { useNow } from "@/lib/hooks/use-now"
import { useResettableState } from "@/lib/hooks/use-resettable-state"

interface Zone {
  id: string
  name: string
  city: string
}

const POPULAR_ZONES: Zone[] = [
  { id: "America/New_York", name: "Eastern Time", city: "New York" },
  { id: "America/Chicago", name: "Central Time", city: "Chicago" },
  { id: "America/Denver", name: "Mountain Time", city: "Denver" },
  { id: "America/Los_Angeles", name: "Pacific Time", city: "Los Angeles" },
  { id: "Europe/London", name: "Greenwich Mean Time", city: "London" },
  { id: "Europe/Paris", name: "Central European Time", city: "Paris" },
  { id: "Asia/Tokyo", name: "Japan Standard Time", city: "Tokyo" },
  { id: "Asia/Shanghai", name: "China Standard Time", city: "Shanghai" },
  { id: "Asia/Dubai", name: "Gulf Standard Time", city: "Dubai" },
  { id: "Australia/Sydney", name: "Australian Eastern Time", city: "Sydney" },
  { id: "America/Sao_Paulo", name: "Brasilia Time", city: "São Paulo" },
  { id: "Asia/Kolkata", name: "India Standard Time", city: "Kolkata" },
]

const MAX_SEARCH_RESULTS = 20

function zoneFromId(id: string): Zone {
  return { id, name: id, city: id.split("/").pop()!.replaceAll("_", " ") }
}

// Built on first search; there are several hundred zones.
let allZones: Zone[] | null = null
function getAllZones(): Zone[] {
  return (allZones ??= Intl.supportedValuesOf("timeZone").map(zoneFromId))
}

const isDaytime = (zone: string, date: Date) => {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).format(date)
  )
  return hour >= 6 && hour < 18
}

const formatFull = (zone: string, date: Date, hour12: boolean, showSeconds: boolean) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
    hour12,
  }).format(date)

export function TimeZoneConverter() {
  const settings = useAppSettings("timezone")
  const zoneDefaultsKey = settings.defaultTimeZones.join(",")
  const defaultZones = React.useMemo(
    () =>
      zoneDefaultsKey.split(",").map((id) => POPULAR_ZONES.find((zone) => zone.id === id) ?? zoneFromId(id)),
    [zoneDefaultsKey]
  )
  // Saved defaults replace the list; additions and removals last until they change.
  const [zones, setZones] = useResettableState(defaultZones, zoneDefaultsKey)
  const now = useNow(1000, settings.autoRefresh)
  const [selectedDate, setSelectedDate] = React.useState("")
  const [selectedTime, setSelectedTime] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [showSearch, setShowSearch] = React.useState(false)

  const customDate = selectedDate && selectedTime ? new Date(`${selectedDate}T${selectedTime}`) : null
  const displayDate = customDate ?? now

  const searchResults = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return POPULAR_ZONES
    return getAllZones()
      .filter((zone) => zone.city.toLowerCase().includes(query) || zone.id.toLowerCase().includes(query))
      .slice(0, MAX_SEARCH_RESULTS)
  }, [searchQuery])

  const addZone = (zone: Zone) => {
    if (zones.some(({ id }) => id === zone.id)) {
      toast.error("Time zone already added")
      return
    }
    setZones([...zones, zone])
    setShowSearch(false)
    setSearchQuery("")
    toast.success(`Added ${zone.city}`)
  }

  const removeZone = (id: string) => {
    if (zones.length <= 1) {
      toast.error("At least one time zone must be displayed")
      return
    }
    setZones(zones.filter((zone) => zone.id !== id))
    toast.success("Time zone removed")
  }

  const clearCustomTime = () => {
    setSelectedDate("")
    setSelectedTime("")
    toast.info("Using current time")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date & Time
          </CardTitle>
          <CardDescription>
            Choose a specific date and time to convert, or leave empty to use current time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.target.value)}
              />
            </div>
            {(selectedDate || selectedTime) && (
              <div className="flex items-end">
                <Button variant="outline" onClick={clearCustomTime}>
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Time Zones</h2>
        <Button onClick={() => setShowSearch(!showSearch)} variant="outline" aria-expanded={showSearch}>
          <Plus className="mr-2 h-4 w-4" />
          Add Time Zone
        </Button>
      </div>

      {showSearch && (
        <Card>
          <CardHeader>
            <CardTitle>Search Time Zones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search time zones"
                placeholder="Search by city or timezone..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {searchResults.map((zone) => (
                <Button
                  key={zone.id}
                  variant="ghost"
                  className="h-auto w-full justify-between py-2"
                  onClick={() => addZone(zone)}
                >
                  <span className="text-left">
                    <span className="block font-medium">{zone.city}</span>
                    <span className="block text-sm text-muted-foreground">{zone.id}</span>
                  </span>
                  {displayDate && (
                    <span className="text-sm text-muted-foreground">
                      {timezoneOffset(zone.id, displayDate)}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => {
          const day = displayDate ? isDaytime(zone.id, displayDate) : true
          return (
            <Card key={zone.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{zone.city}</CardTitle>
                    <CardDescription>{zone.name}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeZone(zone.id)}
                    aria-label={`Remove ${zone.city}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  {settings.showDayNight && displayDate ? (
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {day ? (
                        <Sun className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Moon className="h-5 w-5 text-blue-500" />
                      )}
                      {day ? "Day" : "Night"}
                    </span>
                  ) : (
                    <span />
                  )}
                  {displayDate && (
                    <span className="text-sm text-muted-foreground">
                      {timezoneOffset(zone.id, displayDate)}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="font-mono text-2xl font-bold">
                    {displayDate
                      ? formatZoneTime(zone.id, displayDate, settings.timeFormat, settings.showSeconds)
                      : "--:--"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {displayDate
                      ? new Intl.DateTimeFormat("en-US", { timeZone: zone.id, dateStyle: "medium" }).format(
                          displayDate
                        )
                      : " "}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!displayDate}
                  onClick={() =>
                    displayDate &&
                    copyText(
                      formatFull(zone.id, displayDate, settings.timeFormat === "12", settings.showSeconds),
                      `Copied time for ${zone.city}`
                    )
                  }
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Time
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {zones.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">
              No time zones selected. Add a time zone to get started.
            </p>
            <Button onClick={() => setShowSearch(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Time Zone
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
