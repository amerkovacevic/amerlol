import { APP_REGISTRY } from "@/lib/apps/registry"
import { AppPageClient } from "./app-page-client"

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

// Allow dynamic params in dev mode, disable in production for static export
// This ensures routes work in dev server while maintaining static generation for production
export const dynamicParams = process.env.NODE_ENV === 'development'

export default function AppPage({ params }: { params: { appId: string } }) {
  return <AppPageClient appId={params.appId} />
}