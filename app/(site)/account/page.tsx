import { AccountSettings } from "@/components/account/account-settings"
import { Footer } from "@/components/layout/footer"

export default function AccountPage() {
  return (
    <>
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="mb-2 font-space-grotesk text-4xl font-bold">My Account</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        <AccountSettings />
      </main>
      <Footer />
    </>
  )
}
