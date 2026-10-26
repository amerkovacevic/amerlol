"use client"

import * as React from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AppEntry } from "@/lib/apps/registry"
import { cn } from "@/lib/utils"

const MAX_TILT_DEGREES = 5

export function AppCard({ app }: { app: AppEntry }) {
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 })
  const reduceMotion = useReducedMotion()
  const comingSoon = app.status === "comingSoon"

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion || event.buttons) return
    const rect = event.currentTarget.getBoundingClientRect()
    setTilt({
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 2 * MAX_TILT_DEGREES,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * -2 * MAX_TILT_DEGREES,
    })
  }

  const card = (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        rotateX: reduceMotion ? 0 : tilt.y,
        rotateY: reduceMotion ? 0 : tilt.x,
        transformStyle: "preserve-3d",
      }}
      className="relative h-full"
    >
      <Card className="group relative h-full cursor-pointer overflow-hidden border-2 transition-colors hover:border-primary/50">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-10",
            app.accent
          )}
        />
        <CardHeader>
          <CardTitle className="font-space-grotesk">{app.name}</CardTitle>
          <CardDescription>{app.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {app.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>

        {comingSoon && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
            <Badge variant="outline" className="px-3 py-1 text-sm">
              Coming Soon
            </Badge>
          </div>
        )}
      </Card>
    </motion.div>
  )

  if (comingSoon) return card

  return (
    <Link
      href={`/a/${app.appId}`}
      className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </Link>
  )
}
