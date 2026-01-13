import { SiteHeader } from "@/components/layout/site-header"
import { BackgroundFX } from "@/components/fx/background-fx"
import { Footer } from "@/components/layout/footer"
import { AccountSettings } from "@/components/account/account-settings"

export default function AccountPage() {
  return (
    <>
      <BackgroundFX />
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-space-grotesk text-4xl font-bold mb-2">My Account</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        <AccountSettings />
      </main>
      <Footer />
    </>
  )
}
