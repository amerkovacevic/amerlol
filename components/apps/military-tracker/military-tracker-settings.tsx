"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Save, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"

const STORAGE_KEY = "militaryTrackerSettings"

interface MilitaryTrackerSettings {
  refreshInterval: number // seconds
  autoRefresh: boolean
  showNotifications: boolean
  defaultMapView: "world" | "country" | "last"
  defaultFilters: {
    countries: string[]
    aircraftTypes: string[]
    activities: string[]
  }
}

const DEFAULT_SETTINGS: MilitaryTrackerSettings = {
  refreshInterval: 30,
  autoRefresh: true,
  showNotifications: false,
  defaultMapView: "world",
  defaultFilters: {
    countries: [],
    aircraftTypes: [],
    activities: [],
  },
}

export function MilitaryTrackerSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = React.useState<MilitaryTrackerSettings>(DEFAULT_SETTINGS)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, "users", user.uid, "militaryTrackerSettings", "default")
        const settingsSnap = await getDoc(settingsRef)
        
        if (settingsSnap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...settingsSnap.data() })
        } else {
          // Load from localStorage as fallback on first login
          const localSaved = localStorage.getItem(STORAGE_KEY)
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved)
              setSettings({ ...DEFAULT_SETTINGS, ...parsed })
              // Migrate to Firestore
              await setDoc(settingsRef, {
                ...DEFAULT_SETTINGS,
                ...parsed,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            } catch (error) {
              console.error("Failed to parse localStorage settings:", error)
            }
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [user])

  const updateSetting = <K extends keyof MilitaryTrackerSettings>(
    key: K,
    value: MilitaryTrackerSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const saveSettings = async () => {
    if (!user) {
      toast.error("You must be signed in to save settings")
      return
    }

    try {
      const settingsRef = doc(db, "users", user.uid, "militaryTrackerSettings", "default")
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp(),
      }, { merge: true })

      // Also save to localStorage as backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

      setHasChanges(false)
      toast.success("Settings saved successfully")
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error("Failed to save settings")
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </CardTitle>
          <CardDescription>Configure your military flight tracking preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Refresh Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Refresh Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoRefresh">Auto-refresh</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically refresh flight data
                    </p>
                  </div>
                  <input
                    id="autoRefresh"
                    type="checkbox"
                    checked={settings.autoRefresh}
                    onChange={(e) => updateSetting("autoRefresh", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>

                {settings.autoRefresh && (
                  <div className="space-y-2">
                    <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                    <Input
                      id="refreshInterval"
                      type="number"
                      min="10"
                      max="300"
                      step="10"
                      value={settings.refreshInterval}
                      onChange={(e) => updateSetting("refreshInterval", Math.max(10, Math.min(300, parseInt(e.target.value) || 30)))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Refresh every {settings.refreshInterval} seconds ({Math.round(settings.refreshInterval / 60)} minute{settings.refreshInterval !== 60 ? "s" : ""})
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Notifications</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showNotifications">Show notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Show toast notifications when new flights are detected
                  </p>
                </div>
                <input
                  id="showNotifications"
                  type="checkbox"
                  checked={settings.showNotifications}
                  onChange={(e) => updateSetting("showNotifications", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Map Settings */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Map Settings</h3>
              
              <div className="space-y-2">
                <Label htmlFor="defaultMapView">Default Map View</Label>
                <select
                  id="defaultMapView"
                  value={settings.defaultMapView}
                  onChange={(e) => updateSetting("defaultMapView", e.target.value as "world" | "country" | "last")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="world">World View</option>
                  <option value="country">Country View (USA)</option>
                  <option value="last">Last Position</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Initial map view when opening the app
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="border-t pt-4">
            <Button
              onClick={saveSettings}
              disabled={!hasChanges}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
            {!user && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Sign in to save your settings across devices
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
