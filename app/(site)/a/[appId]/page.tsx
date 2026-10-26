import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { APP_REGISTRY, getAppById } from "@/lib/apps/registry"
import { HubApp } from "@/lib/apps/components"

type Params = Promise<{ appId: string }>

// Static export: every app route is generated at build time and nothing else exists.
export const dynamicParams = false

export function generateStaticParams() {
  return APP_REGISTRY.map(({ appId }) => ({ appId }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const app = getAppById((await params).appId)
  if (!app) return {}

  // Shared LMGTFY links should not reveal the joke in their preview.
  const isLmgtfy = app.appId === "lmgtfy"
  const shareTitle = isLmgtfy ? "Hmm, I wonder..." : `${app.name} | amer.lol`
  const description = isLmgtfy ? "Let me Google that for you!" : app.description

  return {
    title: isLmgtfy ? `${shareTitle} | amer.lol` : shareTitle,
    description,
    openGraph: { title: shareTitle, description, type: "website" },
    twitter: { card: "summary", title: shareTitle, description },
  }
}

export default async function AppPage({ params }: { params: Params }) {
  const app = getAppById((await params).appId)
  if (!app) notFound()
  return <HubApp appId={app.appId} />
}
