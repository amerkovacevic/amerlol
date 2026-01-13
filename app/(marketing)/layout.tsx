import { SiteHeader } from "@/components/layout/site-header"
import { BackgroundFX } from "@/components/fx/background-fx"
import { LenisWrapper } from "@/components/fx/lenis-wrapper"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LenisWrapper>
      <BackgroundFX />
      <SiteHeader />
      {children}
    </LenisWrapper>
  )
}