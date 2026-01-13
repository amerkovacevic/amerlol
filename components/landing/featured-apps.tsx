"use client"

import { getFeaturedApps } from "@/lib/apps/registry"
import { AppCard } from "@/components/hub/app-card"
import { motion } from "framer-motion"

export function FeaturedApps() {
  const featuredApps = getFeaturedApps()

  return (
    <section className="container mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="font-space-grotesk text-3xl md:text-4xl font-bold mb-4">
          Featured Apps
        </h2>
        <p className="text-muted-foreground text-lg">
          Handpicked selections from the hub
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredApps.map((app, index) => (
          <motion.div
            key={app.appId}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <AppCard app={app} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}