"use client"

import * as React from "react"
import { AppCard } from "@/components/hub/app-card"
import { EmptyState } from "@/components/hub/empty-state"
import { FilterBar, type SortOption } from "@/components/hub/filter-bar"
import { searchApps, type AppCategory } from "@/lib/apps/registry"
import { enterDelay } from "@/lib/utils"

/** Search, category filter and sort over every registered app. */
export function HubBrowser() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<AppCategory | "all">("all")
  const [sortBy, setSortBy] = React.useState<SortOption>("featured")
  const deferredQuery = React.useDeferredValue(searchQuery)

  const filteredApps = React.useMemo(
    () =>
      // filter() returns a fresh array, so sorting in place never mutates the registry.
      searchApps(deferredQuery)
        .filter((app) => selectedCategory === "all" || app.category === selectedCategory)
        .sort((a, b) =>
          sortBy === "name"
            ? a.name.localeCompare(b.name)
            : Number(Boolean(b.featured)) - Number(Boolean(a.featured))
        ),
    [deferredQuery, selectedCategory, sortBy]
  )

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
  }

  return (
    <>
      <div className="mb-8">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>

      <p role="status" className="mb-4 text-sm text-muted-foreground">
        {filteredApps.length} {filteredApps.length === 1 ? "app" : "apps"} found
      </p>
      {filteredApps.length === 0 ? (
        <EmptyState onClear={clearFilters} />
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map((app, index) => (
            <li key={app.appId} className="animate-enter" style={enterDelay(Math.min(index, 8) * 40)}>
              <AppCard app={app} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
