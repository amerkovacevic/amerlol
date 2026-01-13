import { SiteHeader } from "@/components/layout/site-header"
import { BackgroundFX } from "@/components/fx/background-fx"
import { AboutContent } from "@/components/about/about-content"

export default function AboutPage() {
  return (
    <>
      <BackgroundFX />
      <SiteHeader />
      <AboutContent />
    </>
  )
}