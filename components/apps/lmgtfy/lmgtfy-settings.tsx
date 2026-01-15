"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { db } from "@/lib/firebase/config"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"
import { Settings, RotateCcw } from "lucide-react"

interface LMGTFYSettings {
  defaultAnimationSpeed: number
  redirectDelay: number
  showQueryInAnimation: boolean
}

const DEFAULT_SETTINGS: LMGTFYSettings = {
  defaultAnimationSpeed: 1.0,
  redirectDelay: 1500,
  showQueryInAnimation: true,
}

export function LMGTFYSettings() {
  const { user, loading: authLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [settings, setSettings] = React.useState<LMGTFYSettings>(DEFAULT_SETTINGS)

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
      const settingsRef = doc(db, "users", user.uid, "lmgtfySettings", "default")
      const settingsDoc = await getDoc(settingsRef)

      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        setSettings({
          defaultAnimationSpeed: data.defaultAnimationSpeed ?? DEFAULT_SETTINGS.defaultAnimationSpeed,
          redirectDelay: data.redirectDelay ?? DEFAULT_SETTINGS.redirectDelay,
          showQueryInAnimation: data.showQueryInAnimation ?? DEFAULT_SETTINGS.showQueryInAnimation,
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
      const settingsRef = doc(db, "users", user.uid, "lmgtfySettings", "default")
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
      const settingsRef = doc(db, "users", user.uid, "lmgtfySettings", "default")
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
        <h2 className="text-2xl font-bold mb-2">LMGTFY Settings</h2>
        <p className="text-muted-foreground">
          Customize your "Let Me Google That For You" experience
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Animation Settings
          </CardTitle>
          <CardDescription>Configure the animation behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="animationSpeed">Animation Speed</Label>
            <Input
              id="animationSpeed"
              type="number"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.defaultAnimationSpeed}
              onChange={(e) =>
                setSettings({ ...settings, defaultAnimationSpeed: parseFloat(e.target.value) || 1.0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Speed multiplier for animation (0.5 = slower, 2.0 = faster)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirectDelay">Redirect Delay (ms)</Label>
            <Input
              id="redirectDelay"
              type="number"
              min="500"
              max="5000"
              step="100"
              value={settings.redirectDelay}
              onChange={(e) =>
                setSettings({ ...settings, redirectDelay: parseInt(e.target.value) || 1500 })
              }
            />
            <p className="text-xs text-muted-foreground">
              How long to wait before redirecting to Google (500-5000ms)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showQuery">Show Query in Animation</Label>
              <p className="text-xs text-muted-foreground">
                Display the search query during the animation
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="showQuery"
                checked={settings.showQueryInAnimation}
                onChange={(e) =>
                  setSettings({ ...settings, showQueryInAnimation: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={resetSettings}>
          <RotateCcw className="h-4 w-4 mr-2" />
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
