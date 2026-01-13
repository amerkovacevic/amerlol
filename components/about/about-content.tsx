"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"

const buildLog = [
  {
    date: "2026-01-12",
    title: "Time Zone Converter",
    description: "Launched Time Zone Converter utility - a comprehensive tool for comparing multiple time zones and converting times across the world. Features include real-time updates, day/night indicators, custom date/time selection, time zone search, and copy-to-clipboard functionality. Includes user settings for time format (12/24 hour), seconds display, day/night indicators, and auto-refresh preferences.",
  },
  {
    date: "2026-01-12",
    title: "Diff Checker",
    description: "Launched Diff Checker utility - a text comparison tool for finding differences between two text files. Features include side-by-side text input, file upload support, visual diff display with color-coded additions (green) and deletions (red), download diff results, and comprehensive settings for font size, line numbers, whitespace handling, and case sensitivity.",
  },
  {
    date: "2026-01-12",
    title: "Encryption Platform & Firebase Integration",
    description: "Launched the first mini-app - Encryption Platform with Base64, URL, Hex, Binary, ASCII, Caesar Cipher, ROT13, Morse Code, MD5, and SHA-256 encoding/decoding. Integrated Firebase Authentication (Google Sign-In and Email/Password) and Firestore for persistent user settings. Implemented authentication-gated settings with auto-convert, clear on tab change, default tab, and font size preferences.",
  },
]

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