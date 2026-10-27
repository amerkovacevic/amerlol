import { AppCard } from "@/components/hub/app-card"
import { getFeaturedApps } from "@/lib/apps/registry"

export function FeaturedApps() {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 font-space-grotesk text-3xl font-bold md:text-4xl">Featured Apps</h2>
        <p className="text-lg text-muted-foreground">Handpicked selections from the hub</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {getFeaturedApps()
          .slice(0, 3)
          .map((app) => (
            <AppCard key={app.appId} app={app} />
          ))}
      </div>
    </section>
  )
}
