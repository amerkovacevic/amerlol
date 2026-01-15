import { APP_REGISTRY, getAppById } from "@/lib/apps/registry"
import { AppPageClient } from "./app-page-client"
import type { Metadata } from "next"

// Generate static params for all apps in the registry
// This ensures all app routes are pre-generated at build time
export async function generateStaticParams() {
  try {
    // Map all apps to their appId for static generation
    const params = APP_REGISTRY.map((app) => ({
    appId: app.appId,
  }))
    
    // Return empty array if registry is empty to prevent build errors
    return params.length > 0 ? params : []
  } catch (error) {
    console.error("Error generating static params:", error)
    // Return empty array on error to prevent build failure
    return []
  }
}

// Generate metadata for SEO and social sharing
export async function generateMetadata(
  { params }: { 
    params: { appId: string }
  }
): Promise<Metadata> {
  const app = getAppById(params.appId)
  
  // Default metadata for apps
  if (app) {
    // Special default for LMGTFY
    if (params.appId === "lmgtfy") {
      return {
        title: "Hmm, I wonder... | amer.lol",
        description: "Let me Google that for you!",
        openGraph: {
          title: "Hmm, I wonder...",
          description: "Let me Google that for you!",
          type: "website",
        },
        twitter: {
          card: "summary",
          title: "Hmm, I wonder...",
          description: "Let me Google that for you!",
        },
      }
    }
    
    return {
      title: `${app.name} | amer.lol`,
      description: app.description,
      openGraph: {
        title: `${app.name} | amer.lol`,
        description: app.description,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: `${app.name} | amer.lol`,
        description: app.description,
      },
    }
  }
  
  // Fallback metadata
  return {
    title: "App | amer.lol",
    description: "A premium, playful hub website hosting multiple mini-apps",
  }
}

// Allow dynamic params in dev mode, disable in production for static export
// This ensures routes work in dev server while maintaining static generation for production
export const dynamicParams = process.env.NODE_ENV === 'development'

export default function AppPage({ 
  params,
  searchParams 
}: { 
  params: { appId: string }
  searchParams: { q?: string }
}) {
  return <AppPageClient appId={params.appId} />
}