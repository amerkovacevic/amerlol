"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { Button } from "@/components/ui/button"
import { Settings, RotateCcw } from "lucide-react"
import { ALBUM_PRESETS, clampStickerCount, getPresetById } from "@/lib/stickr/album-presets"
import { DEFAULT_STICKR_STATE, normalizeState, type StickrPersistedState } from "@/lib/stickr/stickr-state"
import { useStickr } from "./stickr-provider"

export function StickrSettings() {
  const { user, loading: authLoading } = useAuth()
  const { state, setState, hydrated } = useStickr()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)

  const onPresetChange = (id: string) => {
    const preset = getPresetById(id)
    setState((prev) => {
      const next: StickrPersistedState = {
        ...prev,
        albumPresetId: id,
        customStickerCount: preset?.stickerCount ?? prev.customStickerCount,
      }
      return normalizeState(next, preset ?? getPresetById(next.albumPresetId))
    })
  }

  const resetAll = () => {
    if (!confirm("Reset album settings and clear your duplicates and needs lists?")) return
    setState(() =>
      normalizeState(DEFAULT_STICKR_STATE, getPresetById(DEFAULT_STICKR_STATE.albumPresetId))
    )
  }

  if (authLoading || !hydrated) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Stickr Settings
        </h2>
        <p className="text-muted-foreground">
          Choose your Panini FIFA World Cup™ album size and how your trade card looks when you share it.
        </p>
        {!user && (
          <p className="text-sm text-muted-foreground mt-2">
            You’re editing locally on this device.{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-4"
              onClick={() => setAuthDialogOpen(true)}
            >
              Sign in
            </button>{" "}
            to sync lists across devices.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Album</CardTitle>
          <CardDescription>Sticker numbers run from 1 up to your album size.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Album edition</Label>
            <Select value={state.albumPresetId} onValueChange={onPresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select album" />
              </SelectTrigger>
              <SelectContent>
                {ALBUM_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                    {p.note ? ` (${p.note})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.albumPresetId === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customCount">Sticker count</Label>
              <Input
                id="customCount"
                type="number"
                min={1}
                max={900}
                value={state.customStickerCount}
                onChange={(e) => {
                  const v = clampStickerCount(parseInt(e.target.value, 10) || 1)
                  setState((prev) => normalizeState({ ...prev, customStickerCount: v }, getPresetById("custom")))
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Share card</CardTitle>
          <CardDescription>Shown on the downloadable trade image.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Your name or handle (optional)</Label>
            <Input
              id="displayName"
              placeholder="e.g. Alex · St. Louis"
              maxLength={80}
              value={state.displayName}
              onChange={(e) => setState((prev) => ({ ...prev, displayName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Card style</Label>
            <Select
              value={state.shareCardTheme}
              onValueChange={(v: "light" | "dark") => setState((prev) => ({ ...prev, shareCardTheme: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark (high contrast)</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={resetAll}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset everything
        </Button>
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  )
}
