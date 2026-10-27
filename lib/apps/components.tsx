"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { MotionConfig } from "framer-motion"
import { Loader2 } from "lucide-react"
import { AppShellLayout } from "@/components/apps/app-shell-layout"
import { AppSettingsPanel } from "@/components/apps/app-settings-panel"
import { AppSettingsProvider } from "@/components/apps/settings-provider"
import { StickrProvider } from "@/components/apps/stickr/stickr-provider"
import { getAppById, type AppId } from "./registry"

export function AppLoading() {
  return (
    <p role="status" className="flex items-center justify-center gap-3 p-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      Loading app…
    </p>
  )
}

// Each app is its own chunk, so a route only downloads the app it renders
// (MapLibre, html2canvas and crypto-js stay out of unrelated pages).
const lazy = <P extends object>(load: () => Promise<React.ComponentType<P>>) =>
  dynamic(load, { loading: AppLoading })

interface AppComponents {
  Main: React.ComponentType
  /** Defaults to the schema-driven panel generated from `lib/apps/settings.ts`. */
  Settings?: React.ComponentType
  additionalTabs?: Array<{ value: string; label: string; Component: React.ComponentType }>
}

// Every app must be registered here; a missing entry fails type checking.
const APP_COMPONENTS: Record<AppId, AppComponents> = {
  "football-deepcuts": {
    Main: lazy(() =>
      import("@/components/apps/football-deepcuts/football-deepcuts-main").then((m) => m.FootballDeepcutsMain)
    ),
    additionalTabs: [
      {
        value: "leaderboard",
        label: "Leaderboard",
        Component: lazy(() =>
          import("@/components/apps/football-deepcuts/football-deepcuts-leaderboard").then(
            (m) => m.FootballDeepcutsLeaderboard
          )
        ),
      },
    ],
  },
  "atlas-sprint": {
    Main: lazy(() =>
      import("@/components/apps/atlas-sprint/atlas-sprint-main").then((m) => m.AtlasSprintMain)
    ),
  },
  "next-watch": {
    Main: lazy(() => import("@/components/apps/next-watch/next-watch-main").then((m) => m.NextWatchMain)),
  },
  encryption: {
    Main: lazy(() => import("@/components/apps/encryption/encryption-tools").then((m) => m.EncryptionTools)),
  },
  diffchecker: {
    Main: lazy(() => import("@/components/apps/diffchecker/diff-checker").then((m) => m.DiffChecker)),
  },
  timezone: {
    Main: lazy(() =>
      import("@/components/apps/timezone/timezone-converter").then((m) => m.TimeZoneConverter)
    ),
  },
  "pickup-soccer": {
    Main: lazy(() =>
      import("@/components/apps/pickup-soccer/pickup-soccer-main").then((m) => m.PickupSoccerMain)
    ),
  },
  "secret-santa": {
    Main: lazy(() =>
      import("@/components/apps/secret-santa/secret-santa-main").then((m) => m.SecretSantaMain)
    ),
  },
  "football-manager-team-picker": {
    Main: lazy(() =>
      import("@/components/apps/football-manager-team-picker/football-manager-team-picker-main").then(
        (m) => m.FootballManagerTeamPickerMain
      )
    ),
  },
  "color-palette-crafter": {
    Main: lazy(() =>
      import("@/components/apps/color-palette-crafter/color-palette-crafter-main").then(
        (m) => m.ColorPaletteCrafterMain
      )
    ),
  },
  "amer-gauntlet": {
    Main: lazy(() =>
      import("@/components/apps/amer-gauntlet/amer-gauntlet-main").then((m) => m.AmerGauntletMain)
    ),
  },
  "stl-monitor": {
    Main: lazy(() => import("@/components/apps/stl-monitor/stl-monitor-main").then((m) => m.STLMonitorMain)),
  },
  lmgtfy: {
    Main: lazy(() => import("@/components/apps/lmgtfy/lmgtfy-main").then((m) => m.LMGTFYMain)),
  },
  stickr: {
    Main: lazy(() => import("@/components/apps/stickr/stickr-main").then((m) => m.StickrMain)),
    Settings: lazy(() => import("@/components/apps/stickr/stickr-settings").then((m) => m.StickrSettings)),
  },
}

/** Renders a hub app inside the shared shell and its settings provider. */
export function HubApp({ appId }: { appId: AppId }) {
  const app = getAppById(appId)
  if (!app) return null
  const { Main, Settings = AppSettingsPanel, additionalTabs = [] } = APP_COMPONENTS[app.appId]

  const shell = (
    <AppShellLayout
      app={app}
      settingsContent={<Settings />}
      additionalTabs={additionalTabs.map(({ value, label, Component }) => ({
        value,
        label,
        content: <Component />,
      }))}
    >
      <Main />
    </AppShellLayout>
  )

  // Stickr stores preferences alongside its collection, so it owns its persistence.
  return (
    <MotionConfig reducedMotion="user">
      {app.appId === "stickr" ? (
        <StickrProvider>{shell}</StickrProvider>
      ) : (
        <AppSettingsProvider appId={app.appId}>{shell}</AppSettingsProvider>
      )}
    </MotionConfig>
  )
}
