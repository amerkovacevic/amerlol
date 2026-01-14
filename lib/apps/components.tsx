import * as React from "react"
import { AppShellLayout } from "@/components/apps/app-shell-layout"
import type { AppEntry } from "./registry"

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

interface AppComponents {
  Main: React.ComponentType
  Settings?: React.ComponentType
}

// Registry mapping appId to components
// To add a new app:
// 1. Add the app to APP_REGISTRY in registry.ts
// 2. Import the components above using React.lazy
// 3. Add an entry here mapping appId to { Main, Settings? }
const APP_COMPONENTS: Record<string, AppComponents> = {
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
}

export function getAppComponents(appId: string): AppComponents | null {
  return APP_COMPONENTS[appId] || null
}

export function hasAppComponents(appId: string): boolean {
  return appId in APP_COMPONENTS
}

// Helper to render app (no Suspense needed with direct imports)
export function renderApp(app: AppEntry, components: AppComponents): React.ReactNode {
  const { Main, Settings } = components

  return (
    <AppShellLayout app={app} settingsContent={Settings ? <Settings /> : undefined}>
      <Main />
    </AppShellLayout>
  )
}
