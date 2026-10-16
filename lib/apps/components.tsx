import * as React from "react"
import { AppShellLayout } from "@/components/apps/app-shell-layout"
import type { AppEntry, AppId } from "./registry"

// Import components directly for static export compatibility
// Using regular imports instead of lazy loading to avoid chunk loading issues
import { EncryptionTools } from "@/components/apps/encryption/encryption-tools"
import { EncryptionSettings } from "@/components/apps/encryption/encryption-settings"
import { DiffChecker } from "@/components/apps/diffchecker/diff-checker"
import { DiffCheckerSettings } from "@/components/apps/diffchecker/diff-checker-settings"
import { TimeZoneConverter } from "@/components/apps/timezone/timezone-converter"
import { TimeZoneSettings } from "@/components/apps/timezone/timezone-settings"
import { PickupSoccerMain } from "@/components/apps/pickup-soccer/pickup-soccer-main"
import { PickupSoccerSettings } from "@/components/apps/pickup-soccer/pickup-soccer-settings"
import { SecretSantaMain } from "@/components/apps/secret-santa/secret-santa-main"
import { SecretSantaSettings } from "@/components/apps/secret-santa/secret-santa-settings"
import { FootballManagerTeamPickerMain } from "@/components/apps/football-manager-team-picker/football-manager-team-picker-main"
import { FootballManagerTeamPickerSettings } from "@/components/apps/football-manager-team-picker/football-manager-team-picker-settings"
import { ColorPaletteCrafterMain } from "@/components/apps/color-palette-crafter/color-palette-crafter-main"
import { ColorPaletteCrafterSettings } from "@/components/apps/color-palette-crafter/color-palette-crafter-settings"
import { AmerGauntletMain } from "@/components/apps/amer-gauntlet/amer-gauntlet-main"
import { AmerGauntletSettings } from "@/components/apps/amer-gauntlet/amer-gauntlet-settings"
import { STLMonitorMain } from "@/components/apps/stl-monitor/stl-monitor-main"
import { STLMonitorSettings } from "@/components/apps/stl-monitor/stl-monitor-settings"
import { LMGTFYMain } from "@/components/apps/lmgtfy/lmgtfy-main"
import { LMGTFYSettings } from "@/components/apps/lmgtfy/lmgtfy-settings"
import { StickrProvider } from "@/components/apps/stickr/stickr-provider"
import { StickrMain } from "@/components/apps/stickr/stickr-main"
import { StickrSettings } from "@/components/apps/stickr/stickr-settings"
import { NextWatchMain } from "@/components/apps/next-watch/next-watch-main"
import { AtlasSprintMain } from "@/components/apps/atlas-sprint/atlas-sprint-main"
import { AtlasSprintSettings } from "@/components/apps/atlas-sprint/atlas-sprint-settings"
import { FootballDeepcutsMain } from "@/components/apps/football-deepcuts/football-deepcuts-main"
import { FootballDeepcutsLeaderboard } from "@/components/apps/football-deepcuts/football-deepcuts-leaderboard"
import { AppSettingsProvider } from "@/components/apps/settings-provider"
import { AppSettingsPanel } from "@/components/apps/app-settings-panel"
import type { SettingsAppId } from "./settings"

interface AppComponents {
  Main: React.ComponentType
  Settings: React.ComponentType
  AdditionalTabs?: Array<{ value: string; label: string; Component: React.ComponentType }>
}

// Registry mapping appId to components
// To add a new app:
// 1. Add the app to APP_REGISTRY in registry.ts
// 2. Import the components above.
// 3. Register both Main and Settings. Missing app implementations fail type checking.
const APP_COMPONENTS: Record<AppId, AppComponents> = {
  "football-deepcuts": {
    Main: FootballDeepcutsMain,
    Settings: AppSettingsPanel,
    AdditionalTabs: [{ value: "leaderboard", label: "Leaderboard", Component: FootballDeepcutsLeaderboard }],
  },
  "atlas-sprint": {
    Main: AtlasSprintMain,
    Settings: AtlasSprintSettings,
  },
  "next-watch": {
    Main: NextWatchMain,
    Settings: AppSettingsPanel,
  },
  encryption: {
    Main: EncryptionTools,
    Settings: EncryptionSettings,
  },
  diffchecker: {
    Main: DiffChecker,
    Settings: DiffCheckerSettings,
  },
  timezone: {
    Main: TimeZoneConverter,
    Settings: TimeZoneSettings,
  },
  "pickup-soccer": {
    Main: PickupSoccerMain,
    Settings: PickupSoccerSettings,
  },
  "secret-santa": {
    Main: SecretSantaMain,
    Settings: SecretSantaSettings,
  },
  "football-manager-team-picker": {
    Main: FootballManagerTeamPickerMain,
    Settings: FootballManagerTeamPickerSettings,
  },
  "color-palette-crafter": {
    Main: ColorPaletteCrafterMain,
    Settings: ColorPaletteCrafterSettings,
  },
  "amer-gauntlet": {
    Main: AmerGauntletMain,
    Settings: AmerGauntletSettings,
  },
  "stl-monitor": {
    Main: STLMonitorMain,
    Settings: STLMonitorSettings,
  },
  "lmgtfy": {
    Main: LMGTFYMain,
    Settings: LMGTFYSettings,
  },
  stickr: {
    Main: StickrMain,
    Settings: StickrSettings,
  },
}

export function getAppComponents(appId: string): AppComponents | null {
  return Object.hasOwn(APP_COMPONENTS, appId) ? APP_COMPONENTS[appId as AppId] : null
}

export function hasAppComponents(appId: string): boolean {
  return Object.hasOwn(APP_COMPONENTS, appId)
}

// Helper to render app (no Suspense needed with direct imports)
export function renderApp(app: AppEntry, components: AppComponents): React.ReactNode {
  const { Main, Settings, AdditionalTabs = [] } = components

  const shell = (
    <AppShellLayout app={app} settingsContent={Settings ? <Settings /> : undefined} additionalTabs={AdditionalTabs.map((tab) => ({ value: tab.value, label: tab.label, content: React.createElement(tab.Component) }))}>
      <Main />
    </AppShellLayout>
  )

  if (app.appId === "stickr") {
    return <StickrProvider>{shell}</StickrProvider>
  }

  return <AppSettingsProvider appId={app.appId as SettingsAppId}>{shell}</AppSettingsProvider>
}
