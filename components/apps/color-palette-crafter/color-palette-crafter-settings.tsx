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

interface ColorPaletteCrafterSettings {
  defaultColors: number
  showColorCodes: boolean
  autoCopyOnClick: boolean
  defaultExportFormat: "hex" | "rgb" | "json"
  showLikes: boolean
}

const DEFAULT_SETTINGS: ColorPaletteCrafterSettings = {
  defaultColors: 4,
  showColorCodes: true,
  autoCopyOnClick: true,
  defaultExportFormat: "hex",
  showLikes: true,
}

export function ColorPaletteCrafterSettings() {
  const { user, loading: authLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [settings, setSettings] = React.useState<ColorPaletteCrafterSettings>(DEFAULT_SETTINGS)

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
      const settingsRef = doc(db, "users", user.uid, "colorPaletteCrafterSettings", "default")
      const settingsDoc = await getDoc(settingsRef)

      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        setSettings({
          defaultColors: data.defaultColors ?? DEFAULT_SETTINGS.defaultColors,
          showColorCodes: data.showColorCodes ?? DEFAULT_SETTINGS.showColorCodes,
          autoCopyOnClick: data.autoCopyOnClick ?? DEFAULT_SETTINGS.autoCopyOnClick,
          defaultExportFormat: data.defaultExportFormat ?? DEFAULT_SETTINGS.defaultExportFormat,
          showLikes: data.showLikes ?? DEFAULT_SETTINGS.showLikes,
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
      const settingsRef = doc(db, "users", user.uid, "colorPaletteCrafterSettings", "default")
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
      const settingsRef = doc(db, "users", user.uid, "colorPaletteCrafterSettings", "default")
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
    link.download = "color-palette-crafter-settings.json"
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
        <h2 className="text-2xl font-bold mb-2">Color Crafter Settings</h2>
        <p className="text-muted-foreground">
          Customize your color palette experience
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
              <CardDescription>Configure default palette creation options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultColors">Default Number of Colors</Label>
                <Input
                  id="defaultColors"
                  type="number"
                  min="2"
                  max="8"
                  value={settings.defaultColors}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultColors: parseInt(e.target.value) || 4 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Default number of colors when creating a new palette (2-8)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultExportFormat">Default Export Format</Label>
                <select
                  id="defaultExportFormat"
                  value={settings.defaultExportFormat}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultExportFormat: e.target.value as "hex" | "rgb" | "json" })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="hex">Hex (#FFFFFF)</option>
                  <option value="rgb">RGB (255, 255, 255)</option>
                  <option value="json">JSON</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Default format when exporting palettes
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>Customize how palettes are displayed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showColorCodes">Show Color Codes on Hover</Label>
                  <p className="text-xs text-muted-foreground">
                    Display hex color codes when hovering over palette colors
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="showColorCodes"
                    checked={settings.showColorCodes}
                    onChange={(e) =>
                      setSettings({ ...settings, showColorCodes: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoCopyOnClick">Auto-Copy on Color Click</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically copy color code when clicking on a color
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="autoCopyOnClick"
                    checked={settings.autoCopyOnClick}
                    onChange={(e) =>
                      setSettings({ ...settings, autoCopyOnClick: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showLikes">Show Like Counts</Label>
                  <p className="text-xs text-muted-foreground">
                    Display the number of likes on each palette
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="showLikes"
                    checked={settings.showLikes}
                    onChange={(e) =>
                      setSettings({ ...settings, showLikes: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
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
