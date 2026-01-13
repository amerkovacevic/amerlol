"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  X, 
  Copy, 
  Search, 
  Clock,
  Sun,
  Moon,
  Calendar
} from "lucide-react"
import { toast } from "sonner"

interface TimeZone {
  id: string
  name: string
  city: string
  offset: number
  abbreviation: string
}

// Popular time zones
const POPULAR_TIMEZONES: TimeZone[] = [
  { id: "America/New_York", name: "Eastern Time", city: "New York", offset: -5, abbreviation: "EST" },
  { id: "America/Chicago", name: "Central Time", city: "Chicago", offset: -6, abbreviation: "CST" },
  { id: "America/Denver", name: "Mountain Time", city: "Denver", offset: -7, abbreviation: "MST" },
  { id: "America/Los_Angeles", name: "Pacific Time", city: "Los Angeles", offset: -8, abbreviation: "PST" },
  { id: "Europe/London", name: "Greenwich Mean Time", city: "London", offset: 0, abbreviation: "GMT" },
  { id: "Europe/Paris", name: "Central European Time", city: "Paris", offset: 1, abbreviation: "CET" },
  { id: "Asia/Tokyo", name: "Japan Standard Time", city: "Tokyo", offset: 9, abbreviation: "JST" },
  { id: "Asia/Shanghai", name: "China Standard Time", city: "Shanghai", offset: 8, abbreviation: "CST" },
  { id: "Asia/Dubai", name: "Gulf Standard Time", city: "Dubai", offset: 4, abbreviation: "GST" },
  { id: "Australia/Sydney", name: "Australian Eastern Time", city: "Sydney", offset: 10, abbreviation: "AEST" },
  { id: "America/Sao_Paulo", name: "Brasilia Time", city: "São Paulo", offset: -3, abbreviation: "BRT" },
  { id: "Asia/Kolkata", name: "India Standard Time", city: "Mumbai", offset: 5.5, abbreviation: "IST" },
]

const ALL_TIMEZONES = Intl.supportedValuesOf("timeZone").map((tz) => {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  })
  const parts = formatter.formatToParts(now)
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value || ""
  
  // Get offset
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }))
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }))
  const offset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
  
  // Extract city name
  const city = tz.split("/").pop()?.replace(/_/g, " ") || tz
  
  return {
    id: tz,
    name: tz,
    city: city,
    offset: offset,
    abbreviation: tzName,
  }
})

export function TimeZoneConverter() {
  const [selectedTimeZones, setSelectedTimeZones] = React.useState<TimeZone[]>([
    POPULAR_TIMEZONES[0], // New York
    POPULAR_TIMEZONES[4], // London
    POPULAR_TIMEZONES[6], // Tokyo
  ])
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<string>("")
  const [selectedTime, setSelectedTime] = React.useState<string>("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [showSearch, setShowSearch] = React.useState(false)

  // Update current time every second
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Get time in a specific timezone
  const getTimeInZone = (timeZone: TimeZone, date?: Date) => {
    let dateToUse: Date
    if (selectedDate && selectedTime) {
      // Create date from selected date and time in local timezone
      const [hours, minutes] = selectedTime.split(":").map(Number)
      dateToUse = new Date(selectedDate)
      dateToUse.setHours(hours, minutes, 0, 0)
    } else {
      dateToUse = date || currentTime
    }

    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone.id,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(dateToUse)
    } catch {
      return "Invalid timezone"
    }
  }

  // Get hour for day/night indicator
  const getHourInZone = (timeZone: TimeZone) => {
    let dateToUse: Date
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number)
      dateToUse = new Date(selectedDate)
      dateToUse.setHours(hours, minutes, 0, 0)
    } else {
      dateToUse = currentTime
    }

    try {
      return parseInt(
        new Intl.DateTimeFormat("en-US", {
          timeZone: timeZone.id,
          hour: "2-digit",
          hour12: false,
        }).format(dateToUse)
      )
    } catch {
      return 12
    }
  }

  const isDayTime = (hour: number) => {
    return hour >= 6 && hour < 18
  }

  const addTimeZone = (timeZone: TimeZone) => {
    if (selectedTimeZones.some((tz) => tz.id === timeZone.id)) {
      toast.error("Time zone already added")
      return
    }
    setSelectedTimeZones([...selectedTimeZones, timeZone])
    setShowSearch(false)
    setSearchQuery("")
    toast.success(`Added ${timeZone.city}`)
  }

  const removeTimeZone = (id: string) => {
    if (selectedTimeZones.length <= 1) {
      toast.error("At least one time zone must be displayed")
      return
    }
    setSelectedTimeZones(selectedTimeZones.filter((tz) => tz.id !== id))
    toast.success("Time zone removed")
  }

  const copyTime = (timeZone: TimeZone) => {
    const time = getTimeInZone(timeZone)
    navigator.clipboard.writeText(time)
    toast.success(`Copied time for ${timeZone.city}`)
  }

  const filteredTimeZones = React.useMemo(() => {
    if (!searchQuery) return POPULAR_TIMEZONES

    const query = searchQuery.toLowerCase()
    return ALL_TIMEZONES.filter(
      (tz) =>
        tz.city.toLowerCase().includes(query) ||
        tz.id.toLowerCase().includes(query) ||
        tz.name.toLowerCase().includes(query)
    ).slice(0, 20) // Limit results
  }, [searchQuery])

  const clearCustomTime = () => {
    setSelectedDate("")
    setSelectedTime("")
    toast.info("Using current time")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">Time Zone Converter</h2>
        <p className="text-muted-foreground">
          Compare multiple time zones and convert times across the world
        </p>
      </div>

      {/* Date/Time Picker */}
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>
            {(selectedDate || selectedTime) && (
              <div className="flex items-end">
                <Button variant="outline" onClick={clearCustomTime}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Time Zone */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Time Zones</h3>
        <Button onClick={() => setShowSearch(!showSearch)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Time Zone
        </Button>
      </div>

      {showSearch && (
        <Card>
          <CardHeader>
            <CardTitle>Search Time Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by city or timezone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredTimeZones.map((tz) => (
                  <Button
                    key={tz.id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => addTimeZone(tz)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="text-left">
                        <div className="font-medium">{tz.city}</div>
                        <div className="text-sm text-muted-foreground">{tz.id}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        UTC{tz.offset >= 0 ? "+" : ""}{tz.offset}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Zone Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedTimeZones.map((tz) => {
          const hour = getHourInZone(tz)
          const isDay = isDayTime(hour)
          const timeString = getTimeInZone(tz)

          return (
            <Card key={tz.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{tz.city}</CardTitle>
                    <CardDescription>{tz.name}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeTimeZone(tz.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isDay ? (
                        <Sun className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Moon className="h-5 w-5 text-blue-500" />
                      )}
                      <span className="text-sm font-medium">
                        {isDay ? "Day" : "Night"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      UTC{tz.offset >= 0 ? "+" : ""}{tz.offset}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-2xl font-bold font-mono">
                      {timeString.split(",")[0]}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {timeString.split(",").slice(1).join(",")}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => copyTime(tz)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Time
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedTimeZones.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No time zones selected. Add a time zone to get started.
            </p>
            <Button onClick={() => setShowSearch(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Time Zone
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
