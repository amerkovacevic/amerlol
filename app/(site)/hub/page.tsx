"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { LogOut, Settings, User } from "lucide-react"
import { toast } from "sonner"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { SignInReminder } from "@/components/auth/sign-in-reminder"
import { useUsername } from "@/components/auth/use-username"
import { AppCard } from "@/components/hub/app-card"
import { EmptyState } from "@/components/hub/empty-state"
import { FilterBar, type SortOption } from "@/components/hub/filter-bar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { searchApps, type AppCategory } from "@/lib/apps/registry"

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

export default function HubPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const username = useUsername(user)
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<AppCategory | "all">("all")
  const [sortBy, setSortBy] = React.useState<SortOption>("featured")

  const filteredApps = React.useMemo(() => {
    // filter() returns a fresh array, so sorting in place never mutates the registry.
    return searchApps(searchQuery)
      .filter((app) => selectedCategory === "all" || app.category === selectedCategory)
      .sort((a, b) =>
        sortBy === "name"
          ? a.name.localeCompare(b.name)
          : Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      )
  }, [searchQuery, selectedCategory, sortBy])

  const hasAccount = !authLoading && user && !user.isAnonymous
  const displayName = username || user?.displayName || user?.email || "My Account"

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      toast.error("We could not sign you out. Please try again.")
    }
  }

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
          <h1 className="mb-4 font-space-grotesk text-4xl font-bold md:text-5xl">App Hub</h1>
          <p className="text-lg text-muted-foreground">Discover and explore all available mini-apps</p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
          {hasAccount ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="max-w-full gap-2">
                  <User className="h-4 w-4" />
                  <span className="max-w-[200px] truncate">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button disabled={authLoading} onClick={() => setAuthDialogOpen(true)}>
              Sign In
            </Button>
          )}
        </motion.div>
      </div>

      <div className="mb-6">
        <SignInReminder />
      </div>
      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="mb-8">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </motion.div>

      <p role="status" className="mb-4 text-sm text-muted-foreground">
        {filteredApps.length} {filteredApps.length === 1 ? "app" : "apps"} found
      </p>
      {filteredApps.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredApps.map((app, index) => (
            <motion.div key={app.appId} {...fadeUp} transition={{ duration: 0.3, delay: index * 0.05 }}>
              <AppCard app={app} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </main>
  )
}
