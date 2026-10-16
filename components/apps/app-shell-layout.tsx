"use client"

import { SignInReminder } from "@/components/auth/sign-in-reminder"
import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppEntry } from "@/lib/apps/registry"

interface AppShellLayoutProps {
  app: AppEntry
  children: React.ReactNode
  settingsContent?: React.ReactNode
  additionalTabs?: Array<{ value: string; label: string; content: React.ReactNode }>
}

export function AppShellLayout({ app, children, settingsContent, additionalTabs = [] }: AppShellLayoutProps) {

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

      <div className="mb-6"><SignInReminder /></div>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList aria-label={`${app.name} sections`} className="h-auto min-h-10 max-w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {additionalTabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" forceMount className="mt-6 data-[state=inactive]:hidden">
          {children}
        </TabsContent>
        {additionalTabs.map((tab) => <TabsContent key={tab.value} value={tab.value} className="mt-6">{tab.content}</TabsContent>)}
        <TabsContent value="settings" className="mt-6">
          {settingsContent || (
              <div className="p-12 text-center rounded-lg border border-dashed">
                <p className="text-muted-foreground">
                  Settings panel coming soon
                </p>
              </div>
            )}
        </TabsContent>
      </Tabs>

    </main>
  )
}
