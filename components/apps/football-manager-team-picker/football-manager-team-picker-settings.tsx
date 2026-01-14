"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { db } from "@/lib/firebase/config"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"
import { Trash2, Download, Upload, RotateCcw } from "lucide-react"

interface FootballManagerTeamPickerSettings {
  defaultPickMode: "single" | "multiple"
  defaultNumPicks: number
  defaultMinTier: number
  defaultSameCountry: boolean
  defaultSameLeague: boolean
  autoAddToHistory: boolean
  showFavoritesOnly: boolean
}

const DEFAULT_SETTINGS: FootballManagerTeamPickerSettings = {
  defaultPickMode: "single",
  defaultNumPicks: 4,
  defaultMinTier: 1,
  defaultSameCountry: false,
  defaultSameLeague: false,
  autoAddToHistory: true,
  showFavoritesOnly: false,
}

export function FootballManagerTeamPickerSettings() {
  const { user, loading: authLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [settings, setSettings] = React.useState<FootballManagerTeamPickerSettings>(DEFAULT_SETTINGS)

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
      const settingsRef = doc(db, "users", user.uid, "footballManagerTeamPickerSettings", "default")
      const settingsDoc = await getDoc(settingsRef)

      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        setSettings({
          defaultPickMode: data.defaultPickMode ?? DEFAULT_SETTINGS.defaultPickMode,
          defaultNumPicks: data.defaultNumPicks ?? DEFAULT_SETTINGS.defaultNumPicks,
          defaultMinTier: data.defaultMinTier ?? DEFAULT_SETTINGS.defaultMinTier,
          defaultSameCountry: data.defaultSameCountry ?? DEFAULT_SETTINGS.defaultSameCountry,
          defaultSameLeague: data.defaultSameLeague ?? DEFAULT_SETTINGS.defaultSameLeague,
          autoAddToHistory: data.autoAddToHistory ?? DEFAULT_SETTINGS.autoAddToHistory,
          showFavoritesOnly: data.showFavoritesOnly ?? DEFAULT_SETTINGS.showFavoritesOnly,
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
      const settingsRef = doc(db, "users", user.uid, "footballManagerTeamPickerSettings", "default")
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
      const settingsRef = doc(db, "users", user.uid, "footballManagerTeamPickerSettings", "default")
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
    link.download = "football-manager-team-picker-settings.json"
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
        <h2 className="text-2xl font-bold mb-2">Football Manager Team Picker Settings</h2>
        <p className="text-muted-foreground">
          Customize your team picker preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure default picker behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultPickMode">Default Pick Mode</Label>
                <select
                  id="defaultPickMode"
                  value={settings.defaultPickMode}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultPickMode: e.target.value as "single" | "multiple" })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="single">Single Team</option>
                  <option value="multiple">Multiple Teams</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Default mode when opening the picker
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultNumPicks">Default Number of Teams (Multiple Mode)</Label>
                <Input
                  id="defaultNumPicks"
                  type="number"
                  min="2"
                  max="20"
                  value={settings.defaultNumPicks}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultNumPicks: parseInt(e.target.value) || 4 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Default number of teams to pick in multiple mode (2-20)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultMinTier">Default Minimum League Tier</Label>
                <select
                  id="defaultMinTier"
                  value={settings.defaultMinTier}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultMinTier: parseInt(e.target.value) })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="1">Tier 1 (Top Leagues)</option>
                  <option value="2">Tier 2+</option>
                  <option value="3">Tier 3+</option>
                  <option value="0">All Tiers</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Default minimum league tier filter
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Picker Preferences</CardTitle>
              <CardDescription>Default constraints for multiple picks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="defaultSameCountry">Default Same Country Only</Label>
                  <p className="text-xs text-muted-foreground">
                    Default to picking teams from the same country in multiple mode
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="defaultSameCountry"
                    checked={settings.defaultSameCountry}
                    onChange={(e) => {
                      setSettings({ ...settings, defaultSameCountry: e.target.checked })
                      if (e.target.checked) {
                        setSettings((prev) => ({ ...prev, defaultSameLeague: false }))
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="defaultSameLeague">Default Same League Only</Label>
                  <p className="text-xs text-muted-foreground">
                    Default to picking teams from the same league in multiple mode
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="defaultSameLeague"
                    checked={settings.defaultSameLeague}
                    onChange={(e) => {
                      setSettings({ ...settings, defaultSameLeague: e.target.checked })
                      if (e.target.checked) {
                        setSettings((prev) => ({ ...prev, defaultSameCountry: false }))
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoAddToHistory">Auto-Add to History</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically add picked teams to history
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="autoAddToHistory"
                    checked={settings.autoAddToHistory}
                    onChange={(e) =>
                      setSettings({ ...settings, autoAddToHistory: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showFavoritesOnly">Show Favorites Only (Future Feature)</Label>
                  <p className="text-xs text-muted-foreground">
                    Filter to show only favorited teams when picking
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="showFavoritesOnly"
                    checked={settings.showFavoritesOnly}
                    onChange={(e) =>
                      setSettings({ ...settings, showFavoritesOnly: e.target.checked })
                    }
                    className="sr-only peer"
                    disabled
                  />
                  <div className="w-11 h-6 bg-gray-200 opacity-50 rounded-full"></div>
                </label>
              </div>
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
