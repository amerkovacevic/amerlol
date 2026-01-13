import { APP_REGISTRY } from "@/lib/apps/registry"
import { AppPageClient } from "./app-page-client"

export function generateStaticParams() {
  return APP_REGISTRY.map((app) => ({
    appId: app.appId,
  }))
}

export default function AppPage({ params }: { params: { appId: string } }) {
  return <AppPageClient appId={params.appId} />
}