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
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore"

const STORAGE_KEY = "encryption-platform-settings"

interface EncryptionSettings {
  autoConvert: boolean
  clearOnTabChange: boolean
  defaultTab: string
  fontSize: number
}

const DEFAULT_SETTINGS: EncryptionSettings = {
  autoConvert: true,
  clearOnTabChange: false,
  defaultTab: "base64",
  fontSize: 14,
}

export function EncryptionSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = React.useState<EncryptionSettings>(DEFAULT_SETTINGS)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, "users", user.uid, "encryptionSettings", "default")
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
              await setDoc(settingsRef, { ...DEFAULT_SETTINGS, ...parsed })
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

  const updateSetting = <K extends keyof EncryptionSettings>(
    key: K,
    value: EncryptionSettings[K]
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
      const settingsRef = doc(db, "users", user.uid, "encryptionSettings", "default")
      await setDoc(settingsRef, settings)
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
        const settingsRef = doc(db, "users", user.uid, "encryptionSettings", "default")
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
    link.download = "encryption-platform-settings.json"
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
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure how the encryption tools behave.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoConvert">Auto-convert on input</Label>
              <p className="text-sm text-muted-foreground">
                Automatically convert text as you type
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="autoConvert"
                checked={settings.autoConvert}
                onChange={(e) => updateSetting("autoConvert", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="clearOnTabChange">Clear inputs on tab change</Label>
              <p className="text-sm text-muted-foreground">
                Clear all inputs when switching between ciphers
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="clearOnTabChange"
                checked={settings.clearOnTabChange}
                onChange={(e) => updateSetting("clearOnTabChange", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultTab">Default Tab</Label>
            <select
              id="defaultTab"
              value={settings.defaultTab}
              onChange={(e) => updateSetting("defaultTab", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="base64">Base64</option>
              <option value="url">URL Encoding</option>
              <option value="hex">Hex</option>
              <option value="binary">Binary</option>
              <option value="ascii">ASCII</option>
              <option value="caesar">Caesar Cipher</option>
              <option value="rot13">ROT13</option>
              <option value="morse">Morse Code</option>
              <option value="md5">MD5</option>
              <option value="sha256">SHA-256</option>
            </select>
          </div>

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