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

interface PickupSoccerSettings {
  defaultMaxPlayers: number
  defaultLocation: string
  emailNotifications: boolean
  reminderHours: number
  showMyGamesOnly: boolean
  autoJoin: boolean
}

const DEFAULT_SETTINGS: PickupSoccerSettings = {
  defaultMaxPlayers: 10,
  defaultLocation: "",
  emailNotifications: true,
  reminderHours: 24,
  showMyGamesOnly: false,
  autoJoin: false,
}

export function PickupSoccerSettings() {
  const { user, loading: authLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [settings, setSettings] = React.useState<PickupSoccerSettings>(DEFAULT_SETTINGS)

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
      const settingsRef = doc(db, "users", user.uid, "pickupSoccerSettings", "default")
      const settingsDoc = await getDoc(settingsRef)

      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        setSettings({
          defaultMaxPlayers: data.defaultMaxPlayers ?? DEFAULT_SETTINGS.defaultMaxPlayers,
          defaultLocation: data.defaultLocation ?? DEFAULT_SETTINGS.defaultLocation,
          emailNotifications: data.emailNotifications ?? DEFAULT_SETTINGS.emailNotifications,
          reminderHours: data.reminderHours ?? DEFAULT_SETTINGS.reminderHours,
          showMyGamesOnly: data.showMyGamesOnly ?? DEFAULT_SETTINGS.showMyGamesOnly,
          autoJoin: data.autoJoin ?? DEFAULT_SETTINGS.autoJoin,
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
      const settingsRef = doc(db, "users", user.uid, "pickupSoccerSettings", "default")
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
      const settingsRef = doc(db, "users", user.uid, "pickupSoccerSettings", "default")
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
    link.download = "pickup-soccer-settings.json"
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
        <h2 className="text-2xl font-bold mb-2">Pickup Soccer Settings</h2>
        <p className="text-muted-foreground">
          Customize your pickup soccer experience
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure default game preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultMaxPlayers">Default Max Players</Label>
                <Input
                  id="defaultMaxPlayers"
                  type="number"
                  min="2"
                  max="22"
                  value={settings.defaultMaxPlayers}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultMaxPlayers: parseInt(e.target.value) || 10 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Default number of players for new games
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultLocation">Default Location</Label>
                <Input
                  id="defaultLocation"
                  value={settings.defaultLocation}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultLocation: e.target.value })
                  }
                  placeholder="e.g., Central Park Field 1"
                />
                <p className="text-xs text-muted-foreground">
                  Default location for new games (optional)
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showMyGamesOnly">Show My Games Only</Label>
                  <p className="text-xs text-muted-foreground">
                    Filter to show only games you've created or joined
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="showMyGamesOnly"
                    checked={settings.showMyGamesOnly}
                    onChange={(e) =>
                      setSettings({ ...settings, showMyGamesOnly: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoJoin">Auto-Join</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically join games when created (if space available)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="autoJoin"
                    checked={settings.autoJoin}
                    onChange={(e) =>
                      setSettings({ ...settings, autoJoin: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage how you receive game updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive email notifications for game updates
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onChange={(e) =>
                      setSettings({ ...settings, emailNotifications: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderHours">Reminder Hours Before Game</Label>
                <Input
                  id="reminderHours"
                  type="number"
                  min="0"
                  max="168"
                  value={settings.reminderHours}
                  onChange={(e) =>
                    setSettings({ ...settings, reminderHours: parseInt(e.target.value) || 24 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Hours before game start to send reminder (0-168)
                </p>
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
