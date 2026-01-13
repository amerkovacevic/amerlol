import * as React from "react"
import { AppShellLayout } from "@/components/apps/app-shell-layout"
import type { AppEntry } from "./registry"

// Lazy load app components for better code splitting
const EncryptionTools = React.lazy(() => 
  import("@/components/apps/encryption/encryption-tools").then(m => ({ default: m.EncryptionTools }))
)
const EncryptionSettings = React.lazy(() => 
  import("@/components/apps/encryption/encryption-settings").then(m => ({ default: m.EncryptionSettings }))
)

const DiffChecker = React.lazy(() => 
  import("@/components/apps/diffchecker/diff-checker").then(m => ({ default: m.DiffChecker }))
)
const DiffCheckerSettings = React.lazy(() => 
  import("@/components/apps/diffchecker/diff-checker-settings").then(m => ({ default: m.DiffCheckerSettings }))
)

const TimeZoneConverter = React.lazy(() => 
  import("@/components/apps/timezone/timezone-converter").then(m => ({ default: m.TimeZoneConverter }))
)
const TimeZoneSettings = React.lazy(() => 
  import("@/components/apps/timezone/timezone-settings").then(m => ({ default: m.TimeZoneSettings }))
)

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
}

export function getAppComponents(appId: string): AppComponents | null {
  return APP_COMPONENTS[appId] || null
}

export function hasAppComponents(appId: string): boolean {
  return appId in APP_COMPONENTS
}

// Helper to render app with Suspense
export function renderApp(app: AppEntry, components: AppComponents): React.ReactNode {
  const { Main, Settings } = components

  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Loading {app.name}...</p>
          </div>
        </div>
      }
    >
      <AppShellLayout app={app} settingsContent={Settings ? <Settings /> : undefined}>
        <Main />
      </AppShellLayout>
    </React.Suspense>
  )
}
