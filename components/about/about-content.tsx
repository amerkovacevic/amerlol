"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { buildLog } from "@/lib/build-log"

export function AboutContent() {
  return (
    <main className="container mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <h1 className="font-space-grotesk text-4xl md:text-5xl font-bold mb-6">
          About amer.lol
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none mb-16">
          <p className="text-muted-foreground text-lg leading-relaxed">
            amer.lol is a playground for creative web experiences, mini-apps, and experiments.
            Built with modern web technologies, it serves as a hub for interactive projects
            and tools that showcase what&apos;s possible on the web.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed mt-4">
            The platform is designed to be fast, accessible, and enjoyable to use. Each
            mini-app is carefully crafted with attention to detail, focusing on both
            functionality and user experience.
          </p>
        </div>

        <h2 className="font-space-grotesk text-3xl font-bold mb-8">Build Log</h2>
        <div className="space-y-4">
          {buildLog.map((entry, index) => (
            <motion.div
              key={entry.date}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{entry.title}</h3>
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.date + "T12:00:00-06:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "America/Chicago",
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{entry.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </main>
  )
}