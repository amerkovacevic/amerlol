import { Hero } from "@/components/landing/hero"
import { FeaturedApps } from "@/components/landing/featured-apps"
import { LatestDrops } from "@/components/landing/latest-drops"
import { Footer } from "@/components/layout/footer"

export default function HomePage() {
  return (
    <main>
      <Hero />
      <FeaturedApps />
      <LatestDrops />
      <Footer />
    </main>
  )
}