import { BackgroundFX } from "@/components/fx/background-fx"
import { SiteHeader } from "@/components/layout/site-header"

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackgroundFX />
      <SiteHeader />
      {children}
    </>
  )
}
