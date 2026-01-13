import { SiteHeader } from "@/components/layout/site-header"
import { BackgroundFX } from "@/components/fx/background-fx"

export default function HubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BackgroundFX />
      <SiteHeader />
      {children}
    </>
  )
}