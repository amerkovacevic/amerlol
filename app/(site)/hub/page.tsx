import type { Metadata } from "next"
import { SignInReminder } from "@/components/auth/sign-in-reminder"
import { HubBrowser } from "@/components/hub/hub-browser"

export const metadata: Metadata = {
  title: "App Hub",
  description: "Every mini-app on amer.lol: games, utilities and experiments.",
}

export default function HubPage() {
  return (
    <main id="main" className="container mx-auto px-4 py-12">
      <div className="animate-enter mb-8">
        <h1 className="mb-4 font-space-grotesk text-4xl font-bold md:text-5xl">App Hub</h1>
        <p className="text-lg text-muted-foreground">Discover and explore all available mini-apps</p>
      </div>

      <div className="mb-6">
        <SignInReminder />
      </div>
      <HubBrowser />
    </main>
  )
}
