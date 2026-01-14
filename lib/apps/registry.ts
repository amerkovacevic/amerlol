import { 
  Lock,
  GitCompare,
  Globe,
  Users,
  Gift,
  Trophy,
  Palette,
  Shield,
  BarChart3,
  type LucideIcon
} from "lucide-react"

export type AppCategory = "Utilities" | "Games" | "Experiments" | "Social" | "Visual"
export type AppStatus = "live" | "beta" | "comingSoon"

export interface AppEntry {
  appId: string
  name: string
  description: string
  category: AppCategory
  tags: string[]
  status: AppStatus
  icon: LucideIcon
  accent: string
  featured?: boolean
}

export const APP_REGISTRY: AppEntry[] = [
  {
    appId: "encryption",
    name: "Encryption Platform",
    description: "Encode, decode ciphers and encryption utilities",
    category: "Utilities",
    tags: ["encryption", "security", "cipher", "encode", "decode"],
    status: "live",
    icon: Lock,
    accent: "from-blue-500 to-cyan-500",
    featured: true,
  },
  {
    appId: "diffchecker",
    name: "Diff Checker",
    description: "Compare text files and find differences between two versions",
    category: "Utilities",
    tags: ["diff", "compare", "text", "file", "difference"],
    status: "live",
    icon: GitCompare,
    accent: "from-purple-500 to-pink-500",
    featured: true,
  },
  {
    appId: "timezone",
    name: "Time Zone Converter",
    description: "Compare multiple time zones and convert times across the world",
    category: "Utilities",
    tags: ["timezone", "time", "converter", "world", "clock"],
    status: "live",
    icon: Globe,
    accent: "from-orange-500 to-red-500",
    featured: true,
  },
  {
    appId: "pickup-soccer",
    name: "Pickup Soccer",
    description: "Schedule, join, create, and manage pickup soccer games",
    category: "Social",
    tags: ["soccer", "football", "sports", "pickup", "games", "scheduling"],
    status: "live",
    icon: Users,
    accent: "from-green-500 to-emerald-500",
    featured: true,
  },
  {
    appId: "secret-santa",
    name: "Secret Santa",
    description: "Organize and manage Secret Santa gift exchanges",
    category: "Social",
    tags: ["gifts", "santa", "exchange", "holiday", "social"],
    status: "live",
    icon: Gift,
    accent: "from-red-500 to-pink-500",
    featured: true,
  },
  {
    appId: "football-manager-team-picker",
    name: "Football Manager Team Picker",
    description: "Pick a random Football Manager team or multiple teams for you and your friends",
    category: "Games",
    tags: ["football", "fantasy", "team", "manager", "sports", "picker", "random"],
    status: "live",
    icon: Trophy,
    accent: "from-yellow-500 to-orange-500",
    featured: true,
  },
  {
    appId: "color-palette-crafter",
    name: "Color Palette Crafter",
    description: "Design and craft beautiful color palettes for your projects",
    category: "Visual",
    tags: ["color", "palette", "design", "craft", "visual", "art"],
    status: "comingSoon",
    icon: Palette,
    accent: "from-indigo-500 to-purple-500",
    featured: false,
  },
  {
    appId: "amer-gauntlet",
    name: "Amer Gauntlet",
    description: "Challenge yourself with the ultimate gauntlet experience",
    category: "Games",
    tags: ["gauntlet", "challenge", "game", "adventure"],
    status: "comingSoon",
    icon: Shield,
    accent: "from-slate-500 to-gray-500",
    featured: false,
  },
  {
    appId: "monitoring-dashboard",
    name: "Monitoring Dashboard",
    description: "Real-time monitoring and analytics dashboard for system metrics",
    category: "Utilities",
    tags: ["monitoring", "dashboard", "analytics", "metrics", "data"],
    status: "comingSoon",
    icon: BarChart3,
    accent: "from-teal-500 to-cyan-500",
    featured: false,
  },
]

export function getAppById(appId: string): AppEntry | undefined {
  return APP_REGISTRY.find(app => app.appId === appId)
}

export function getAllApps(): AppEntry[] {
  return APP_REGISTRY
}

export function getFeaturedApps(): AppEntry[] {
  return APP_REGISTRY.filter(app => app.featured)
}

export function getAppsByCategory(category: AppCategory): AppEntry[] {
  return APP_REGISTRY.filter(app => app.category === category)
}

export function searchApps(query: string): AppEntry[] {
  const lowerQuery = query.toLowerCase()
  return APP_REGISTRY.filter(app => 
    app.name.toLowerCase().includes(lowerQuery) ||
    app.description.toLowerCase().includes(lowerQuery) ||
    app.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

// Helper to validate app registry integrity
export function validateAppRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const appIds = new Set<string>()

  APP_REGISTRY.forEach((app, index) => {
    // Check for duplicate appIds
    if (appIds.has(app.appId)) {
      errors.push(`Duplicate appId "${app.appId}" found at index ${index}`)
    }
    appIds.add(app.appId)

    // Validate required fields
    if (!app.appId || app.appId.trim() === "") {
      errors.push(`App at index ${index} has empty appId`)
    }
    if (!app.name || app.name.trim() === "") {
      errors.push(`App "${app.appId}" has empty name`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}