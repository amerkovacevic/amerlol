import type { SettingsAppId } from "./settings"

export type AppId = SettingsAppId | "stickr"

export type AppCategory = "Utilities" | "Games" | "Experiments" | "Social" | "Visual"
export type AppStatus = "live" | "beta" | "comingSoon"

export interface AppEntry {
  appId: AppId
  name: string
  description: string
  category: AppCategory
  tags: string[]
  status: AppStatus
  accent: string
  featured?: boolean
}

export const APP_REGISTRY: AppEntry[] = [
  {
    appId: "football-deepcuts",
    name: "Deepcuts",
    description: "Daily football trivia where obscure, verified careers score the most",
    category: "Games",
    tags: ["football", "soccer", "trivia", "daily", "players", "clubs"],
    status: "live",
    accent: "from-emerald-500 via-teal-500 to-blue-600",
    featured: true,
  },
  {
    appId: "atlas-sprint",
    name: "Atlas Sprint",
    description: "Race the clock and name every country in the world—or conquer one continent at a time",
    category: "Games",
    tags: ["countries", "geography", "world", "continents", "quiz", "trivia"],
    status: "live",
    accent: "from-sky-500 via-blue-600 to-indigo-600",
    featured: true,
  },
  {
    appId: "next-watch",
    name: "Next Watch",
    description: "Import your Letterboxd watchlist and let the wheel pick movie night",
    category: "Games",
    tags: ["movies", "letterboxd", "watchlist", "picker", "random", "wheel"],
    status: "live",
    accent: "from-orange-500 via-emerald-500 to-sky-500",
    featured: true,
  },
  {
    appId: "encryption",
    name: "Encryption Platform",
    description: "Encode, decode ciphers and encryption utilities",
    category: "Utilities",
    tags: ["encryption", "security", "cipher", "encode", "decode"],
    status: "live",
    accent: "from-blue-500 to-cyan-500",
  },
  {
    appId: "diffchecker",
    name: "Diff Checker",
    description: "Compare text files and find differences between two versions",
    category: "Utilities",
    tags: ["diff", "compare", "text", "file", "difference"],
    status: "live",
    accent: "from-purple-500 to-pink-500",
  },
  {
    appId: "timezone",
    name: "Time Zone Converter",
    description: "Compare multiple time zones and convert times across the world",
    category: "Utilities",
    tags: ["timezone", "time", "converter", "world", "clock"],
    status: "live",
    accent: "from-orange-500 to-red-500",
  },
  {
    appId: "pickup-soccer",
    name: "Pickup Soccer",
    description: "Schedule, join, create, and manage pickup soccer games",
    category: "Social",
    tags: ["soccer", "football", "sports", "pickup", "games", "scheduling"],
    status: "live",
    accent: "from-green-500 to-emerald-500",
  },
  {
    appId: "secret-santa",
    name: "Secret Santa",
    description: "Organize and manage Secret Santa gift exchanges",
    category: "Social",
    tags: ["gifts", "santa", "exchange", "holiday", "social"],
    status: "live",
    accent: "from-red-500 to-pink-500",
  },
  {
    appId: "football-manager-team-picker",
    name: "Football Manager Team Picker",
    description: "Pick a random Football Manager team or multiple teams for you and your friends",
    category: "Games",
    tags: ["football", "fantasy", "team", "manager", "sports", "picker", "random"],
    status: "live",
    accent: "from-yellow-500 to-orange-500",
  },
  {
    appId: "color-palette-crafter",
    name: "Color Crafter",
    description: "Discover, create, and share beautiful color palettes",
    category: "Visual",
    tags: ["color", "palette", "design", "craft", "visual", "art"],
    status: "live",
    accent: "from-indigo-500 to-purple-500",
  },
  {
    appId: "amer-gauntlet",
    name: "Amer Gauntlet",
    description: "Daily word puzzle challenge with leaderboards and streaks",
    category: "Games",
    tags: ["gauntlet", "challenge", "game", "puzzle", "word", "daily", "leaderboard"],
    status: "live",
    accent: "from-red-500 to-orange-500",
  },
  {
    appId: "stl-monitor",
    name: "STL Monitor",
    description: "Real-time incident monitoring dashboard for Greater St. Louis",
    category: "Utilities",
    tags: ["stl", "st louis", "monitor", "traffic", "incidents", "weather", "map", "live"],
    status: "live",
    accent: "from-red-600 to-rose-500",
    featured: true,
  },
  {
    appId: "lmgtfy",
    name: "Let Me Google That",
    description: "Generate shareable links that play an animation before redirecting to Google search",
    category: "Utilities",
    tags: ["google", "search", "share", "funny", "lmgtfy", "link", "redirect"],
    status: "live",
    accent: "from-blue-500 to-cyan-500",
    featured: true,
  },
  {
    appId: "stickr",
    name: "Stickr",
    description:
      "Track Panini FIFA World Cup™ sticker duplicates and needs, then share a clean trade card for social media",
    category: "Social",
    tags: ["panini", "fifa", "world cup", "stickers", "trading", "collectibles", "album"],
    status: "live",
    accent: "from-green-600 to-teal-500",
  },
]

export function getAppById(appId: string): AppEntry | undefined {
  return APP_REGISTRY.find((app) => app.appId === appId)
}

export function getFeaturedApps(): AppEntry[] {
  return APP_REGISTRY.filter((app) => app.featured)
}

export function searchApps(query: string): AppEntry[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return APP_REGISTRY
  return APP_REGISTRY.filter((app) =>
    [app.name, app.description, ...app.tags].some((text) => text.toLowerCase().includes(needle))
  )
}

export function validateAppRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const seen = new Set<string>()
  APP_REGISTRY.forEach((app, index) => {
    if (seen.has(app.appId)) errors.push(`Duplicate appId "${app.appId}" found at index ${index}`)
    seen.add(app.appId)
    if (!app.name.trim()) errors.push(`App "${app.appId}" has empty name`)
  })
  return { valid: errors.length === 0, errors }
}
