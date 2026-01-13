"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Trash2, Download, Upload, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore"

const STORAGE_KEY = "diff-checker-settings"

interface DiffCheckerSettings {
  fontSize: number
  showLineNumbers: boolean
  ignoreWhitespace: boolean
  ignoreCase: boolean
  theme: "light" | "dark" | "auto"
}

const DEFAULT_SETTINGS: DiffCheckerSettings = {
  fontSize: 14,
  showLineNumbers: true,
  ignoreWhitespace: false,
  ignoreCase: false,
  theme: "auto",
}

export function DiffCheckerSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = React.useState<DiffCheckerSettings>(DEFAULT_SETTINGS)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, "users", user.uid, "diffCheckerSettings", "default")
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

  const updateSetting = <K extends keyof DiffCheckerSettings>(
    key: K,
    value: DiffCheckerSettings[K]
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
      const settingsRef = doc(db, "users", user.uid, "diffCheckerSettings", "default")
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp(),
      })
      setHasChanges(false)
      toast.success("Settings saved successfully")
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error("Failed to save settings")
    }
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    setHasChanges(true)
    toast.info("Settings reset to defaults")
  }

  const clearAllData = async () => {
    if (!user) {
      toast.error("You must be signed in to clear data")
      return
    }

    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      try {
        const settingsRef = doc(db, "users", user.uid, "diffCheckerSettings", "default")
        await deleteDoc(settingsRef)
        setSettings(DEFAULT_SETTINGS)
        setHasChanges(false)
        toast.success("All data cleared")
      } catch (error) {
        console.error("Failed to clear data:", error)
        toast.error("Failed to clear data")
      }
    }
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "diff-checker-settings.json"
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Settings exported successfully")
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setSettings({ ...DEFAULT_SETTINGS, ...imported })
        setHasChanges(true)
        toast.success("Settings imported successfully")
      } catch (error) {
        toast.error("Failed to import settings. Invalid file format.")
      }
    }
    reader.readAsText(file)
    // Reset input
    event.target.value = ""
  }

  if (!user) {
    return (
      <div className="p-12 text-center rounded-lg border border-dashed">
        <p className="text-muted-foreground mb-4">
          Please sign in to access settings
        </p>
        <Button asChild>
          <a href="/hub">Sign In</a>
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-12 text-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>Configure how the diff checker displays results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fontSize">Font Size (px)</Label>
            <Input
              id="fontSize"
              type="number"
              min="10"
              max="20"
              value={settings.fontSize}
              onChange={(e) => updateSetting("fontSize", parseInt(e.target.value) || 14)}
              className="w-32"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showLineNumbers">Show Line Numbers</Label>
              <p className="text-sm text-muted-foreground">
                Display line numbers in the diff result
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="showLineNumbers"
                checked={settings.showLineNumbers}
                onChange={(e) => updateSetting("showLineNumbers", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparison Settings</CardTitle>
          <CardDescription>Configure how text is compared.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ignoreWhitespace">Ignore Whitespace</Label>
              <p className="text-sm text-muted-foreground">
                Ignore whitespace differences when comparing
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="ignoreWhitespace"
                checked={settings.ignoreWhitespace}
                onChange={(e) => updateSetting("ignoreWhitespace", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ignoreCase">Ignore Case</Label>
              <p className="text-sm text-muted-foreground">
                Ignore case differences when comparing
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="ignoreCase"
                checked={settings.ignoreCase}
                onChange={(e) => updateSetting("ignoreCase", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export, import, or clear your settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportSettings}>
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            <label>
              <Button variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Settings
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
            </label>
            <Button variant="outline" onClick={resetSettings}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button variant="destructive" onClick={clearAllData}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={resetSettings}>
            Cancel
          </Button>
          <Button onClick={saveSettings}>Save Changes</Button>
        </div>
      )}
    </motion.div>
  )
}
