"use client"

import * as React from "react"
import { getAppById } from "@/lib/apps/registry"
import { AppShellLayout } from "@/components/apps/app-shell-layout"
import { motion } from "framer-motion"
import { EncryptionTools } from "@/components/apps/encryption/encryption-tools"
import { EncryptionSettings } from "@/components/apps/encryption/encryption-settings"

interface AppPageClientProps {
  appId: string
}

export function AppPageClient({ appId }: AppPageClientProps) {
  const app = getAppById(appId)

  if (!app) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">App Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The app you&apos;re looking for doesn&apos;t exist.
          </p>
          <a href="/hub" className="text-primary hover:underline">
            Back to Hub
          </a>
        </div>
      </div>
    )
  }

  // Render app-specific content
  if (app.appId === "encryption") {
    return (
      <AppShellLayout 
        app={app}
        settingsContent={<EncryptionSettings />}
      >
        <EncryptionTools />
      </AppShellLayout>
    )
  }

  // Default placeholder for other apps
  return (
    <AppShellLayout app={app}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-2xl font-bold mb-4">Overview</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              {app.description}
            </p>
            <p className="text-muted-foreground mt-4">
              This is a placeholder for the {app.name} app. In the future, this will
              contain the full application interface.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">Status</h3>
            <p className="text-sm text-muted-foreground capitalize">{app.status}</p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">Category</h3>
            <p className="text-sm text-muted-foreground">{app.category}</p>
          </div>
        </div>
      </motion.div>
    </AppShellLayout>
  )
}