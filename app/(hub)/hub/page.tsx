"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { getAllApps, getFeaturedApps, getAppsByCategory, searchApps, type AppCategory } from "@/lib/apps/registry"
import { AppCard } from "@/components/hub/app-card"
import { FilterBar } from "@/components/hub/filter-bar"
import { EmptyState } from "@/components/hub/empty-state"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { Button } from "@/components/ui/button"
import { User, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase/config"
import { doc, getDoc } from "firebase/firestore"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type SortOption = "featured" | "new" | "popular"

export default function HubPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<AppCategory | "all">("all")
  const [sortBy, setSortBy] = React.useState<SortOption>("featured")
  const [username, setUsername] = React.useState<string | null>(null)

  const filteredApps = React.useMemo(() => {
    let apps = searchQuery
      ? searchApps(searchQuery)
      : selectedCategory === "all"
      ? getAllApps()
      : getAppsByCategory(selectedCategory as AppCategory)

    if (sortBy === "new") {
      apps = [...apps].sort((a, b) => {
        const aFeatured = a.featured ? 1 : 0
        const bFeatured = b.featured ? 1 : 0
        return bFeatured - aFeatured
      })
    }

    return apps
  }, [searchQuery, selectedCategory, sortBy])

  // Load username from Firestore
  React.useEffect(() => {
    const loadUsername = async () => {
      if (!user) {
        setUsername(null)
        return
      }

      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUsername(data.username || null)
        } else {
          setUsername(null)
        }
      } catch (error) {
        console.error("Failed to load username:", error)
        setUsername(null)
      }
    }

    loadUsername()
  }, [user])

  // Determine display name priority: username > displayName > email
  const displayName = React.useMemo(() => {
    if (!user) return "My Account"
    if (username) return username
    if (user.displayName) return user.displayName
    return user.email || "My Account"
  }, [user, username])

  const handleSignOut = async () => {
    try {
      await signOut()
      // toast is handled in the provider if needed
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  if (authLoading) {
    return (
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-space-grotesk text-4xl md:text-5xl font-bold mb-4">
            App Hub
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover and explore all available mini-apps
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  {displayName}
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
            <Button onClick={() => setAuthDialogOpen(true)}>
              Sign In
            </Button>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </motion.div>

      {filteredApps.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredApps.map((app, index) => (
            <motion.div
              key={app.appId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <AppCard app={app} locked={false} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </main>
  )
}