import { APP_REGISTRY } from "@/lib/apps/registry"
import { AppPageClient } from "./app-page-client"

export async function generateStaticParams() {
  // Generate static params for all apps in the registry
  return APP_REGISTRY.map((app) => ({
    appId: app.appId,
  }))
}

// Ensure dynamic segments are properly handled
export const dynamicParams = false

export default function AppPage({ params }: { params: { appId: string } }) {
  return <AppPageClient appId={params.appId} />
}