"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"

const changelog = [
  {
    date: "2026-01-12",
    title: "Time Zone Converter",
    type: "New App",
    description: "Compare multiple time zones and convert times across the world with real-time updates, day/night indicators, and custom date/time selection",
  },
  {
    date: "2026-01-12",
    title: "Diff Checker",
    type: "New App",
    description: "Compare text files and find differences with visual diff display, file upload support, and comprehensive comparison settings",
  },
  {
    date: "2026-01-12",
    title: "Encryption Platform",
    type: "New App",
    description: "First mini-app launched with comprehensive encryption tools including Base64, URL, Hex, Binary, ASCII, Caesar Cipher, ROT13, Morse Code, MD5, and SHA-256 encoding/decoding",
  },
  {
    date: "2026-01-12",
    title: "Firebase Authentication",
    type: "Feature",
    description: "Integrated Firebase Authentication with Google Sign-In and Email/Password authentication, plus Firestore for persistent user settings",
  },
]

export function LatestDrops() {
  return (
    <section className="container mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-200px 0px", amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="font-space-grotesk text-3xl md:text-4xl font-bold mb-4">
          Latest Drops
        </h2>
        <p className="text-muted-foreground text-lg">
          Recent updates and new additions
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {changelog.map((item, index) => (
          <motion.div
            key={item.date}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-200px 0px", amount: 0.3 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">{item.type}</Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(item.date + "T12:00:00-06:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "America/Chicago",
                    })}
                  </div>
                </div>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}