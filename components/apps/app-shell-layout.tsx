"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppEntry } from "@/lib/apps/registry"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"

interface AppShellLayoutProps {
  app: AppEntry
  children: React.ReactNode
  settingsContent?: React.ReactNode
}

export function AppShellLayout({ app, children, settingsContent }: AppShellLayoutProps) {
  const { user } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)

  return (
    <main className="container mx-auto px-4 py-8">
      <Button
        asChild
        variant="ghost"
        className="mb-6"
      >
        <Link href="/hub">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Hub
        </Link>
      </Button>

      <div className="mb-8">
        <div className="mb-4">
          <h1 className="font-space-grotesk text-3xl md:text-4xl font-bold mb-2">
            {app.name}
          </h1>
          <p className="text-muted-foreground text-lg">
            {app.description}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          {children}
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          {user ? (
            settingsContent || (
              <div className="p-12 text-center rounded-lg border border-dashed">
                <p className="text-muted-foreground">
                  Settings panel coming soon
                </p>
              </div>
            )
          ) : (
            <div className="p-12 text-center rounded-lg border border-dashed">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Please sign in to access settings.
                </p>
                <Button onClick={() => setAuthDialogOpen(true)}>
                  Sign In
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </main>
  )
}