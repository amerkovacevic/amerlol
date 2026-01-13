"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { AppCategory } from "@/lib/apps/registry"
import { cn } from "@/lib/utils"

type SortOption = "featured" | "new" | "popular"

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: AppCategory | "all"
  onCategoryChange: (category: AppCategory | "all") => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
}

const categories: (AppCategory | "all")[] = [
  "all",
  "Utilities",
  "Games",
  "Experiments",
  "Social",
  "Visual",
]

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "new", label: "New" },
  { value: "popular", label: "Popular" },
]

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search apps..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className="capitalize"
          >
            {category === "all" ? "All" : category}
          </Button>
        ))}
      </div>

      <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}