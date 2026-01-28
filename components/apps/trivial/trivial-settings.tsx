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
import { Settings, RotateCcw, Brain } from "lucide-react"

interface TrivialSettings {
  defaultCategories: string[]
  defaultScoringMethod: "points" | "time" | "speed" | "accuracy"
  defaultQuestionsPerRound: number
  defaultTimeLimit?: number
  showCategoryDescriptions: boolean
  autoStartNextRound: boolean
}

const DEFAULT_SETTINGS: TrivialSettings = {
  defaultCategories: [],
  defaultScoringMethod: "points",
  defaultQuestionsPerRound: 10,
  defaultTimeLimit: undefined,
  showCategoryDescriptions: true,
  autoStartNextRound: false,
}

export function TrivialSettings() {
  const { user, loading: authLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [settings, setSettings] = React.useState<TrivialSettings>(DEFAULT_SETTINGS)

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
      const settingsRef = doc(db, "users", user.uid, "trivialSettings", "default")
      const settingsDoc = await getDoc(settingsRef)

      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        setSettings({
          defaultCategories: data.defaultCategories ?? DEFAULT_SETTINGS.defaultCategories,
          defaultScoringMethod: data.defaultScoringMethod ?? DEFAULT_SETTINGS.defaultScoringMethod,
          defaultQuestionsPerRound: data.defaultQuestionsPerRound ?? DEFAULT_SETTINGS.defaultQuestionsPerRound,
          defaultTimeLimit: data.defaultTimeLimit ?? DEFAULT_SETTINGS.defaultTimeLimit,
          showCategoryDescriptions: data.showCategoryDescriptions ?? DEFAULT_SETTINGS.showCategoryDescriptions,
          autoStartNextRound: data.autoStartNextRound ?? DEFAULT_SETTINGS.autoStartNextRound,
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
      const settingsRef = doc(db, "users", user.uid, "trivialSettings", "default")
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
      const settingsRef = doc(db, "users", user.uid, "trivialSettings", "default")
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
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Trivial Settings
        </h2>
        <p className="text-muted-foreground">
          Customize your trivia game preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Default Game Settings
          </CardTitle>
          <CardDescription>Configure default values for new games</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultQuestions">Default Questions Per Round</Label>
            <Input
              id="defaultQuestions"
              type="number"
              min="5"
              max="50"
              step="5"
              value={settings.defaultQuestionsPerRound}
              onChange={(e) =>
                setSettings({ ...settings, defaultQuestionsPerRound: parseInt(e.target.value) || 10 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Number of questions per round (5-50)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultTimeLimit">Default Time Limit (seconds)</Label>
            <Input
              id="defaultTimeLimit"
              type="number"
              min="10"
              max="300"
              step="10"
              value={settings.defaultTimeLimit || ""}
              onChange={(e) =>
                setSettings({ 
                  ...settings, 
                  defaultTimeLimit: e.target.value ? parseInt(e.target.value) : undefined 
                })
              }
              placeholder="Optional"
            />
            <p className="text-xs text-muted-foreground">
              Time limit per question in seconds (optional, 10-300)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultScoringMethod">Default Scoring Method</Label>
            <select
              id="defaultScoringMethod"
              value={settings.defaultScoringMethod}
              onChange={(e) =>
                setSettings({ ...settings, defaultScoringMethod: e.target.value as any })
              }
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="points">Points</option>
              <option value="time">Time-Based</option>
              <option value="speed">Speed</option>
              <option value="accuracy">Accuracy</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Default scoring method for new games
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
          <CardDescription>Customize how the game is displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showCategoryDescriptions">Show Category Descriptions</Label>
              <p className="text-xs text-muted-foreground">
                Display category descriptions when selecting
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="showCategoryDescriptions"
                checked={settings.showCategoryDescriptions}
                onChange={(e) =>
                  setSettings({ ...settings, showCategoryDescriptions: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoStartNextRound">Auto-Start Next Round</Label>
              <p className="text-xs text-muted-foreground">
                Automatically start the next round after completion
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="autoStartNextRound"
                checked={settings.autoStartNextRound}
                onChange={(e) =>
                  setSettings({ ...settings, autoStartNextRound: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={resetSettings} disabled={saving}>
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
