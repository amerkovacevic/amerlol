"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { db } from "@/lib/firebase/config"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"
import { Trash2, Download, Upload, RotateCcw, Bell, Map, Eye, Clock } from "lucide-react"
import {
  STLMonitorSettings as STLMonitorSettingsType,
  DEFAULT_SETTINGS,
  IncidentCategory,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "./types"

export function STLMonitorSettings() {
  const { user, loading: authLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [settings, setSettings] = React.useState<STLMonitorSettingsType>(DEFAULT_SETTINGS)

  React.useEffect(() => {
    if (user && !authLoading) {
      loadSettings()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading])

  const loadSettings = async () => {
    if (!user) return

    try {
      setLoading(true)
      const settingsRef = doc(db, "users", user.uid, "stlMonitorSettings", "default")
      const settingsDoc = await getDoc(settingsRef)

      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        setSettings({
          defaultCategories: data.defaultCategories ?? DEFAULT_SETTINGS.defaultCategories,
          defaultSeverityRange: data.defaultSeverityRange ?? DEFAULT_SETTINGS.defaultSeverityRange,
          defaultTimeWindow: data.defaultTimeWindow ?? DEFAULT_SETTINGS.defaultTimeWindow,
          autoRefresh: data.autoRefresh ?? DEFAULT_SETTINGS.autoRefresh,
          refreshInterval: data.refreshInterval ?? DEFAULT_SETTINGS.refreshInterval,
          showCameraOverlay: data.showCameraOverlay ?? DEFAULT_SETTINGS.showCameraOverlay,
          cameraSearchRadius: data.cameraSearchRadius ?? DEFAULT_SETTINGS.cameraSearchRadius,
          mapStyle: data.mapStyle ?? DEFAULT_SETTINGS.mapStyle,
          clusterAtZoom: data.clusterAtZoom ?? DEFAULT_SETTINGS.clusterAtZoom,
          notifications: data.notifications ?? DEFAULT_SETTINGS.notifications,
        })
      } else {
        setSettings(DEFAULT_SETTINGS)
      }
    } catch (error: any) {
      console.error("Failed to load settings:", error)
      if (error.code !== "permission-denied") {
        toast.error("Failed to load settings")
      }
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    try {
      setSaving(true)
      const settingsRef = doc(db, "users", user.uid, "stlMonitorSettings", "default")
      const settingsDoc = await getDoc(settingsRef)

      const settingsData = {
        ...settings,
        updatedAt: serverTimestamp(),
      }

      if (settingsDoc.exists()) {
        await updateDoc(settingsRef, settingsData)
      } else {
        await setDoc(settingsRef, {
          ...settingsData,
          createdAt: serverTimestamp(),
        })
      }

      toast.success("Settings saved successfully!")
    } catch (error: any) {
      console.error("Failed to save settings:", error)
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Please sign in to save settings.")
      } else {
        toast.error("Failed to save settings")
      }
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = async () => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    if (!confirm("Are you sure you want to reset all settings to default values?")) {
      return
    }

    try {
      setSaving(true)
      setSettings(DEFAULT_SETTINGS)
      const settingsRef = doc(db, "users", user.uid, "stlMonitorSettings", "default")
      await setDoc(settingsRef, {
        ...DEFAULT_SETTINGS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success("Settings reset successfully!")
    } catch (error: any) {
      console.error("Failed to reset settings:", error)
      toast.error("Failed to reset settings")
    } finally {
      setSaving(false)
    }
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "stl-monitor-settings.json"
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Settings exported successfully!")
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setSettings({ ...DEFAULT_SETTINGS, ...imported })
        toast.success("Settings imported successfully! Click Save to apply.")
      } catch (error) {
        toast.error("Failed to import settings. Invalid file format.")
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  const toggleCategory = (category: IncidentCategory) => {
    setSettings(prev => ({
      ...prev,
      defaultCategories: {
        ...prev.defaultCategories,
        [category]: !prev.defaultCategories[category]
      }
    }))
  }

  const toggleNotificationCategory = (category: IncidentCategory) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        categories: prev.notifications.categories.includes(category)
          ? prev.notifications.categories.filter(c => c !== category)
          : [...prev.notifications.categories, category]
      }
    }))
  }

  if (authLoading || loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">Please sign in to view and manage your settings</p>
          <Button onClick={() => setAuthDialogOpen(true)}>Sign In</Button>
          <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">STL Monitor Settings</h2>
        <p className="text-muted-foreground">
          Customize your monitoring experience
        </p>
      </div>

      <Tabs defaultValue="display" className="space-y-4">
        <TabsList>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="display" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Map Settings
              </CardTitle>
              <CardDescription>Configure map display options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mapStyle">Map Style</Label>
                <select
                  id="mapStyle"
                  value={settings.mapStyle}
                  onChange={(e) =>
                    setSettings({ ...settings, mapStyle: e.target.value as "dark" | "light" | "satellite" })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="satellite">Satellite</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clusterAtZoom">Cluster Markers Below Zoom Level</Label>
                <Input
                  id="clusterAtZoom"
                  type="number"
                  min="8"
                  max="16"
                  value={settings.clusterAtZoom}
                  onChange={(e) =>
                    setSettings({ ...settings, clusterAtZoom: parseInt(e.target.value) || 12 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Group nearby incidents at lower zoom levels (8-16)
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showCameraOverlay">Show Camera Overlay</Label>
                  <p className="text-xs text-muted-foreground">
                    Display traffic cameras on the map
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="showCameraOverlay"
                    checked={settings.showCameraOverlay}
                    onChange={(e) =>
                      setSettings({ ...settings, showCameraOverlay: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cameraSearchRadius">Camera Search Radius (miles)</Label>
                <Input
                  id="cameraSearchRadius"
                  type="number"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={settings.cameraSearchRadius}
                  onChange={(e) =>
                    setSettings({ ...settings, cameraSearchRadius: parseFloat(e.target.value) || 0.5 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Radius for finding nearby cameras when clicking an incident
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Refresh Settings
              </CardTitle>
              <CardDescription>Configure data refresh behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoRefresh">Auto-Refresh</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically refresh data at regular intervals
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={settings.autoRefresh}
                    onChange={(e) =>
                      setSettings({ ...settings, autoRefresh: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                <Input
                  id="refreshInterval"
                  type="number"
                  min="10"
                  max="300"
                  value={settings.refreshInterval}
                  onChange={(e) =>
                    setSettings({ ...settings, refreshInterval: parseInt(e.target.value) || 30 })
                  }
                  disabled={!settings.autoRefresh}
                />
                <p className="text-xs text-muted-foreground">
                  How often to fetch new data (10-300 seconds)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Default Category Filters
              </CardTitle>
              <CardDescription>Choose which categories to show by default</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(settings.defaultCategories) as IncidentCategory[]).map(category => (
                  <div
                    key={category}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      settings.defaultCategories[category]
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/50 border-transparent"
                    }`}
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: CATEGORY_COLORS[category] }}>
                        {CATEGORY_ICONS[category]}
                      </span>
                      <span className="capitalize">{category}</span>
                    </div>
                    <Badge variant={settings.defaultCategories[category] ? "default" : "secondary"}>
                      {settings.defaultCategories[category] ? "On" : "Off"}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Note: Crime data is for analytics only and won't appear on the live map.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Time Window</CardTitle>
              <CardDescription>Set the default time range for viewing incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {(["15m", "1h", "6h", "24h"] as const).map(window => (
                  <Button
                    key={window}
                    variant={settings.defaultTimeWindow === window ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, defaultTimeWindow: window })}
                  >
                    {window}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Severity Range</CardTitle>
              <CardDescription>Filter incidents by severity level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Severity</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.defaultSeverityRange[0]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultSeverityRange: [parseInt(e.target.value) || 0, settings.defaultSeverityRange[1]]
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Severity</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.defaultSeverityRange[1]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultSeverityRange: [settings.defaultSeverityRange[0], parseInt(e.target.value) || 100]
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure alert notifications (coming soon)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notificationsEnabled">Enable Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive alerts for high-severity incidents
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="notificationsEnabled"
                    checked={settings.notifications.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, enabled: e.target.checked }
                      })
                    }
                    className="sr-only peer"
                    disabled
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary opacity-50"></div>
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severityThreshold">Severity Threshold</Label>
                <Input
                  id="severityThreshold"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.notifications.severityThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        severityThreshold: parseInt(e.target.value) || 70
                      }
                    })
                  }
                  disabled={!settings.notifications.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Only notify for incidents above this severity level
                </p>
              </div>

              <div className="space-y-2">
                <Label>Notification Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {(["traffic", "weather", "transit", "news"] as IncidentCategory[]).map(category => (
                    <Button
                      key={category}
                      variant={settings.notifications.categories.includes(category) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleNotificationCategory(category)}
                      disabled={!settings.notifications.enabled}
                      style={{
                        backgroundColor: settings.notifications.categories.includes(category)
                          ? CATEGORY_COLORS[category]
                          : undefined,
                      }}
                    >
                      {CATEGORY_ICONS[category]} {category}
                    </Button>
                  ))}
                </div>
              </div>

              <Badge variant="secondary" className="w-full justify-center">
                Push notifications coming soon
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Export, import, or reset your settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={exportSettings} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export Settings
                </Button>
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importSettings}
                    className="hidden"
                  />
                  <Button variant="outline" asChild className="w-full">
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Settings
                    </span>
                  </Button>
                </label>
                <Button variant="outline" onClick={resetSettings} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">Data Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Traffic Incidents</span>
                <Badge variant="secondary">MoDOT, IDOT</Badge>
              </div>
              <div className="flex justify-between">
                <span>Weather Alerts</span>
                <Badge variant="secondary">NWS</Badge>
              </div>
              <div className="flex justify-between">
                <span>Transit Alerts</span>
                <Badge variant="secondary">Metro Transit</Badge>
              </div>
              <div className="flex justify-between">
                <span>Crime Statistics</span>
                <Badge variant="secondary">SLMPD (Historical)</Badge>
              </div>
              <div className="flex justify-between">
                <span>Accident Data</span>
                <Badge variant="secondary">STL County (Historical)</Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                All data is from public, legal sources. No scraping of social media or restricted feeds.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={resetSettings}>
          Reset
        </Button>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  )
}
