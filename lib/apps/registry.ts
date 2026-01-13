import { 
  Lock,
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