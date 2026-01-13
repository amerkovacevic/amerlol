import { 
  Lock,
  GitCompare,
  Globe,
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
]

export function getAppById(appId: string): AppEntry | undefined {
  return APP_REGISTRY.find(app => app.appId === appId)
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