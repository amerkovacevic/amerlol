import { SiteHeader } from "@/components/layout/site-header"
import { BackgroundFX } from "@/components/fx/background-fx"
import { StyleguideContent } from "@/components/styleguide/styleguide-content"

export default function StyleguidePage() {
  return (
    <>
      <BackgroundFX />
      <SiteHeader />
      <StyleguideContent />
    </>
  )
}